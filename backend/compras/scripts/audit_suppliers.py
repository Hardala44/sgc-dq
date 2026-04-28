import django
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()
from compras.models import Proveedor

print(f"{'ID':<5} | {'Proveedor':<30} | {'Logo URL':<20}")
print("-" * 60)
for p in Proveedor.objects.all():
    status = "OK" if p.logo else "VACÍO ❌"
    print(f"{p.id:<5} | {p.nombre[:30]:<30} | {status}")