import os
import sys
import django

# Add backend directory to path
backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(backend_dir)

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from compras.models import Proveedor

FINANCIAL_PROVIDERS = [
    {"nombre": "GLOFERA TELECOM", "categoria": "CIBERSEGURIDAD Y TELCO", "ahorro": None},
    {"nombre": "INFOMED", "categoria": "SOFTWARE DE GESTIÓN", "ahorro": None},
    {"nombre": "MARTÍN Y CACHÓN", "categoria": "SEGUROS", "ahorro": None},
    {"nombre": "RADMEDICA", "categoria": "OTROS", "ahorro": None},
    {"nombre": "HYSSOGENIX", "categoria": "OTROS", "ahorro": None},
    {"nombre": "PICKING PACK", "categoria": "OTROS", "ahorro": None},
    {"nombre": "SADIVAL", "categoria": "OTROS", "ahorro": None},
    {"nombre": "SANTACREU DESIGN", "categoria": "OTROS", "ahorro": None},
    {"nombre": "FORESTADENT", "categoria": "ORTODONCIA", "ahorro": None},
    {"nombre": "IMPER-ORTHO", "categoria": "ORTODONCIA", "ahorro": None},
    {"nombre": "ORMCO-SPARK", "categoria": "ORTODONCIA", "ahorro": None},
    {"nombre": "ORTOAREA", "categoria": "ORTODONCIA", "ahorro": None},
    {"nombre": "IGPR", "categoria": "LEGAL", "ahorro": None},
    {"nombre": "GRUPO OTP (EUROPREVEN)", "categoria": "LEGAL", "ahorro": None},
    {"nombre": "CERANIUM", "categoria": "LABORATORIO", "ahorro": None},
    {"nombre": "CONVADENT", "categoria": "LABORATORIO", "ahorro": None},
    {"nombre": "CUSPIDENTAL", "categoria": "LABORATORIO", "ahorro": None},
    {"nombre": "DENTEKLAB", "categoria": "LABORATORIO", "ahorro": None},
    {"nombre": "MOCKLAB", "categoria": "LABORATORIO", "ahorro": None},
    {"nombre": "MONDENTAL", "categoria": "LABORATORIO", "ahorro": None},
    {"nombre": "PRODENTAL GILABERT", "categoria": "LABORATORIO", "ahorro": None},
    {"nombre": "BITERIGHT", "categoria": "IMPLANTES", "ahorro": 0.05},
    {"nombre": "IPD", "categoria": "IMPLANTES", "ahorro": 0.02},
    {"nombre": "IOSFIX", "categoria": "IMPLANTES", "ahorro": 0.20},
    {"nombre": "KLOCKNER // BOTISS / OSTELL / T-SCAN", "categoria": "IMPLANTES", "ahorro": 0.05},
    {"nombre": "STRAUMANN", "categoria": "IMPLANTES", "ahorro": None},
    {"nombre": "ZIMMER BIOMET", "categoria": "IMPLANTES", "ahorro": None},
    {"nombre": "KOKUAI", "categoria": "GESTIÓN Y MARKETING DENTAL", "ahorro": None},
    {"nombre": "DIGIMEVO", "categoria": "GESTIÓN Y MARKETING DENTAL", "ahorro": 0.25},
    {"nombre": "I-PACIENTES MOROSOS", "categoria": "GESTIÓN Y MARKETING DENTAL", "ahorro": None},
    {"nombre": "TALENT SALUD", "categoria": "GESTIÓN Y MARKETING DENTAL", "ahorro": None},
    {"nombre": "AESINERGY - CONSULTORÍA Y MKT", "categoria": "GESTIÓN Y MARKETING DENTAL", "ahorro": None},
    {"nombre": "KUTXA BANK", "categoria": "FINANCIERAS", "ahorro": 0.02},
    {"nombre": "SABADELL CONSUMER", "categoria": "FINANCIERAS", "ahorro": 0.02},
    {"nombre": "BROKER", "categoria": "DEPÓSITOS GENERALISTAS", "ahorro": 0.05},
    {"nombre": "CLINICLIC", "categoria": "DEPÓSITOS GENERALISTAS", "ahorro": 0.04},
    {"nombre": "DENTAL OLID", "categoria": "DEPÓSITOS GENERALISTAS", "ahorro": 0.0},
    {"nombre": "DVD", "categoria": "DEPÓSITOS GENERALISTAS", "ahorro": None},
    {"nombre": "HENRY SCHEIN", "categoria": "DEPÓSITOS GENERALISTAS", "ahorro": 0.08},
    {"nombre": "PROCLINIC", "categoria": "DEPÓSITOS GENERALISTAS", "ahorro": 0.05},
    {"nombre": "ADIEMED", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.12},
    {"nombre": "AKURA", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.05},
    {"nombre": "ARZENDENT", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.04},
    {"nombre": "EMS", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.05},
    {"nombre": "WELLISAIR", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.20},
    {"nombre": "AXIS", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.10},
    {"nombre": "CHEROKEE", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.10},
    {"nombre": "DENTAID", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.05},
    {"nombre": "ENDOVATIONS", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.04},
    {"nombre": "INIBSA", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.08},
    {"nombre": "KATIA PRODUCTOS DENTALES", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.10},
    {"nombre": "RAMIS DE BENÍTEZ", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.03},
    {"nombre": "SANISWISS", "categoria": "DEPÓSITOS ESPECIALISTAS Y FABRICANTES", "ahorro": 0.06},
    {"nombre": "MEDICONSULTING", "categoria": "LEGAL/GESTORÍA", "ahorro": 0.05},
    {"nombre": "ROCA ASOCIADOS", "categoria": "LEGAL/GESTORÍA", "ahorro": 0.15},
]

def run():
    print("Iniciando sincronización de proveedores con datos financieros...")
    creados = 0
    actualizados = 0

    for prov_data in FINANCIAL_PROVIDERS:
        search_name = prov_data['nombre'].split(' ')[0]
        
        proveedores_encontrados = Proveedor.objects.filter(nombre__icontains=search_name)
        
        if proveedores_encontrados.exists():
            prov = proveedores_encontrados.first()
            prov.ahorro_estimado = prov_data['ahorro']
            prov.categoria_principal = prov_data['categoria']
            prov.save()
            actualizados += 1
            print(f"[Actualizado] {prov.nombre} -> Ahorro: {prov.ahorro_estimado}, Cat: {prov.categoria_principal}")
        else:
            prov = Proveedor.objects.create(
                nombre=prov_data['nombre'],
                ahorro_estimado=prov_data['ahorro'],
                categoria_principal=prov_data['categoria']
            )
            creados += 1
            print(f"[Creado Nuevo] {prov.nombre}")

    print("\nResumen Final:")
    print(f"Proveedores actualizados: {actualizados}")
    print(f"Proveedores creados nuevos: {creados}")

if __name__ == "__main__":
    run()
