from django.core.management.base import BaseCommand
from compras.models import Categoria, Proveedor, ProductoEstrella

class Command(BaseCommand):
    help = 'Prints an audit report of the directory.'

    def handle(self, *args, **options):
        total_categorias = Categoria.objects.count()
        total_proveedores = Proveedor.objects.count()
        total_productos = ProductoEstrella.objects.count()

        print('\n--- AUDIT REPORT ---')
        print(f"Total Categorias: {total_categorias}")
        print(f"Total Proveedores: {total_proveedores}")
        print(f"Total Productos Estrella: {total_productos}")
        print('\n--- Proveedores ---')

        proveedores = Proveedor.objects.all().prefetch_related('categorias', 'productoestrella_set')
        for prov in proveedores:
            linked_cats = prov.categorias.count()
            num_products = prov.productoestrella_set.count()
            nombre = prov.nombre.strip() if prov.nombre else 'Unknown'
            tipo = prov.tipo_interaccion.strip() if prov.tipo_interaccion else 'Unknown'
            print(f"[{nombre}] - [{tipo}] - Categorias Linked: {linked_cats} - Number of Products: {num_products}")

        print('\n--- END OF REPORT ---\n')
