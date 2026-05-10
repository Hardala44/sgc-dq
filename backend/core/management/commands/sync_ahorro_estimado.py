import pandas as pd
from decimal import Decimal, InvalidOperation
from django.core.management.base import BaseCommand
from django.db import transaction
from compras.models import Proveedor
from core.models import ExpenseCategory

class Command(BaseCommand):
    help = 'Sync Ahorro Estimado from Ahorro Estimado (1).xlsx'

    def handle(self, *args, **options):
        file_path = '../Ahorro Estimado (1).xlsx'
        try:
            xl = pd.ExcelFile(file_path)
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error loading {file_path}: {e}"))
            return

        self.stdout.write(self.style.NOTICE("Starting Ahorro Estimado sync..."))

        with transaction.atomic():
            self._sync_proveedores(xl)
            self._sync_categories(xl)

        self.stdout.write(self.style.SUCCESS("Sync complete!"))

    def _sync_proveedores(self, xl):
        self.stdout.write("Syncing Proveedor ahorro_estimado...")
        try:
            df = pd.read_excel(xl, sheet_name='AHORRO ESTIMADO')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not load sheet 'AHORRO ESTIMADO': {e}"))
            return
            
        updated_count = 0
        for index, row in df.iterrows():
            prov_name = str(row.get('PROVEEDOR', '')).strip()
            ahorro_val = row.get('AHORRO ESTIMADO', 0)
            if pd.isna(ahorro_val):
                ahorro_val = 0
            
            if not prov_name or pd.isna(prov_name) or prov_name == 'nan':
                continue
                
            try:
                ahorro_decimal = Decimal(str(ahorro_val))
            except InvalidOperation:
                ahorro_decimal = Decimal('0.00')

            # We try to match proveedor name. A case-insensitive search might be better.
            proveedores = Proveedor.objects.filter(nombre__iexact=prov_name)
            if proveedores.exists():
                for prov in proveedores:
                    prov.ahorro_estimado = ahorro_decimal
                    prov.save()
                    updated_count += 1
            else:
                self.stdout.write(self.style.WARNING(f"Proveedor not found: {prov_name}"))

        self.stdout.write(self.style.SUCCESS(f"Updated {updated_count} Proveedores."))

    def _sync_categories(self, xl):
        self.stdout.write("Syncing ExpenseCategory min_quarterly_consumption...")
        try:
            df = pd.read_excel(xl, sheet_name='Lineas de productoservcio')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"Could not load sheet 'Lineas de productoservcio': {e}"))
            return
            
        updated_count = 0
        for index, row in df.iterrows():
            cat_name = str(row.get('NOMBRE PARA CLÍNICA', '')).strip()
            min_consumption = row.get('CONSUMO MINIMO TRIMESTRAL PARA CONSIDERAR QUE UINA CLÍNICA COMPRA POR DQ', 0)
            if pd.isna(min_consumption):
                min_consumption = 0
            
            if not cat_name or pd.isna(cat_name) or cat_name == 'nan':
                continue
                
            try:
                min_consumption_decimal = Decimal(str(min_consumption))
            except InvalidOperation:
                min_consumption_decimal = Decimal('0.00')

            norm_name = cat_name.lower().replace(' ', '_')
            
            # Find category
            try:
                category = ExpenseCategory.objects.get(nombre_norm=norm_name)
                category.min_quarterly_consumption = min_consumption_decimal
                category.save()
                updated_count += 1
            except ExpenseCategory.DoesNotExist:
                # In case it doesn't exist, we might not want to create it if it has no expenses,
                # but let's create it to hold the threshold just in case it appears later.
                ExpenseCategory.objects.create(
                    nombre=cat_name,
                    nombre_norm=norm_name,
                    min_quarterly_consumption=min_consumption_decimal
                )
                updated_count += 1
                self.stdout.write(self.style.NOTICE(f"Created category to hold threshold: {cat_name}"))

        self.stdout.write(self.style.SUCCESS(f"Updated {updated_count} ExpenseCategories."))
