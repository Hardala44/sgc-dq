from django.core.management.base import BaseCommand
from compras.models import Proveedor, ProductoEstrella

class Command(BaseCommand):
    help = 'Seeds mock ProductoEstrella entries for testing.'

    def handle(self, *args, **options):
        products_data = [
            {'proveedor': 'Henry Schein', 'nombre': 'Turbina Premium NSK', 'precio_mercado': 850, 'precio_dq': 700},
            {'proveedor': 'Henry Schein', 'nombre': 'Autoclave Clase B', 'precio_mercado': 3500, 'precio_dq': 2900},
            {'proveedor': 'Proclinic', 'nombre': 'Composite Universal Jeringa', 'precio_mercado': 45, 'precio_dq': 30},
            {'proveedor': 'Proclinic', 'nombre': 'Guantes Nitrilo Caja x100', 'precio_mercado': 8, 'precio_dq': 5},
            {'proveedor': 'Grupo Straumann', 'nombre': 'Kit Quirúrgico Completo', 'precio_mercado': 2000, 'precio_dq': 1600},
            {'proveedor': 'ZimVie', 'nombre': 'Escáner iTero Flex', 'precio_mercado': 16000, 'precio_dq': 13500},
            {'proveedor': 'Ormco', 'nombre': 'Brackets Damon Q Set', 'precio_mercado': 300, 'precio_dq': 220},
            {'proveedor': 'Infomed', 'nombre': 'Licencia Anual Gesden', 'precio_mercado': 1200, 'precio_dq': 950},
        ]

        created_count = 0
        updated_count = 0
        for data in products_data:
            proveedor_nombre = data.pop('proveedor')
            try:
                proveedor = Proveedor.objects.get(nombre=proveedor_nombre)
                obj, created = ProductoEstrella.objects.get_or_create(
                    proveedor=proveedor,
                    nombre=data['nombre'],
                    defaults={'precio_mercado': data['precio_mercado'], 'precio_dq': data['precio_dq']}
                )
                if not created:
                    obj.precio_mercado = data['precio_mercado']
                    obj.precio_dq = data['precio_dq']
                    obj.save()
                    updated_count += 1
                else:
                    created_count += 1
            except Proveedor.DoesNotExist:
                self.stdout.write(self.style.WARNING(f"Proveedor '{proveedor_nombre}' no encontrado. Saltando {data['nombre']}."))

        self.stdout.write(self.style.SUCCESS(f"Éxito: {created_count} productos creados, {updated_count} actualizados."))
