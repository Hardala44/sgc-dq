from django.core.management.base import BaseCommand
from django.db import transaction
from collections import defaultdict
import difflib
from compras.models import Producto, ProveedorOferta

class Command(BaseCommand):
    help = "Normaliza el catálogo de productos fusionando duplicados por SKU y marcando similitudes aproximadas."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Reporta qué se fusionaría sin alterar la base de datos.',
        )

    def handle(self, *args, **options):
        is_dry_run = options['dry_run']
        self.stdout.write(self.style.MIGRATE_HEADING("=== Iniciando Normalización de Catálogo ==="))
        if is_dry_run:
            self.stdout.write(self.style.WARNING("MODO DRY-RUN ACTIVADO: No se modificará la base de datos."))

        # ─── Priority 1: Exact Match by SKU ────────────────────────────────
        ofertas = ProveedorOferta.objects.select_related('producto').all()
        
        # Agrupar ofertas por sku que pertenezcan a distintos Productos Padre
        sku_groups = defaultdict(set)
        for o in ofertas:
            if o.sku and o.sku.strip():
                sku_groups[o.sku.strip()].add(o.producto)

        productos_to_merge_count = 0
        merged_groups_count = 0

        with transaction.atomic():
            for sku, prod_set in sku_groups.items():
                if len(prod_set) > 1:
                    merged_groups_count += 1
                    # Elegimos un "Padre Sobreviviente" (ej. el creado primero, o simplemente el primero de la lista)
                    sorted_prods = sorted(list(prod_set), key=lambda x: x.id)
                    survivor = sorted_prods[0]
                    orphans = sorted_prods[1:]
                    
                    productos_to_merge_count += len(orphans)
                    
                    self.stdout.write(f" [SKU Exacto] SKU: '{sku}' detectado en {len(prod_set)} productos distintos.")
                    self.stdout.write(f"    Sobreviviente: {survivor.id} - {survivor.nombre}")
                    
                    for orphan in orphans:
                        self.stdout.write(f"    A fusionar: {orphan.id} - {orphan.nombre}")
                        if not is_dry_run:
                            # Transferir todas las ofertas del huérfano al sobreviviente
                            ProveedorOferta.objects.filter(producto=orphan).update(producto=survivor)
                            # Eliminar huérfano
                            orphan.delete()

        # ─── Priority 2: Fuzzy Match (by Name + Brand) ──────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Fase 2: Búsqueda de Similitud (Fuzzy Matching) ==="))
        
        all_products = list(Producto.objects.all())
        brand_map = defaultdict(list)
        for p in all_products:
            brand = p.marca.strip().lower() if p.marca else "sin_marca"
            brand_map[brand].append(p)

        fuzzy_matches_found = 0
        products_flagged = set()

        for brand, prods in brand_map.items():
            if len(prods) > 1:
                # Combinatoria para comparar todos contra todos en la misma marca
                for i in range(len(prods)):
                    for j in range(i + 1, len(prods)):
                        p1 = prods[i]
                        p2 = prods[j]
                        
                        # Si ya se marcaron, saltar (o calcular igual para el log)
                        similarity = difflib.SequenceMatcher(None, p1.nombre.lower(), p2.nombre.lower()).ratio()
                        if similarity > 0.70: # Umbral de 70%
                            fuzzy_matches_found += 1
                            products_flagged.add(p1.id)
                            products_flagged.add(p2.id)
                            self.stdout.write(f" [Similitud {similarity*100:.1f}%] Marca: {brand}")
                            self.stdout.write(f"    - {p1.id}: {p1.nombre}")
                            self.stdout.write(f"    - {p2.id}: {p2.nombre}")

        if not is_dry_run and products_flagged:
            for p_id in products_flagged:
                prod = Producto.objects.get(id=p_id)
                prod.needs_review = True
                prod.save(update_fields=['needs_review'])
            self.stdout.write(f">> Nota: Se marcaron {len(products_flagged)} productos con el flag `needs_review=True` para revisión manual.")

        # ─── Resumen ──────────────────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== RESUMEN DE EJECUCIÓN ==="))
        self.stdout.write(f" Total Grupos fusionados por SKU: {merged_groups_count}")
        self.stdout.write(f" Total Productos huérfanos eliminados: {productos_to_merge_count}")
        self.stdout.write(f" Total Coincidencias Fuzzy detectadas: {fuzzy_matches_found} (Involucra {len(products_flagged)} productos)")
        
        if is_dry_run:
            self.stdout.write(self.style.SUCCESS("Dry-Run finalizado. No se efectuaron cambios."))
        else:
            self.stdout.write(self.style.SUCCESS("Catálogo normalizado exitosamente."))
