import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from compras.models import Producto, ProductoEstrella, Categoria, Proveedor

with open('out.txt', 'w') as f:
    f.write('PROD:' + str(list(Producto.objects.filter(nombre__icontains="guan").values('nombre', 'activo')))+'\n')
    f.write('ESTRELLA:' + str(list(ProductoEstrella.objects.filter(nombre__icontains="guan").values('nombre')))+'\n')
    f.write('CATEG:' + str(list(Categoria.objects.filter(nombre__icontains="guan").values('nombre')))+'\n')
    f.write('PROV:' + str(list(Proveedor.objects.filter(nombre__icontains="guan").values('nombre')))+'\n')
