"""
merge_duplicate_providers.py
-----------------------------
Fusión inteligente y segura de proveedores duplicados.

Uso (desde el directorio backend/):
    python manage.py shell < compras/scripts/merge_duplicate_providers.py

    O directamente si se ejecuta como script standalone:
    python compras/scripts/merge_duplicate_providers.py

El script detecta pares cuyos nombres normalizados son muy similares,
identifica cuál es el "Original" (existía antes del Excel financiero) y
cuál es el "Financiero" (todo mayúsculas, tiene ahorro_estimado), copia
los campos financieros al Original, reasigna todas las relaciones y
elimina el duplicado.
"""

import os
import sys
import re
import unicodedata

# ── Bootstrap Django si se lanza directamente ─────────────────────────────────
if __name__ == "__main__":
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    sys.path.insert(0, BASE_DIR)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sgc_dq.settings")
    import django
    django.setup()

# Force UTF-8 output on Windows to support unicode symbols
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# ── Imports después del setup ────────────────────────────────────────────────
from django.db import transaction
from compras.models import (
    Proveedor, ProveedorOferta, ProductoLegado,
    ProductoEstrella, Pedido, LeadSolicitud
)

# ─────────────────────────────────────────────────────────────────────────────
# Normalización
# ─────────────────────────────────────────────────────────────────────────────

# Sufijos legales/societarios a eliminar antes de comparar
_SUFFIX_RE = re.compile(
    r'\b(s\.?a\.?|s\.?l\.?|s\.?a\.?u\.?|s\.?l\.?u\.?|s\.?a\.?t\.?'
    r'|sociedad anonima|sociedad limitada|s\.coop\.?)\b',
    re.IGNORECASE
)

def _normalise(name: str) -> str:
    """
    Devuelve el nombre en minúsculas, sin tildes, sin sufijos legales,
    sin signos de puntuación y sin espacios extra.
    """
    # NFD → elimina tildes/diacríticos
    name = unicodedata.normalize("NFD", name)
    name = "".join(c for c in name if unicodedata.category(c) != "Mn")
    name = name.lower()
    # Elimina sufijos societarios
    name = _SUFFIX_RE.sub("", name)
    # Elimina puntuación (excepto letras y números)
    name = re.sub(r"[^a-z0-9\s]", " ", name)
    # Colapsa espacios
    name = re.sub(r"\s+", " ", name).strip()
    return name


def _similarity_ratio(a: str, b: str) -> float:
    """
    Devuelve un ratio de similitud [0-1] basado en la distancia de Levenshtein
    sin dependencias externas.
    """
    if a == b:
        return 1.0
    len_a, len_b = len(a), len(b)
    if len_a == 0 or len_b == 0:
        return 0.0
    # Matriz de Levenshtein
    prev = list(range(len_b + 1))
    for i, ca in enumerate(a, 1):
        curr = [i] + [0] * len_b
        for j, cb in enumerate(b, 1):
            insert = curr[j - 1] + 1
            delete = prev[j] + 1
            replace = prev[j - 1] + (0 if ca == cb else 1)
            curr[j] = min(insert, delete, replace)
        prev = curr
    distance = prev[len_b]
    return 1.0 - distance / max(len_a, len_b)


# ─────────────────────────────────────────────────────────────────────────────
# Clasificación: ¿quién es el "original" y quién el "financiero"?
# ─────────────────────────────────────────────────────────────────────────────

def _is_financial_duplicate(p: Proveedor) -> bool:
    """
    Heurística: el duplicado financiero suele ser todo MAYÚSCULAS y tener
    ahorro_estimado. No tiene logo, no tiene descripción larga y no tiene
    ProveedorOfertas en el marketplace.
    """
    name = p.nombre
    is_all_caps = name == name.upper() and any(c.isalpha() for c in name)
    has_saving = p.ahorro_estimado is not None
    has_no_logo = not p.logo and not p.logo_url
    has_no_offers = not p.ofertas_marketplace.exists()
    score = sum([is_all_caps, has_saving, has_no_logo, has_no_offers])
    return score >= 2


