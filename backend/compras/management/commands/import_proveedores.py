
from django.core.management.base import BaseCommand
from compras.models import Proveedor, Categoria
import pandas as pd
import numpy as np

class Command(BaseCommand):
    help = 'Importa proveedores desde CSV a modelo Proveedor'

    def add_arguments(self, parser):
        parser.add_argument('csv_file', type=str)
    
    def handle(self, *args, **options):
        df = pd.read_csv(options['csv_file'])
        
        # Handle NaN values
        df = df.fillna('')
        
        for index, row in df.iterrows():
            # Buscar/crear Categoria
            categoria_nombre = str(row['categoria']).strip()
            if not categoria_nombre:
                continue
                
            categoria, _ = Categoria.objects.get_or_create(
                nombre=categoria_nombre,
                defaults={'bloque': 'A'}
            )
            
            # Helper for boolean
            es_estrategico = str(row['es_estrategico']).upper() == 'TRUE'
            
            # Crear/actualizar Proveedor
            proveedor, created = Proveedor.objects.update_or_create(
                nombre=str(row['nombre']).strip(),
                defaults={
                    'descripcion_larga': row['descripcion'],
                    'condiciones_especiales': row['condiciones_especiales'],
                    'contacto_nombre': row['contacto_nombre'],
                    'contacto_telefono': row['contacto_telefono'],
                    'contacto_email': row['contacto_email'],
                    'es_estrategico': es_estrategico,
                    'activo': True,
                    'modo_pedido': 'email_pedido',
                    'tipo_interaccion': 'link',
                    'codigo_descuento': '',
                }
            )
            
            # Añadir categoria al M2M
            proveedor.categorias.add(categoria)
            
            self.stdout.write(f"Proveedor {row['nombre']}: {'CREADO' if created else 'ACTUALIZADO'}")
        
        self.stdout.write(self.style.SUCCESS(f"Importados {len(df)} proveedores"))
