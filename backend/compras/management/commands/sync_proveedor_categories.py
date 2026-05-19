"""
sync_proveedor_categories.py
============================
Reads Proveedores.xlsx and updates Proveedor.categoria_principal
for any provider whose name matches (fuzzy) an existing DB record.

Usage:
    python manage.py sync_proveedor_categories
    python manage.py sync_proveedor_categories --xlsx path/to/Proveedores.xlsx
"""
import os
import unicodedata
from django.core.management.base import BaseCommand
from compras.models import Proveedor


def normalize(s: str) -> str:
    s = unicodedata.normalize('NFKD', s)
    return ''.join(c for c in s if not unicodedata.combining(c)).upper().strip()


# Manual overrides for names that won't fuzzy-match automatically
MANUAL_MAP = {
    'BRUNEAU': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'SADIVAL': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'BOTISS': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'SANISWISS': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'WELLISAIR': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'DENTAID': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'INIBSA': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'CHEROKEE': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'CLINICLIC': 'DEPÓSITOS GENERALISTAS',
    'DENTAL OLID': 'DEPÓSITOS GENERALISTAS',
    'KUTXA BANK': 'FINANCIERAS',
    'KUTXABANK': 'FINANCIERAS',
    'SABADELL CONSUMER': 'FINANCIERAS',
    'INFOMED': 'GESTIÓN Y MARKETING DENTAL',
    'SANTACREU DESIGN': 'GESTIÓN Y MARKETING DENTAL',
    'KOKUAI': 'GESTIÓN Y MARKETING DENTAL',
    'DIGIMEVO': 'GESTIÓN Y MARKETING DENTAL',
    'IDH PLATFORM': 'GESTIÓN Y MARKETING DENTAL',
    'IDH-PACIENTES MOROSOS': 'GESTIÓN Y MARKETING DENTAL',
    'TALENT SALUD': 'GESTIÓN Y MARKETING DENTAL',
    'AESINERGY': 'GESTIÓN Y MARKETING DENTAL',
    'MEDICONSULTING': 'GESTORÍA',
    'ROCA ASOCIADOS': 'GESTORÍA',
    'VDOBLE CONSULTORES': 'GESTORÍA',
    'BITERIGHT': 'IMPLANTES',
    'IPD': 'IMPLANTES',
    'IOSFIX': 'IMPLANTES',
    'STRAUMANN': 'IMPLANTES',
    'ZIMMER BIOMET': 'IMPLANTES',
    'ZIMVIE': 'IMPLANTES',
    'CERANIUM': 'LABORATORIO',
    'CONVADENT': 'LABORATORIO',
    'CUSPIDENTAL': 'LABORATORIO',
    'DENTEKLAB': 'LABORATORIO',
    'MOCKLAB': 'LABORATORIO',
    'MONDENTAL': 'LABORATORIO',
    'PRODENTAL GILABERT': 'LABORATORIO',
    'FORESTADENT': 'ORTODONCIA',
    'IMPER-ORTHO': 'ORTODONCIA',
    'IMPERORTHO': 'ORTODONCIA',
    'ORMCO-SPARK': 'ORTODONCIA',
    'ORTOAREA': 'ORTODONCIA',
    'MARTIN Y CACHON': 'SEGUROS',
    'RADMEDICA': 'SERVICIOS DIAGNOSTICOS',
    'HYSSOGENIX': 'SERVICIOS DIAGNOSTICOS',
    'GLOFERA': 'CIBERSEGURIDAD Y TELCO',
    'IGPR': 'CUMPLIMIENTO NORMATIVO',
    'GRUPO OTP': 'CUMPLIMIENTO NORMATIVO',
    'EUROPREVEN': 'CUMPLIMIENTO NORMATIVO',
    'NOWON': 'GESTIÓN Y MARKETING DENTAL',
    'ASTUTE CONTROL': 'CIBERSEGURIDAD Y TELCO',
    'DENTALMONITORING': 'GESTIÓN Y MARKETING DENTAL',
    'BMG': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'DENTALHITEC': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'GLOBAL UNIFORMS': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'ROBENITEZ': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
    'KATIA DENTAL': 'DEPÓSITOS ESPECIALISTAS Y FABRICANTES',
}


class Command(BaseCommand):
    help = 'Syncs Proveedor.categoria_principal from Proveedores.xlsx'

    def add_arguments(self, parser):
        parser.add_argument('--xlsx', default='Proveedores.xlsx',
                            help='Path to Proveedores.xlsx (relative to project root)')

    def handle(self, *args, **options):
        xlsx_path = options['xlsx']
        if not os.path.isabs(xlsx_path):
            # Try relative to BASE_DIR (project root)
            from django.conf import settings
            xlsx_path = os.path.join(settings.BASE_DIR.parent, xlsx_path)

        updated = 0
        not_found = []

        # ── 1. Apply manual map ───────────────────────────────────────────────
        for prov in Proveedor.objects.all():
            norm_name = normalize(prov.nombre)
            matched_cat = None
            for key, cat in MANUAL_MAP.items():
                if normalize(key) in norm_name or norm_name in normalize(key):
                    matched_cat = cat
                    break
            if matched_cat and prov.categoria_principal != matched_cat:
                prov.categoria_principal = matched_cat
                prov.save(update_fields=['categoria_principal'])
                updated += 1
                self.stdout.write(self.style.SUCCESS(f'  [SET] {prov.nombre} -> {matched_cat}'))

        # ── 2. Parse Excel and try to match remaining ─────────────────────────
        try:
            import openpyxl
            wb = openpyxl.load_workbook(xlsx_path)
            ws = wb.active
            rows = list(ws.iter_rows(values_only=True))[1:]  # skip header
            for row in rows:
                if not row[0]:
                    continue
                excel_name = str(row[0]).strip()
                excel_cat = str(row[1]).strip() if row[1] else ''
                norm_excel = normalize(excel_name)

                for prov in Proveedor.objects.all():
                    if normalize(prov.nombre) == norm_excel or norm_excel in normalize(prov.nombre):
                        if prov.categoria_principal != excel_cat:
                            prov.categoria_principal = excel_cat
                            prov.save(update_fields=['categoria_principal'])
                            updated += 1
                            self.stdout.write(self.style.SUCCESS(
                                f'  [XLS] {prov.nombre} -> {excel_cat}'
                            ))
                        break
                else:
                    not_found.append(excel_name)
        except FileNotFoundError:
            self.stdout.write(self.style.WARNING(f'Excel not found at {xlsx_path}, using manual map only.'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Excel error: {e}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(f'Updated: {updated} providers'))
        if not_found:
            self.stdout.write(self.style.WARNING(f'Excel rows with no DB match: {not_found}'))