def _choose_original_and_dup(p1: Proveedor, p2: Proveedor):
    """
    Devuelve (original, duplicado).
    Prioriza como original al que tenga nombre en formato normal,
    logo, o ProveedorOfertas en el marketplace.
    """
    score1 = _financial_score(p1)
    score2 = _financial_score(p2)

    if score1 < score2:
        return p1, p2   # p1 es el original
    elif score2 < score1:
        return p2, p1   # p2 es el original
    else:
        # Empate: el que tiene nombre más corto suele ser el original
        return (p1, p2) if len(p1.nombre) <= len(p2.nombre) else (p2, p1)


def _financial_score(p: Proveedor) -> int:
    """Cuanto mayor, más probable que sea el duplicado financiero."""
    name = p.nombre
    score = 0
    if name == name.upper() and any(c.isalpha() for c in name):
        score += 3
    if p.ahorro_estimado is not None:
        score += 1
    if not p.logo and not p.logo_url:
        score += 1
    if not p.ofertas_marketplace.exists():
        score += 1
    if not p.descripcion_larga.strip():
        score += 1
    return score


# ─────────────────────────────────────────────────────────────────────────────
# Umbrales de decisión
# ─────────────────────────────────────────────────────────────────────────────

MERGE_THRESHOLD  = 0.88   # ≥ este ratio → fusión automática
REVIEW_THRESHOLD = 0.72   # entre este y MERGE → dudoso, revisar manualmente


# ─────────────────────────────────────────────────────────────────────────────
# Lógica principal
# ─────────────────────────────────────────────────────────────────────────────

