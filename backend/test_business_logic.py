import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from django.contrib.auth import get_user_model
from core.models import Clinica, Usuario
from compras.models import Proveedor, Producto, Pedido, LineaPedido, Categoria
from incentivos.models import Puntos, HistoricoPuntos
from analytics.models import CompraHistorica
from rest_framework.test import APIRequestFactory, force_authenticate
from analytics.views import cuadro_mando
import datetime

User = get_user_model()

def test_business_logic():
    print("--- Testing Business Logic ---\n")
    
    # 1. Setup Data
    print("1. Setting up test data...")
    
    # Cleanup previous runs
    print("   Cleaning up old data...")
    LineaPedido.objects.all().delete() # Delete lines first
    HistoricoPuntos.objects.all().delete()
    Puntos.objects.all().delete()
    Pedido.objects.filter(numero_pedido__in=['PED-A', 'PED-B']).delete()
    CompraHistorica.objects.filter(clinica__nombre='Clinica Business Logic').delete()
    
    User.objects.filter(username='test_bl_user').delete()
    # Delete Legal Entity before Clinic
    from core.models import ClinicLegalEntity
    ClinicLegalEntity.objects.filter(cif='TEST-BL-CIF').delete()
    Clinica.objects.filter(nombre='Clinica Business Logic').delete()
    Proveedor.objects.filter(nombre__in=['Prov Estrategico', 'Prov Normal']).delete()
    Categoria.objects.filter(nombre='Cat Test BL').delete()
    Producto.objects.filter(codigo_producto='PROD-BL').delete()
    
    # Clinica
    # Clinica
    clinica, _ = Clinica.objects.get_or_create(
        nombre_norm='CLINICA BUSINESS LOGIC',
        defaults={'nombre': 'Clinica Business Logic'}
    )
    # Legal Entity
    from core.models import ClinicLegalEntity
    ClinicLegalEntity.objects.get_or_create(
        cif='TEST-BL-CIF',
        defaults={'clinic': clinica, 'email_preferred': 'bl@test.com'}
    )
    
    # User for API test
    user, _ = User.objects.get_or_create(username='test_bl_user', defaults={'email': 'test_bl@test.com'})
    user.clinica = clinica
    user.save()
    
    # Proveedores
    prov_est, _ = Proveedor.objects.get_or_create(nombre='Prov Estrategico', defaults={'es_estrategico': True, 'contacto_email': 'e@test.com', 'contacto_nombre': 'E', 'contacto_telefono': '1'})
    prov_norm, _ = Proveedor.objects.get_or_create(nombre='Prov Normal', defaults={'es_estrategico': False, 'contacto_email': 'n@test.com', 'contacto_nombre': 'N', 'contacto_telefono': '1'})
    
    # Producto (for savings test)
    cat, _ = Categoria.objects.get_or_create(nombre='Cat Test BL')
    prod, _ = Producto.objects.get_or_create(
        codigo_producto='PROD-BL', 
        defaults={
            'nombre': 'Prod Savings', 
            'proveedor': prov_est, 
            'categoria': cat, 
            'precio_dq': 100.00, 
            'precio_mercado': 120.00, # Savings = 20 per unit
            'stock_disponible': 1000
        }
    )

    # 2. Test Points Logic
    print("\n2. Testing Points Logic...")
    
    # Case A: 1500 EUR + Strategic -> 10 pts (1000) + 100 bonus = 110
    pedido_a = Pedido.objects.create(
        clinica=clinica, proveedor=prov_est, numero_pedido='PED-A', 
        subtotal=1500, total=1500, tipo_gestion='directo'
    )
    # Trigger signal by changing state
    pedido_a.estado = 'enviado'
    pedido_a.save()
    
    h_puntos_a = HistoricoPuntos.objects.filter(pedido=pedido_a).first()
    if h_puntos_a and h_puntos_a.puntos == 110:
        print(f"   ✅ Case A (1500 + Strategic): Got {h_puntos_a.puntos} points (Expected 110)")
    else:
        pts = h_puntos_a.puntos if h_puntos_a else 'None'
        print(f"   ❌ Case A Failed: Got {pts} points")

    # Case B: 999 EUR + Normal -> 0 pts
    pedido_b = Pedido.objects.create(
        clinica=clinica, proveedor=prov_norm, numero_pedido='PED-B', 
        subtotal=999, total=999, tipo_gestion='directo'
    )
    pedido_b.estado = 'enviado'
    pedido_b.save()
    
    h_puntos_b = HistoricoPuntos.objects.filter(pedido=pedido_b).first()
    if h_puntos_b and h_puntos_b.puntos == 0:
        print(f"   ✅ Case B (999 + Normal): Got {h_puntos_b.puntos} points (Expected 0)")
    else:
        pts = h_puntos_b.puntos if h_puntos_b else 'None'
        print(f"   ❌ Case B Failed: Got {pts} points")
        
    # Check total points on Clinica
    puntos_clinica = Puntos.objects.get(clinica=clinica)
    print(f"   ✅ Clinica Total Points: {puntos_clinica.puntos_acumulados}")
    
    
    # 3. Test Savings Logic (AhorroService)
    print("\n3. Testing Savings Logic...")
    
    # Create a line item for Pedido A to generate savings
    # Prod market=120, dq=100. Qty=10. Savings = (120-100)*10 = 200.
    # Note: Pedido total is manually set above, but AhorroService looks at lines.
    LineaPedido.objects.create(
        pedido=pedido_a, producto=prod, cantidad=10, 
        precio_unitario=100.00, subtotal_linea=1000.00
    )
    
    from analytics.services import AhorroService
    current_year = datetime.datetime.now().year
    current_quarter = (datetime.datetime.now().month - 1) // 3 + 1
    
    ahorro_total, ahorro_pct = AhorroService.calcular_ahorro_trimestre(clinica.id, current_year, current_quarter)
    
    if ahorro_total == 200.0:
        print(f"   ✅ Savings Calculation: {ahorro_total} (Expected 200.0)")
    else:
        print(f"   ❌ Savings Failed: Got {ahorro_total}")
        
        
    # 4. Test Dashboard Endpoint
    print("\n4. Testing Dashboard Endpoint...")
    factory = APIRequestFactory()
    request = factory.get('/api/analytics/cuadro-mando/')
    force_authenticate(request, user=user)
    
    response = cuadro_mando(request)
    if response.status_code == 200:
        print("   ✅ Dashboard Response: 200 OK")
        print(f"   Response Data: {response.data}")
    else:
        print(f"   ❌ Dashboard Failed: {response.status_code} - {response.data}")
        
    
    # 5. Test Import Command
    print("\n5. Testing Import Command...")
    # Create dummy csv
    csv_content = """clinica_nombre,proveedor_nombre,categoria_nombre,año,trimestre,importe
Clinica Business Logic,Prov Estrategico,Cat Test BL,2023,1,5000.00
"""
    with open('test_import.csv', 'w', encoding='utf-8') as f:
        f.write(csv_content)
        
    from django.core.management import call_command
    from io import StringIO
    out = StringIO()
    call_command('import_historical_data', 'test_import.csv', stdout=out)
    
    if "Successfully imported 1 records" in out.getvalue():
        print("   ✅ Import Command Success")
        # Verify db
        exists = CompraHistorica.objects.filter(clinica=clinica, importe=5000.00).exists()
        print(f"   ✅ Record found in DB: {exists}")
    else:
        print(f"   ❌ Import Failed output: {out.getvalue()}")
        
    # Cleanup
    if os.path.exists('test_import.csv'):
        os.remove('test_import.csv')

if __name__ == '__main__':
    try:
        test_business_logic()
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
