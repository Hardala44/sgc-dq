from django.core.management.base import BaseCommand
from django.db import transaction, IntegrityError
from collections import defaultdict
import difflib
import re
from rapidfuzz import fuzz
from compras.models import Producto, ProveedorOferta

_DEFAULT_LINEA_THRESHOLD = 75  # percent (rapidfuzz returns 0-100)

# ─── Synonym / Keyword Normalization Map ─────────────────────────────────────
# Maps lowercased variant labels to a canonical linea_producto term.
# Extend this table as the catalog grows.
SINONIMOS: dict[str, list[str]] = {
    'Adhesivos': [
        'adhesivo', 'adhesivos dentales', 'adhesivo dental', 'bonding',
        'bonding agent', 'agente adhesivo', 'adhesivo de composite',
        'adhesivo esmalte dentina', 'adhesivo universal',
    ],
    'Composite': [
        'composites', 'resina composite', 'resina compuesta', 'resinas composite',
        'material composite', 'composite dental',
    ],
    'Implantes': [
        'implante', 'implante dental', 'implantes dentales', 'implante oseointegrado',
        'sistema de implantes',
    ],
    'Anestesia': [
        'anestésico', 'anestésicos', 'anestesia local', 'anestésico local',
        'carpule', 'cartucho anestesia',
    ],
    'Endodoncia': [
        'material de endodoncia', 'limas endodoncia', 'instrumental endodoncia',
        'obturación', 'gutapercha',
    ],
    'Ortodoncia': [
        'material ortodoncia', 'brackets', 'arcos ortodoncia',
        'aparatología ortodóntica',
    ],
    'Instrumental': [
        'instrumentación', 'instrumental clínico', 'instrumental dental',
        'instrumental quirúrgico',
    ],
    'Desinfección': [
        'desinfectante', 'desinfectantes', 'esterilización', 'higiene clínica',
        'control infecciones', 'antiséptico',
    ],
    'Prótesis': [
        'prostodoncia', 'material protésico', 'prótesis dental',
        'prótesis removible', 'prótesis fija',
    ],
    'Cemento': [
        'cementos', 'cemento dental', 'cementado', 'cemento de unión',
        'adhesivo cemento',
    ],
}


def _build_synonym_map() -> dict[str, str]:
    """Returns a lowercased-variant → canonical dict from SINONIMOS."""
    m: dict[str, str] = {}
    for canonical, variants in SINONIMOS.items():
        m[canonical.lower()] = canonical
        for v in variants:
            m[v.strip().lower()] = canonical
    return m


def _normalize_linea(linea: str, synonym_map: dict[str, str]) -> str:
    return synonym_map.get(linea.strip().lower(), linea.strip())


def _contains_whole(haystack: str, needle: str) -> bool:
    """True if needle appears as a whole-word substring of haystack."""
    if not needle:
        return False
    pattern = r'\b' + re.escape(needle) + r'\b'
    return bool(re.search(pattern, haystack))


def _first_n_words_match(a: str, b: str, n: int = 2) -> bool:
    """True if both strings share at least n leading words (or all words of the shorter)."""
    wa, wb = a.split(), b.split()
    # If one side has fewer than n words, use its full length as the bar
    effective_n = min(n, len(wa), len(wb))
    if effective_n == 0:
        return False
    return wa[:effective_n] == wb[:effective_n]


