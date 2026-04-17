import os
import django
from django.db.models import Count, Sum

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from core.models import Usuario, Gasto, Clinica

def check_user_data(username):
    print(f"\n--- Checking data for user: {username} ---")
    try:
        user = Usuario.objects.get(username=username)
    except Usuario.DoesNotExist:
        print(f"User {username} not found!")
        return

    print(f"User ID: {user.id}")
    print(f"Role: {user.rol}")
    
    if not user.clinica:
        print("GUARNING: User has NO associated clinic!")
        return

    clinic = user.clinica
    print(f"Clinic: {clinic.nombre} (ID: {clinic.id})")
    print(f"Clinic Active: {clinic.activa}")

    # Check Expenses
    expenses_count = Gasto.objects.filter(clinic=clinic).count()
    print(f"Total Expenses for Clinic: {expenses_count}")

    if expenses_count > 0:
        print("Expenses by Year/Quarter:")
        stats = Gasto.objects.filter(clinic=clinic).values('year', 'quarter').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('year', 'quarter')
        
        for s in stats:
            print(f"  {s['year']} Q{s['quarter']}: {s['count']} records, Total: €{s['total']:,.2f}")
    else:
        print("  NO EXPENSES found for this clinic.")

def scan_for_data_rich_users():
    print(f"\n--- Scanning for users with data ---")
    # Find clinics with expenses
    clinics_with_expenses = Gasto.objects.values('clinic').annotate(count=Count('id')).filter(count__gt=0).order_by('-count')
    
    print(f"Found {clinics_with_expenses.count()} clinics with expenses.")
    
    for entry in clinics_with_expenses[:5]: # Show top 5
        clinic_id = entry['clinic']
        count = entry['count']
        try:
            clinic = Clinica.objects.get(id=clinic_id)
            users = Usuario.objects.filter(clinica=clinic)
            user_list = ", ".join([u.username for u in users]) if users.exists() else "NO USERS LINKED"
            print(f"Clinic: {clinic.nombre} - {count} records. Users: {user_list}")
        except Clinica.DoesNotExist:
            print(f"Clinic ID {clinic_id} not found (Integrity Error?)")

if __name__ == "__main__":
    check_user_data("B65021917")
    scan_for_data_rich_users()
