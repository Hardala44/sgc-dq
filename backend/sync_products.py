import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from compras.models import ProveedorOferta, Producto, Proveedor

def sync():
    ofertas = ProveedorOferta.objects.all()
    productos = Producto.objects.all()
    
    linked_count = 0
    # Try to link existing ProveedorOfertas to Productos based on linea_producto or nombre
    for oferta in ofertas:
        # We need a reference. The issue description implies that we should match existing ofertas to new products.
        # It's possible the oferta is already linked to A product, but we want it linked to the RIGHT product.
        # Since ProveedorOferta might have a name from somewhere else? Wait, ProveedorOferta doesn't have a name.
        # It has sku and a ForeignKey to Producto.
        # If it's already linked to a Producto, maybe its current product has a name we can match against the new catalog.
        
        # Let's see if we can find a matching product by name or linea_producto:
        old_prod_name = oferta.producto.nombre
        old_prod_linea = oferta.producto.linea_producto
        
        matching_prod = None
        if old_prod_linea:
            matching_prod = Producto.objects.filter(linea_producto__iexact=old_prod_linea).first()
        if not matching_prod:
            matching_prod = Producto.objects.filter(nombre__iexact=old_prod_name).first()
            
        if matching_prod and matching_prod.id != oferta.producto_id:
            oferta.producto = matching_prod
            oferta.save()
            linked_count += 1
            
    mock_prov1 = Proveedor.objects.filter(nombre__icontains='Henry Schein').first()
    mock_prov2 = Proveedor.objects.filter(nombre__icontains='Proclinic').first()
    
    if not mock_prov1:
        mock_prov1 = Proveedor.objects.first()
    
    if not mock_prov2:
        mock_prov2 = Proveedor.objects.last()

    created_count = 0
    for prod in productos:
        if not prod.ofertas.exists():
            if mock_prov1:
                ProveedorOferta.objects.get_or_create(
                    producto=prod,
                    proveedor=mock_prov1,
                    sku=f"MOCK-{prod.id}-A",
                    defaults={
                        'precio': 15.00,
                        'url_compra': 'https://example.com/mock',
                        'stock_status': 'in_stock'
                    }
                )
                created_count += 1
            if mock_prov2 and prod.id % 2 == 0:
                ProveedorOferta.objects.get_or_create(
                    producto=prod,
                    proveedor=mock_prov2,
                    sku=f"MOCK-{prod.id}-B",
                    defaults={
                        'precio': 12.00,
                        'url_compra': 'https://example.com/mock',
                        'stock_status': 'in_stock'
                    }
                )

    print(f"Sync complete. Re-linked {linked_count} existing offers. Created mock offers for {created_count} products.")

if __name__ == '__main__':
    sync()
