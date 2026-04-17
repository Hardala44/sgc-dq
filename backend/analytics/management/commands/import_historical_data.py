from django.core.management.base import BaseCommand
import csv
import os
from analytics.models import CompraHistorica
from core.models import Clinica
from compras.models import Proveedor, Categoria

class Command(BaseCommand):
    help = 'Import historical purchase data from CSV'

    def add_arguments(self, parser):
        parser.add_argument('filename', type=str, help='Path to the CSV file')

    def handle(self, *args, **options):
        filename = options['filename']
        
        if not os.path.exists(filename):
            self.stdout.write(self.style.ERROR(f'File not found: {filename}'))
            return

        self.stdout.write(f'Importing data from {filename}...')
        
        count = 0
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    # clinica_nombre, proveedor_nombre, categoria_nombre, año, trimestre, importe
                    
                    clinica_nombre = row.get('clinica_nombre')
                    proveedor_nombre = row.get('proveedor_nombre')
                    categoria_nombre = row.get('categoria_nombre')
                    
                    # Try to find related objects. If not found, create dummy or skip?
                    # For simplicity, we assume they exist or we create them if needed (except Clinica, maybe)
                    
                    clinica = Clinica.objects.filter(nombre=clinica_nombre).first()
                    if not clinica:
                        if not clinica_nombre:
                            continue
                        # Let's create for robustness in this test
                        clinica, _ = Clinica.objects.get_or_create(nombre=clinica_nombre, defaults={'nombre_norm': clinica_nombre.upper()})
                        
                    proveedor, _ = Proveedor.objects.get_or_create(nombre=proveedor_nombre, defaults={'contacto_nombre': 'Unknown', 'contacto_email': 'unknown@example.com'})
                    categoria, _ = Categoria.objects.get_or_create(nombre=categoria_nombre)
                    
                    CompraHistorica.objects.create(
                        clinica=clinica,
                        proveedor=proveedor,
                        categoria=categoria,
                        anio=int(row['año']),
                        trimestre=int(row['trimestre']),
                        importe=float(row['importe'])
                    )
                    count += 1
                    
            self.stdout.write(self.style.SUCCESS(f'Successfully imported {count} records.'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error importing data: {str(e)}'))
