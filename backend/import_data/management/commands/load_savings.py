import os
import re
from decimal import Decimal
import pandas as pd
from django.core.management.base import BaseCommand
from core.models import ExpenseCategory
from compras.models import Proveedor
from import_data.utils import normalize_string

class Command(BaseCommand):
    help = 'Loads savings estimations and minimum quarterly consumptions from Excel.'

    def handle(self, *args, **options):
        file_path = 'Ahorro Estimado (1).xlsx'
        
        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File {file_path} not found."))
            return

        # 1. Reset descuento_dq for all providers to 0
        Proveedor.objects.update(descuento_dq=Decimal('0.00'))
        self.stdout.write(self.style.SUCCESS("Reseteado descuento_dq a 0.00 para todos los proveedores."))

        # 2. Load Proveedor Ahorro Estimado
        df_ahorro = pd.read_excel(file_path, sheet_name='AHORRO ESTIMADO')
        # Columns: [0] PROVEEDOR, [1] AHORRO ESTIMADO
        
        updated_providers = 0
        for idx, row in df_ahorro.iterrows():
            prov_name = str(row.iloc[0]).strip()
            if prov_name == 'nan' or not prov_name:
                continue
                
            ahorro_val = row.iloc[1]
            try:
                if pd.isna(ahorro_val):
                    ahorro_dec = Decimal('0.00')
                else:
                    ahorro_dec = Decimal(str(ahorro_val))
            except Exception:
                ahorro_dec = Decimal('0.00')

            # Find provider by name (case insensitive, partial match if needed)
            prov_qs = Proveedor.objects.filter(nombre__icontains=prov_name)
            if prov_qs.exists():
                for p in prov_qs:
                    p.ahorro_estimado = ahorro_dec
                    p.save(update_fields=['ahorro_estimado'])
                    updated_providers += 1
            else:
                # Try normalized name
                norm_name = normalize_string(prov_name)
                for p in Proveedor.objects.all():
                    if normalize_string(p.nombre) == norm_name:
                        p.ahorro_estimado = ahorro_dec
                        p.save(update_fields=['ahorro_estimado'])
                        updated_providers += 1
                        break

        self.stdout.write(self.style.SUCCESS(f"Actualizados {updated_providers} proveedores con ahorro estimado."))

        # 3. Load ExpenseCategory min_quarterly_consumption
        df_lineas = pd.read_excel(file_path, sheet_name='Lineas de productoservcio')
        # Column 3: CLASIFICACION, Column 4: CONSUMO MINIMO TRIMESTRAL...
        
        updated_cats = 0
        cat_df = df_lineas.iloc[:, [3, 4]].dropna(subset=[df_lineas.columns[3]]).drop_duplicates()
        
        for idx, row in cat_df.iterrows():
            cat_name = str(row.iloc[0]).strip()
            if cat_name == 'nan' or not cat_name:
                continue
                
            min_val_str = str(row.iloc[1]).strip()
            # extract number
            num_match = re.search(r'[\d\.]+', min_val_str)
            if num_match:
                try:
                    min_val = Decimal(num_match.group())
                except:
                    min_val = Decimal('0.00')
            else:
                min_val = Decimal('0.00')

            norm_cat = normalize_string(cat_name)
            cat_qs = ExpenseCategory.objects.filter(nombre_norm=norm_cat)
            if cat_qs.exists():
                for c in cat_qs:
                    c.min_quarterly_consumption = min_val
                    c.save(update_fields=['min_quarterly_consumption'])
                    updated_cats += 1
            else:
                # Try icontains
                cat_qs2 = ExpenseCategory.objects.filter(nombre__icontains=cat_name)
                for c in cat_qs2:
                    c.min_quarterly_consumption = min_val
                    c.save(update_fields=['min_quarterly_consumption'])
                    updated_cats += 1

        self.stdout.write(self.style.SUCCESS(f"Actualizadas {updated_cats} categorías con consumo mínimo trimestral."))
