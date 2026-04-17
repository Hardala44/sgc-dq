
import os
import django
import sys
import json

# Setup Django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from analytics.services import AnalyticsService
from core.models import Usuario, Clinica, Gasto

def run_test():
    # 1. Find a user with a clinic
    user = Usuario.objects.filter(clinica__isnull=False).first()
    if not user:
        print("No user with associated clinic found. Checking for any clinic...")
        clinic = Clinica.objects.first()
        if not clinic:
            print("No clinics found! Cannot test.")
            return
        print(f"Using clinic directly: {clinic}")
    else:
        clinic = user.clinica
        print(f"Using clinic from user {user.username}: {clinic}")

    # 2. Check if we have Expenses
    count = Gasto.objects.filter(clinic=clinic).count()
    print(f"Clinic has {count} expenses.")
    
    if count == 0:
        print("Warning: This clinic has no expenses. Results will be empty.")
        # Try to find a clinic with expenses
        clinic_with_expenses = Gasto.objects.values('clinic').distinct().first()
        if clinic_with_expenses:
             clinic = Clinica.objects.get(id=clinic_with_expenses['clinic'])
             print(f"Switched to clinic {clinic} which has expenses.")

    # 3. Call Service - Test YoY
    print("\n--- Testing YoY (2025-Q1 vs 2024-Q1) ---")
    try:
        data_yoy = AnalyticsService.get_dashboard_data(clinic, "2025-Q1", "yoy")
        print(json.dumps(data_yoy, indent=2, default=str))
    except Exception as e:
        print(f"Error testing YoY: {e}")

    # 4. Call Service - Test QoQ (2025-Q1 vs 2024-Q4)
    print("\n--- Testing QoQ (2025-Q1 vs 2024-Q4) ---")
    try:
        data_qoq = AnalyticsService.get_dashboard_data(clinic, "2025-Q1", "qoq")
         # Print just KPIs to save space
        print("KPIs:", json.dumps(data_qoq['kpis'], indent=2, default=str))
        print("Comparison Label:", data_qoq['comparison_label'])
    except Exception as e:
        print(f"Error testing QoQ: {e}")

if __name__ == "__main__":
    run_test()
