import os
import pandas as pd
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from core.models import Clinica, ClinicLegalEntity, ExpenseCategory, Gasto
from compras.models import Proveedor
from analytics.models import CompraHistorica

User = get_user_model()

class Command(BaseCommand):
    help = 'Import global expenses from 2026_DENTALQUALITY_CONSUMOS_TABLA DINÁMICA.xlsx'

    def handle(self, *args, **options):
        file_path = '../2026_DENTALQUALITY_CONSUMOS_TABLA DINÁMICA.xlsx'
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        self.stdout.write("Reading Excel file...")
        try:
            df = pd.read_excel(file_path, sheet_name='Datos Reportes Consumos')
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error reading Excel: {str(e)}"))
            return

        # Create or ensure admin exists
        admin_email = 'admin@dentalq.es'
        admin_pass = 'DQ@Admin2025!'
        if not User.objects.filter(email=admin_email).exists():
            User.objects.create_superuser(
                username='admin',
                email=admin_email,
                password=admin_pass,
                rol='admin_dq',
                must_change_password=False
            )
            self.stdout.write(self.style.SUCCESS(f"Created admin user {admin_email}"))

        with transaction.atomic():
            self.stdout.write("Purging Gasto, ExpenseCategory and CompraHistorica tables...")
            Gasto.objects.all().delete()
            ExpenseCategory.objects.all().delete()
            CompraHistorica.objects.all().delete()
            
            cif_map = {}
            for entity in ClinicLegalEntity.objects.select_related('clinic'):
                cif_map[entity.cif.strip().upper()] = entity.clinic

            category_map = {}
            for cat in ExpenseCategory.objects.all():
                category_map[cat.nombre_norm] = cat
                
            proveedor_map = {}
            for prov in Proveedor.objects.all():
                proveedor_map[prov.nombre.upper().strip()] = prov

            inserted_count = 0
            skipped_cif_count = 0
            
            for index, row in df.iterrows():
                cif_val = str(row.get('CIF', '')).strip().upper()
                if not cif_val or cif_val == 'NAN':
                    continue

                if cif_val not in cif_map:
                    skipped_cif_count += 1
                    continue

                clinic = cif_map[cif_val]

                # Category
                cat_name = str(row.get('PRODUCTO / SERVICIO', 'OTRO')).strip()
                if cat_name == 'nan':
                    cat_name = 'OTRO'
                cat_norm = cat_name.lower().replace(' ', '_')
                if cat_norm not in category_map:
                    new_cat = ExpenseCategory.objects.create(nombre=cat_name, nombre_norm=cat_norm)
                    category_map[cat_norm] = new_cat
                category = category_map[cat_norm]

                # Proveedor
                prov_name = str(row.get('PROVEEDOR', 'Desconocido')).strip()
                if prov_name == 'nan':
                    prov_name = 'Desconocido'
                prov_key = prov_name.upper()
                if prov_key not in proveedor_map:
                    new_prov = Proveedor.objects.create(nombre=prov_name)
                    proveedor_map[prov_key] = new_prov
                proveedor = proveedor_map[prov_key]

                # Year and Quarter
                try:
                    year_val = row.get('AÑO', 0)
                    if pd.isna(year_val):
                        continue
                    year = int(year_val)
                    
                    quarter_val = str(row.get('TRIMESTRE', '')).upper()
                    if pd.isna(row.get('TRIMESTRE')):
                        continue
                    if 'Q' in quarter_val:
                        quarter = int(quarter_val.replace('Q', '').strip())
                    else:
                        quarter = int(float(quarter_val))
                except (ValueError, TypeError):
                    continue
                    
                if year == 0:
                    continue

                # Amounts
                amount_raw = row.get('TOTAL FACTURACION', 0)
                if pd.isna(amount_raw): amount_raw = 0
                try:
                    amount = Decimal(str(amount_raw).replace(',', '')) if isinstance(amount_raw, str) else Decimal(str(amount_raw))
                except:
                    amount = Decimal('0.00')

                ahorro_raw = row.get('Ahorro aprox', 0)
                if pd.isna(ahorro_raw): ahorro_raw = 0
                try:
                    ahorro = Decimal(str(ahorro_raw).replace(',', '')) if isinstance(ahorro_raw, str) else Decimal(str(ahorro_raw))
                except:
                    ahorro = Decimal('0.00')

                # Handle unique constraint: clinic, year, quarter, category, proveedor
                gasto, created = Gasto.objects.get_or_create(
                    clinic=clinic,
                    year=year,
                    quarter=quarter,
                    category=category,
                    proveedor=proveedor,
                    defaults={
                        'amount': amount,
                        'ahorro_aprox': ahorro,
                        'source_sheet': 'Datos Reportes Consumos',
                        'source_row': index + 2
                    }
                )
                if not created:
                    gasto.amount += amount
                    gasto.ahorro_aprox += ahorro
                    gasto.save()
                    
                inserted_count += 1

            self.stdout.write(self.style.SUCCESS(f"Successfully processed {inserted_count} expense rows."))
            if skipped_cif_count > 0:
                self.stdout.write(self.style.WARNING(f"Skipped {skipped_cif_count} rows due to unmapped CIFs."))

            from django.db.models import Count
            clinic_counts = Gasto.objects.values('clinic__nombre').annotate(total=Count('id')).order_by('clinic__nombre')
            self.stdout.write("\n--- Resumen por Clínica ---")
            for c in clinic_counts:
                self.stdout.write(f"{c['clinic__nombre']}: {c['total']} registros")
            self.stdout.write("---------------------------\n")

        # Verify counts per year
        for year in [2024, 2025, 2026]:
            count = Gasto.objects.filter(year=year).count()
            total = sum(g.amount for g in Gasto.objects.filter(year=year))
            self.stdout.write(f"Year {year}: {count} records, Total: {total}")
