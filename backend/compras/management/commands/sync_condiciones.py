import re
import difflib
from django.core.management.base import BaseCommand
from compras.models import Proveedor
import fitz
import os
from django.conf import settings

class Command(BaseCommand):
    help = 'Sincroniza las condiciones especiales de los proveedores desde el PDF'

    def handle(self, *args, **options):
        # 1. Extraer texto del PDF
        pdf_path = os.path.join(settings.BASE_DIR, '..', 'FOLDER PROVEEDORES DentalQuality (2).pdf')
        if not os.path.exists(pdf_path):
            self.stdout.write(self.style.ERROR(f'No se encuentra el archivo PDF en {pdf_path}'))
            return

        doc = fitz.open(pdf_path)
        text = ''
        for page in doc:
            text += page.get_text()

        # Limpiar texto un poco
        text = text.replace('\r\n', '\n')

        # 2. Obtener lista de proveedores
        proveedores = Proveedor.objects.all()
        nombres_db = {p.nombre.lower(): p for p in proveedores}

        # 3. Separar por bloques y extraer condiciones
        blocks = re.split(r'\nContacto\n', text)
        updated_count = 0

        for block in blocks[:-1]:
            if 'Condiciones Especiales:' in block or 'Condiciones Especiales' in block:
                # Encontrar dónde empieza
                match_cond = re.search(r'Condiciones Especiales[:]?\s*(.*)', block, re.DOTALL)
                if not match_cond:
                    continue
                
                cond_text = match_cond.group(1).strip()
                
                # Buscar nombre del proveedor (normalmente antes de "con las ventajas DentalQuality")
                name_match = re.search(r'([A-Z0-9 a-zA-Z\-\&]+) con las ventajas DentalQuality', block)
                if not name_match:
                    name_match = re.search(r'([A-Z0-9 \-\&]+)', block) # Fallback al primer texto en mayúsculas
                
                if name_match:
                    raw_name = name_match.group(1).strip()
                    # Si es muy largo probablemente falló el regex, lo acortamos a las primeras palabras
                    raw_name = ' '.join(raw_name.split()[:5])
                    
                    # Fuzzy match
                    matches = difflib.get_close_matches(raw_name.lower(), nombres_db.keys(), n=1, cutoff=0.3)
                    if matches:
                        matched_name = matches[0]
                        proveedor = nombres_db[matched_name]
                        
                        # Limpiar el cond_text (quitar viñetas raras si las hay, aunque en django templates se renderizará igual, 
                        # podemos estandarizar las viñetas a un solo tipo).
                        cond_text_clean = cond_text.replace('\u2022', '-').replace('\uf0b7', '-')
                        
                        # A veces el bloque de condiciones incluye otras cosas de abajo, intentaremos cortar en palabras clave de otras secciones si las hay, 
                        # pero dado que cortamos por "Contacto", ya está bastante limpio.
                        
                        proveedor.condiciones_especiales = cond_text_clean
                        proveedor.save(update_fields=['condiciones_especiales'])
                        self.stdout.write(self.style.SUCCESS(f'Actualizadas condiciones para {proveedor.nombre}'))
                        updated_count += 1
                    else:
                        self.stdout.write(self.style.WARNING(f'No se encontró match para: {raw_name}'))

        self.stdout.write(self.style.SUCCESS(f'\nProceso completado. Proveedores actualizados: {updated_count}'))
