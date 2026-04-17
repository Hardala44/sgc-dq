from django.core.management.base import BaseCommand
from compras.models import Categoria, Proveedor
from django.db import connection

class Command(BaseCommand):
    help = 'Seeds the DB with proper hierarchical B2B Directory data (Bloque A vs Bloque B).'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("Wiping existing catalog tables via Raw SQL..."))
        
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA foreign_keys = OFF;")
            cursor.execute("DELETE FROM compras_lineapedido;")
            cursor.execute("DELETE FROM compras_pedido;")
            cursor.execute("DELETE FROM compras_compraagrupada;")
            cursor.execute("DELETE FROM compras_oferta;")
            cursor.execute("DELETE FROM compras_producto;")
            cursor.execute("DELETE FROM compras_productoestrella;")
            cursor.execute("DELETE FROM compras_proveedor_categorias;")
            cursor.execute("DELETE FROM compras_proveedor;")
            cursor.execute("DELETE FROM compras_categoria;")
            cursor.execute("PRAGMA foreign_keys = ON;")

        self.stdout.write("Creating Categories...")

        # Bloque A Categories
        distribuidores, _ = Categoria.objects.get_or_create(nombre="Distribuidores Generalistas", bloque='A')
        implantologia_a, _ = Categoria.objects.get_or_create(nombre="Implantología", bloque='A')
        ortodoncia, _ = Categoria.objects.get_or_create(nombre="Ortodoncia", bloque='A')
        endodoncia, _ = Categoria.objects.get_or_create(nombre="Endodoncia", bloque='A')

        # Bloque B Categories
        aparatologia, _ = Categoria.objects.get_or_create(nombre="Aparatología Clínica", bloque='B')
        escaneres, _ = Categoria.objects.get_or_create(nombre="Escáneres Intraorales", bloque='B')
        software, _ = Categoria.objects.get_or_create(nombre="Software de Gestión", bloque='B')

        self.stdout.write("Creating Providers and Links...")

        # 1. Henry Schein (Bloque A)
        henry_schein, _ = Proveedor.objects.get_or_create(
            nombre="Henry Schein",
            tipo_interaccion='link',
            codigo_descuento='DQ2025',
            url_catalogo='https://henryschein.es'
        )
        henry_schein.categorias.add(distribuidores, aparatologia)

        # 2. Proclinic (Bloque A)
        proclinic, _ = Proveedor.objects.get_or_create(
            nombre="Proclinic",
            tipo_interaccion='link',
            codigo_descuento='DQ2025',
            url_catalogo='https://proclinic.es'
        )
        proclinic.categorias.add(distribuidores)

        # 3. Grupo Straumann (Bloque B)
        straumann, _ = Proveedor.objects.get_or_create(
            nombre="Grupo Straumann",
            tipo_interaccion='lead_form',
            codigo_descuento=''
        )
        straumann.categorias.add(implantologia_a, escaneres)

        # 4. ZimVie (Bloque B)
        zimvie, _ = Proveedor.objects.get_or_create(
            nombre="ZimVie",
            tipo_interaccion='lead_form',
            codigo_descuento=''
        )
        zimvie.categorias.add(implantologia_a, escaneres)

        # 5. Ormco (Bloque A)
        ormco, _ = Proveedor.objects.get_or_create(
            nombre="Ormco",
            tipo_interaccion='link',
            codigo_descuento='ORMCO-DQ',
            url_catalogo='https://ormco.es'
        )
        ormco.categorias.add(ortodoncia)

        # 6. Infomed (Bloque B)
        infomed, _ = Proveedor.objects.get_or_create(
            nombre="Infomed",
            tipo_interaccion='lead_form',
            codigo_descuento=''
        )
        infomed.categorias.add(software)

        self.stdout.write(self.style.SUCCESS("✅ Success! Professional Directory Structure Generated."))