def run():
    all_providers = list(Proveedor.objects.all().prefetch_related(
        "ofertas_marketplace", "categorias"
    ))

    print(f"\n{'='*65}")
    print(f"  MERGE DUPLICATE PROVIDERS  |  Total proveedores: {len(all_providers)}")
    print(f"{'='*65}\n")

    # Construimos índice normalizado
    normalised = {p.id: _normalise(p.nombre) for p in all_providers}

    already_processed = set()   # ids ya manejados (para no revisitar)
    merge_pairs   = []          # (original, dup)
    review_pairs  = []          # [(p1, p2, ratio)]

    for i, p1 in enumerate(all_providers):
        if p1.id in already_processed:
            continue
        for p2 in all_providers[i + 1:]:
            if p2.id in already_processed:
                continue
            if p1.id == p2.id:
                continue

            n1 = normalised[p1.id]
            n2 = normalised[p2.id]

            # Rápida descartación por longitud antes del Levenshtein
            if n1 and n2:
                min_len = min(len(n1), len(n2))
                max_len = max(len(n1), len(n2))
                if max_len > 0 and min_len / max_len < REVIEW_THRESHOLD - 0.1:
                    continue   # demasiado diferentes en longitud → skip

            ratio = _similarity_ratio(n1, n2)

            if ratio >= MERGE_THRESHOLD:
                original, dup = _choose_original_and_dup(p1, p2)
                merge_pairs.append((original, dup, ratio))
                already_processed.add(p1.id)
                already_processed.add(p2.id)
                break  # cada proveedor sólo se fusiona una vez
            elif ratio >= REVIEW_THRESHOLD:
                review_pairs.append((p1, p2, ratio))

    # ── Ejecutar fusiones ────────────────────────────────────────────────────
    merged_count = 0
    errors       = []

    for original, dup, ratio in merge_pairs:
        print(f"[MERGE] [{ratio:.0%}]")
        print(f"   ORIGINAL : {original.nombre!r}  (id={original.id})")
        print(f"   DUPLICADO: {dup.nombre!r}  (id={dup.id})")

        try:
            with transaction.atomic():
                # 1. Transferir campos financieros (sólo si el original no los tiene)
                updated_fields = []
                if dup.ahorro_estimado is not None and original.ahorro_estimado is None:
                    original.ahorro_estimado = dup.ahorro_estimado
                    updated_fields.append(f"ahorro_estimado={dup.ahorro_estimado}")

                if dup.categoria_principal and not original.categoria_principal:
                    original.categoria_principal = dup.categoria_principal
                    updated_fields.append(f"categoria_principal={dup.categoria_principal!r}")

                if updated_fields:
                    original.save()
                    print(f"   [OK] Campos copiados: {', '.join(updated_fields)}")
                else:
                    print(f"   - No hay campos financieros nuevos que copiar.")

                # 2. Reasignar ProveedorOfertas (marketplace)
                n_ofertas = dup.ofertas_marketplace.count()
                if n_ofertas:
                    for oferta in dup.ofertas_marketplace.all():
                        # Evitar duplicar unique_together (proveedor, sku)
                        if not ProveedorOferta.objects.filter(
                            proveedor=original, sku=oferta.sku
                        ).exists():
                            oferta.proveedor = original
                            oferta.save()
                        else:
                            oferta.delete()   # SKU ya existe en el original → descartar
                    print(f"   [OK] {n_ofertas} ProveedorOfertas reasignadas/limpiadas.")
                else:
                    print(f"   - Sin ProveedorOfertas en el duplicado.")

                # 3. Reasignar ProductoLegado
                n_legado = ProductoLegado.objects.filter(proveedor=dup).count()
                if n_legado:
                    ProductoLegado.objects.filter(proveedor=dup).update(proveedor=original)
                    print(f"   [OK] {n_legado} ProductoLegado reasignados.")

                # 4. Reasignar ProductoEstrella
                n_estrella = ProductoEstrella.objects.filter(proveedor=dup).count()
                if n_estrella:
                    ProductoEstrella.objects.filter(proveedor=dup).update(proveedor=original)
                    print(f"   [OK] {n_estrella} ProductoEstrella reasignados.")

                # 5. Reasignar Pedidos
                n_pedidos = Pedido.objects.filter(proveedor=dup).count()
                if n_pedidos:
                    Pedido.objects.filter(proveedor=dup).update(proveedor=original)
                    print(f"   [OK] {n_pedidos} Pedidos reasignados.")

                # 6. Reasignar LeadSolicitudes
                n_leads = LeadSolicitud.objects.filter(proveedor=dup).count()
                if n_leads:
                    LeadSolicitud.objects.filter(proveedor=dup).update(proveedor=original)
                    print(f"   [OK] {n_leads} LeadSolicitudes reasignadas.")

                # 7. Copiar categorías M2M
                for cat in dup.categorias.all():
                    original.categorias.add(cat)

                # 8. Eliminar duplicado
                dup.delete()
                print(f"   [DEL] Duplicado eliminado correctamente.\n")
                merged_count += 1

        except Exception as exc:
            errors.append((original.nombre, dup.nombre, str(exc)))
            print(f"   [ERR] ERROR al fusionar: {exc}\n")

    # ── Casos dudosos ────────────────────────────────────────────────────────
    if review_pairs:
        print(f"\n{'─'*65}")
        print("  [!] CASOS DUDOSOS — Requieren revisión manual")
        print(f"{'─'*65}")
        for p1, p2, ratio in review_pairs:
            print(f"  [!] DUDOSO [{ratio:.0%}]: {p1.nombre!r} (id={p1.id})  <->  {p2.nombre!r} (id={p2.id})")

    # ── Resumen final ────────────────────────────────────────────────────────
    print(f"\n{'='*65}")
    print(f"  RESUMEN FINAL")
    print(f"{'='*65}")
    print(f"  [OK] Fusiones exitosas   : {merged_count}")
    print(f"  [ERR] Errores            : {len(errors)}")
    print(f"  [!] Casos dudosos        : {len(review_pairs)}")
    print(f"  [DB] Proveedores finales : {Proveedor.objects.count()}")
    if errors:
        print(f"\n  ERRORES DETALLADOS:")
        for orig, dup_name, msg in errors:
            print(f"    {orig!r} ← {dup_name!r} → {msg}")
    print(f"{'='*65}\n")


# ── Punto de entrada ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    run()
else:
    # Cuando se llama desde `python manage.py shell < script.py`
    run()
