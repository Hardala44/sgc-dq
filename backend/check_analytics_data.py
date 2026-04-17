import os
import django
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from core.models import Clinica, Gasto

print("--- Step 1: Data Existence Verification ---")
print(f"Total Clinics: {Clinica.objects.count()}")
print(f"Total Expenses: {Gasto.objects.count()}")

# Check for expenses in 2024 and 2025
gastos_2024 = Gasto.objects.filter(year=2024).count()
gastos_2025 = Gasto.objects.filter(year=2025).count()

print(f"Expenses in 2024: {gastos_2024}")
print(f"Expenses in 2025: {gastos_2025}")

if gastos_2024 == 0 and gastos_2025 == 0:
    print("WARNING: No data for 2024/2025 found!")
else:
    print("SUCCESS: Data exists for requested periods.")
