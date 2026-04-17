import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from compras.serializers import ProductoEstrellaSerializer
from compras.models import ProductoEstrella

ofertas = ProductoEstrella.objects.filter(nombre__icontains='guantes')
data = ProductoEstrellaSerializer(ofertas, many=True).data

with open('out_api.txt', 'w') as f:
    f.write('DATA: ' + str(data) + '\n')
