"""
cleanup_categories.py
Removes spurious ExpenseCategory entries (those that are actually provider names)
and re-maps min_quarterly_consumption from the Excel file to real categories.
"""
import os
import sys
import re
import unicodedata
from decimal import Decimal

import django
import pandas as pd

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from core.models import ExpenseCategory, Gasto


def normalize_string(s):
    if not isinstance(s, str):
        return ""
    s = ''.join(c for c in unicodedata.normalize('NFD', s)
                if unicodedata.category(c) != 'Mn')
    return s.strip().upper()


# 1. Find categories actually referenced by Gasto records — keep these
used_cat_ids = set(Gasto.objects.values_list('category_id', flat=True).distinct())
print(f"Categorías usadas en Gasto: {len(used_cat_ids)}")

# 2. Delete all ExpenseCategory NOT referenced by any Gasto
deleted_qs = ExpenseCategory.objects.exclude(id__in=used_cat_ids)
deleted_names = list(deleted_qs.values_list('nombre', flat=True))
count_deleted, _ = deleted_qs.delete()
print(f"Eliminadas {count_deleted} categorías espurias (proveedores): {deleted_names[:10]}...")

# 3. Re-apply min_quarterly_consumption from Excel to the real categories
file_path = '../Ahorro Estimado (1).xlsx'
df_lineas = pd.read_excel(file_path, sheet_name='Lineas de productoservcio')

# Column 3: CLASIFICACION, Column 4: CONSUMO MINIMO TRIMESTRAL
cat_df = df_lineas.iloc[:, [3, 4]].dropna(subset=[df_lineas.columns[3]]).drop_duplicates()

# Build mapping: normalised_name -> min_value
excel_thresholds = {}
for _, row in cat_df.iterrows():
    cat_name = str(row.iloc[0]).strip()
    if cat_name in ('nan', ''):
        continue
    min_val_str = str(row.iloc[1]).strip()
    num_match = re.search(r'[\d\.]+', min_val_str)
    if num_match:
        try:
            min_val = Decimal(num_match.group())
        except Exception:
            min_val = Decimal('0.00')
    else:
        min_val = Decimal('0.00')
    excel_thresholds[normalize_string(cat_name)] = min_val

print(f"\nUmbrales del Excel ({len(excel_thresholds)}):")
for k, v in excel_thresholds.items():
    print(f"  {k}: {v}")

# 4. Apply to each real category with fuzzy matching
real_cats = ExpenseCategory.objects.all()
updated = 0
for cat in real_cats:
    norm = normalize_string(cat.nombre)
    matched_val = None

    # Try exact match first
    if norm in excel_thresholds:
        matched_val = excel_thresholds[norm]
    else:
        # Try partial match: find the Excel category whose key is contained in the cat name or vice versa
        for ex_key, ex_val in excel_thresholds.items():
            if ex_key in norm or norm in ex_key:
                matched_val = ex_val
                break
        # Special mappings for names that differ between the Excel and the DB
        MANUAL_MAP = {
            'DEPOSITOS Y SERVICIOS DENTALES': 'DEPOSITOS GENERALISTAS',
            'DEPOSITOS DENTALES': 'DEPOSITOS GENERALISTAS',
            'DEPOSITOS GENERALES': 'DEPOSITOS GENERALISTAS',
            'APARATOLOGIA': 'ORTODONCIA',
            'SERVICIOS CLINICOS': 'DEPOSITOS ESPECIALISTAS Y FABRICANTES',
            'SERVICIOS GENERALES': 'OTROS',
            'GESTORIA': 'GESTORIA',
        }
        if matched_val is None and norm in MANUAL_MAP:
            mapped_key = normalize_string(MANUAL_MAP[norm])
            matched_val = excel_thresholds.get(mapped_key, Decimal('0.00'))

    if matched_val is not None:
        cat.min_quarterly_consumption = matched_val
        cat.save(update_fields=['min_quarterly_consumption'])
        updated += 1
        print(f"  [{cat.nombre}] -> min_quarterly_consumption = {matched_val}")

print(f"\nActualizadas {updated} categorías con umbrales correctos.")
