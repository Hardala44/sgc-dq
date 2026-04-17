
import os
import django
import sys
import json
from rest_framework.test import APIRequestFactory

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from compras.views import ProveedorViewSet

def test_api():
    factory = APIRequestFactory()
    view = ProveedorViewSet.as_view({'get': 'list'})
    request = factory.get('/proveedores/')
    response = view(request)
    
    print("Status Code:", response.status_code)
    if response.status_code == 200:
        data = response.data
        print(f"Total Providers: {len(data)}")
        if len(data) > 0:
            print("Sample Provider:")
            print(json.dumps(data[0], indent=2, default=str))

if __name__ == '__main__':
    test_api()
