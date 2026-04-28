import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from compras.models import Producto, ProveedorOferta, ProductoLegado

def purge():
    print("Iniciando purga total del catálogo (Blueprint B2B Logistics)...")
    
    deleted_ofertas = ProveedorOferta.objects.all().delete()
    print(f"- ProveedorOferta eliminadas: {deleted_ofertas}")
    
    deleted_productos = Producto.objects.all().delete()
    print(f"- Producto (Marketplace) eliminados: {deleted_productos}")
    
    deleted_legados = ProductoLegado.objects.all().delete()
    print(f"- ProductoLegado (Old) eliminados: {deleted_legados}")
    
    print("Purga completada. El catálogo de productos está vacío y listo para la nueva estructura.")

if __name__ == '__main__':
    purge()
