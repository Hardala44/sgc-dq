"""
run_pilot_ingestion.py
Ingest the pilot scraper JSON payload into the Marketplace DB.
"""
import os, sys, django, json
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from compras.views import _resolve_categoria, _resolve_proveedor
from compras.models import Producto, ProveedorOferta
from django.db import transaction
from django.db.models import Min, Count

PAYLOAD_PATH = os.path.join(os.path.dirname(__file__), '..', 'pilot_payload.json')

with open(PAYLOAD_PATH, encoding='utf-8') as f:
    items = json.load(f)

print(f'Ingesting {len(items)} items from pilot scraper...')
print()

created_count = 0
updated_count = 0
errors = []

with transaction.atomic():
    for idx, item in enumerate(items):
        proveedor = _resolve_proveedor(item)
        categoria = _resolve_categoria(item)

        if not proveedor:
            msg = f"Could not resolve proveedor: {item.get('proveedor_nombre')}"
            print(f"  [SKIP idx={idx}] {msg}")
            errors.append({'idx': idx, 'error': msg})
            continue

        if not categoria:
            msg = f"Could not resolve categoria: {item.get('categoria_name')}"
            print(f"  [SKIP idx={idx}] {msg}")
            errors.append({'idx': idx, 'error': msg})
            continue

        sku = item.get('sku', '').strip()
        nombre = item.get('nombre', '').strip()
        marca = item.get('marca', '').strip()
        
        # Condition 2: Use linea_producto for grouping. 
        # For existing data rescue, we use the name as linea_producto.
        producto, prod_created = Producto.objects.get_or_create(
            nombre=nombre,
            marca=marca,
            defaults={
                'linea_producto': nombre, # Populating the new field
                'categoria': categoria,
                'descripcion': item.get('descripcion', ''),
                'imagen_url': item.get('imagen_url', ''),
            }
        )
        
        if not prod_created and not producto.linea_producto:
            producto.linea_producto = nombre
            producto.save(update_fields=['linea_producto'])

        oferta, oferta_created = ProveedorOferta.objects.update_or_create(
            proveedor=proveedor,
            sku=sku,
            defaults={
                'producto': producto,
                'precio': item.get('precio', 0),
                'url_compra': item.get('url_compra', ''),
                'stock_status': item.get('stock_status', 'unknown'),
            }
        )

        action = 'CREATED' if oferta_created else 'UPDATED'
        if oferta_created:
            created_count += 1
        else:
            updated_count += 1

        print(f"  [{action}] {nombre} [{marca}] -> {proveedor.nombre} @ {item.get('precio')}EUR | cat={categoria.nombre}")

print()
print(f"Done: {created_count} created, {updated_count} updated, {len(errors)} errors")
print()
print("=== Final Marketplace state ===")
qs = (
    Producto.objects.filter(activo=True)
    .annotate(
        min_price=Min('ofertas__precio'),
        supplier_count=Count('ofertas__proveedor', distinct=True),
    )
    .select_related('categoria')
    .order_by('categoria__nombre', 'nombre')
)
for p in qs:
    print(f"  [{p.categoria.nombre}] {p.nombre} ({p.marca}) | from {p.min_price}EUR | {p.supplier_count} suppliers")