class Command(BaseCommand):
    help = (
        "Normaliza el catálogo de productos: "
        "(1) fusiona duplicados por SKU exacto, "
        "(2) marca similitudes de nombre por marca, "
        "(3) fusiona productos cuya linea_producto sea semánticamente similar."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Reporta qué se fusionaría sin alterar la base de datos.',
        )
        parser.add_argument(
            '--linea-threshold',
            type=int,
            default=_DEFAULT_LINEA_THRESHOLD,
            metavar='0-100',
            help=(
                f'Umbral de similitud fuzzy para agrupar por linea_producto (0-100). '
                f'Por defecto: {_DEFAULT_LINEA_THRESHOLD}.'
            ),
        )
        parser.add_argument(
            '--yes',
            action='store_true',
            help='Confirma la fusión automáticamente sin solicitar input interactivo.',
        )

    def handle(self, *args, **options):
        is_dry_run = options['dry_run']
        linea_threshold = options['linea_threshold']
        auto_confirm = options['yes']

        self.stdout.write(self.style.MIGRATE_HEADING("=== Iniciando Normalización de Catálogo ==="))
        if is_dry_run:
            self.stdout.write(self.style.WARNING("MODO DRY-RUN ACTIVADO: No se modificará la base de datos."))

        # ─── Fase 1: Exact Match by SKU ──────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Fase 1: Fusión por SKU Exacto ==="))

        ofertas = ProveedorOferta.objects.select_related('producto').all()

        sku_groups = defaultdict(set)
        for o in ofertas:
            if o.sku and o.sku.strip():
                sku_groups[o.sku.strip()].add(o.producto)

        sku_groups_merged = 0
        sku_products_removed = 0

        with transaction.atomic():
            for sku, prod_set in sku_groups.items():
                if len(prod_set) > 1:
                    sku_groups_merged += 1
                    sorted_prods = sorted(list(prod_set), key=lambda x: x.id)
                    survivor = sorted_prods[0]
                    orphans = sorted_prods[1:]

                    sku_products_removed += len(orphans)

                    self.stdout.write(f" [SKU Exacto] SKU: '{sku}' en {len(prod_set)} productos distintos.")
                    self.stdout.write(f"    Sobreviviente: [{survivor.id}] {survivor.nombre}")

                    for orphan in orphans:
                        self.stdout.write(f"    A fusionar:    [{orphan.id}] {orphan.nombre}")
                        if not is_dry_run:
                            ProveedorOferta.objects.filter(producto=orphan).update(producto=survivor)
                            orphan.delete()

        # ─── Fase 2: Fuzzy Match by Name + Brand (flag only) ─────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Fase 2: Detección de Similitud por Nombre + Marca ==="))

        all_products = list(Producto.objects.all())
        brand_map = defaultdict(list)
        for p in all_products:
            brand = p.marca.strip().lower() if p.marca else "sin_marca"
            brand_map[brand].append(p)

        fuzzy_matches_found = 0
        products_flagged = set()

        for brand, prods in brand_map.items():
            if len(prods) > 1:
                for i in range(len(prods)):
                    for j in range(i + 1, len(prods)):
                        p1 = prods[i]
                        p2 = prods[j]
                        similarity = difflib.SequenceMatcher(
                            None, p1.nombre.lower(), p2.nombre.lower()
                        ).ratio()
                        if similarity > 0.70:
                            fuzzy_matches_found += 1
                            products_flagged.add(p1.id)
                            products_flagged.add(p2.id)
                            self.stdout.write(f" [Similitud {similarity*100:.1f}%] Marca: {brand}")
                            self.stdout.write(f"    - [{p1.id}] {p1.nombre}")
                            self.stdout.write(f"    - [{p2.id}] {p2.nombre}")

        if not is_dry_run and products_flagged:
            Producto.objects.filter(id__in=products_flagged).update(needs_review=True)
            self.stdout.write(
                f">> {len(products_flagged)} productos marcados con `needs_review=True`."
            )

        # ─── Fase 3: Merge by similar linea_producto ──────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Fase 3: Fusión por Línea de Producto Similar ==="))
        self.stdout.write(
            f"   Estrategias (en orden de prioridad): "
            f"sinónimos → contención → primeras 2 palabras → fuzzy ({linea_threshold}%)"
        )

        synonym_map = _build_synonym_map()

        productos_con_linea = list(
            Producto.objects
            .prefetch_related('ofertas')
            .exclude(linea_producto='')
            .filter(activo=True)
        )

        if not productos_con_linea:
            self.stdout.write("   No hay productos con linea_producto definida.")

        # ── Union-Find ───────────────────────────────────────────────────────
        parent = {p.id: p.id for p in productos_con_linea}

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(x, y):
            px, py = find(x), find(y)
            if px != py:
                parent[px] = py

        # Per-product reason log: product_id → first reason that caused it to be grouped
        product_reasons: dict[int, list[str]] = defaultdict(list)

        for i in range(len(productos_con_linea)):
            for j in range(i + 1, len(productos_con_linea)):
                p1 = productos_con_linea[i]
                p2 = productos_con_linea[j]
                l1_raw = p1.linea_producto.strip()
                l2_raw = p2.linea_producto.strip()
                l1_lo = l1_raw.lower()
                l2_lo = l2_raw.lower()
                l1_norm = _normalize_linea(l1_raw, synonym_map)
                l2_norm = _normalize_linea(l2_raw, synonym_map)

                reason: str | None = None

                # Strategy 1: Synonym map — both map to the same canonical term
                if l1_norm.lower() == l2_norm.lower():
                    reason = f"Sinónimo → '{l1_norm}'"

                # Strategy 2: Containment — one is a whole-word substring of the other
                elif _contains_whole(l1_lo, l2_lo) or _contains_whole(l2_lo, l1_lo):
                    shorter = l1_raw if len(l1_raw) <= len(l2_raw) else l2_raw
                    reason = f"Contención → '{shorter}' ⊂ otro"

                # Strategy 3: First 2 words match (order-sensitive, same domain prefix)
                elif _first_n_words_match(l1_lo, l2_lo, 2):
                    words = ' '.join(l1_lo.split()[:2])
                    reason = f"Primeras 2 palabras → '{words}'"

                # Strategy 4: Fuzzy token_sort_ratio (word-order invariant)
                else:
                    score = fuzz.token_sort_ratio(l1_lo, l2_lo)
                    if score >= linea_threshold:
                        reason = f"Similitud fuzzy → {score}%"

                if reason:
                    product_reasons[p1.id].append(f"vs [{p2.id}] '{l2_raw}': {reason}")
                    product_reasons[p2.id].append(f"vs [{p1.id}] '{l1_raw}': {reason}")
                    union(p1.id, p2.id)

        clusters = defaultdict(list)
        for p in productos_con_linea:
            clusters[find(p.id)].append(p)

        # ── Build merge plan ──────────────────────────────────────────────────
        # plan: list of (master, orphans, best_nombre)
        plan: list[tuple] = []
        for cluster_prods in clusters.values():
            if len(cluster_prods) <= 1:
                continue

            # Master: product with the most ProveedorOfertas.
            # Tiebreak: shortest linea_producto (most generic term).
            master = max(
                cluster_prods,
                key=lambda p: (p.ofertas.count(), -len(p.linea_producto.strip())),
            )
            orphans = [p for p in cluster_prods if p.id != master.id]

            # Most generic nombre: fewest words, then shortest string.
            best_nombre = min(
                (p.nombre for p in cluster_prods),
                key=lambda n: (len(n.split()), len(n)),
            )
            plan.append((master, orphans, best_nombre))

        # ── Print full plan BEFORE touching the database ──────────────────────
        self.stdout.write(
            self.style.MIGRATE_HEADING(f"\n  PLAN DE FUSIÓN — {len(plan)} grupo(s) identificado(s)\n")
        )

        if not plan:
            self.stdout.write("   Sin grupos que fusionar con los umbrales actuales.")

        for idx, (master, orphans, best_nombre) in enumerate(plan, 1):
            offer_counts = {p.id: p.ofertas.count() for p in [master] + orphans}
            total_offers = sum(offer_counts.values())
            separator = '─' * 68

            self.stdout.write(
                f"  ┌─ Grupo #{idx} ─ {len(orphans) + 1} producto(s), {total_offers} oferta(s) ─"
            )
            self.stdout.write(
                f"  │  MAESTRO  [{master.id:>5}] '{master.nombre}'"
                f"  │  Línea: '{master.linea_producto}'  │  Ofertas: {offer_counts[master.id]}"
            )
            for orphan in orphans:
                reasons = product_reasons.get(orphan.id, [])
                reason_str = reasons[0] if reasons else 'transitivo'
                self.stdout.write(
                    f"  │  fusionar [{orphan.id:>5}] '{orphan.nombre}'"
                    f"  │  Línea: '{orphan.linea_producto}'  │  Ofertas: {offer_counts[orphan.id]}"
                    f"  │  Razón: {reason_str}"
                )
            if best_nombre != master.nombre:
                self.stdout.write(
                    f"  │  Nombre resultante: '{master.nombre}' → '{best_nombre}'"
                )
            self.stdout.write(f"  └{separator}")

        linea_groups_merged = len(plan)
        linea_products_removed = sum(len(o) for _, o, _ in plan)

        # ── Confirm before executing ──────────────────────────────────────────
        if plan and not is_dry_run:
            if not auto_confirm:
                try:
                    answer = input(
                        f"\n¿Proceder con la fusión de {linea_groups_merged} grupo(s) "
                        f"({linea_products_removed} producto(s) a eliminar)? [s/N]: "
                    ).strip().lower()
                except EOFError:
                    answer = ''
                if answer not in ('s', 'si', 'sí', 'y', 'yes'):
                    self.stdout.write(self.style.WARNING("Operación cancelada por el usuario."))
                    return

            with transaction.atomic():
                for master, orphans, best_nombre in plan:
                    for orphan in orphans:
                        for oferta in list(orphan.ofertas.all()):
                            try:
                                oferta.producto = master
                                oferta.save(update_fields=['producto'])
                            except IntegrityError as exc:
                                self.stdout.write(
                                    self.style.WARNING(
                                        f"    Conflicto SKU='{oferta.sku}' "
                                        f"(proveedor={oferta.proveedor_id}): {exc}. "
                                        f"Se descarta la oferta duplicada."
                                    )
                                )
                                oferta.delete()
                        orphan.delete()

                    if best_nombre != master.nombre:
                        master.nombre = best_nombre
                        master.save(update_fields=['nombre'])

            self.stdout.write(
                self.style.SUCCESS(
                    f"\n  {linea_groups_merged} grupo(s) fusionados, "
                    f"{linea_products_removed} producto(s) eliminados."
                )
            )

        # ─── Resumen ──────────────────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== RESUMEN DE EJECUCIÓN ==="))
        self.stdout.write(f" Fase 1 — Grupos fusionados por SKU exacto:        {sku_groups_merged}")
        self.stdout.write(f" Fase 1 — Productos duplicados eliminados:          {sku_products_removed}")
        self.stdout.write(f" Fase 2 — Coincidencias fuzzy nombre+marca:         {fuzzy_matches_found} ({len(products_flagged)} marcados con needs_review)")
        self.stdout.write(f" Fase 3 — Grupos identificados por línea similar:   {linea_groups_merged}")
        self.stdout.write(f" Fase 3 — Productos duplicados eliminados:           {linea_products_removed}")

        if is_dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-Run finalizado. No se efectuaron cambios."))
        else:
            self.stdout.write(self.style.SUCCESS("Catálogo normalizado exitosamente."))
