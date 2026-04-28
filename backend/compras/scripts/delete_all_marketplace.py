"""
delete_all_marketplace.py
=========================
Borra todos los registros del catálogo Marketplace:
  - ProveedorOferta   (compras)
  - Producto          (compras – tabla Marketplace)
  - ImportBatch       (core)

Deja intactos: Proveedor, Categoria, ProductoLegado y todo lo demás.

Uso:
    cd backend
    python manage.py shell < compras/scripts/delete_all_marketplace.py
"""

import django
import os
import sys

# ── Bootstrap Django si se ejecuta directamente ──────────────────────────────
if __name__ == '__main__':
    # Asume que este script se ejecuta desde backend/ o que manage.py está en el path
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
    django.setup()

from django.db import transaction
from compras.models import ProveedorOferta, Producto
from core.models import ImportBatch


def run():
    with transaction.atomic():
        ofertas_count = ProveedorOferta.objects.count()
        ProveedorOferta.objects.all().delete()
        print(f"  ✓ ProveedorOferta eliminados : {ofertas_count}")

        productos_count = Producto.objects.count()
        Producto.objects.all().delete()
        print(f"  ✓ Producto (Marketplace) eliminados : {productos_count}")

        batches_count = ImportBatch.objects.count()
        ImportBatch.objects.all().delete()
        print(f"  ✓ ImportBatch eliminados : {batches_count}")

    print("\n  Catálogo en blanco. Proveedor y Categoria intactos.")


run()
