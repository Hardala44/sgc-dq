import os
import django
import json

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sgc_dq.settings")
django.setup()

from compras.models import Proveedor, Categoria, Producto, ProveedorOferta
from compras.serializers import ProductoMarketplaceSerializer

print(f"Total productos: {Producto.objects.count()}")
print(f"Total ofertas: {ProveedorOferta.objects.count()}")

qs = Producto.objects.filter(nombre__icontains='guantes').prefetch_related('ofertas__proveedor')
serializer = ProductoMarketplaceSerializer(qs, many=True)
print(json.dumps(serializer.data, indent=2))
