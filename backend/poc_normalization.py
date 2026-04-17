import os
import django
import sys
from collections import defaultdict

# Setup Django environment
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'backend')))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "sgcdq_project.settings")
django.setup()

from compras.models import Producto, ProveedorOferta
import difflib

def analyze_catalog():
    print("--- Priority 1: Exact SKU Matches ---")
    # Get all pairs of (sku, product_id)
    ofertas = ProveedorOferta.objects.select_related('producto').all()
    
    sku_map = defaultdict(set)
    for o in ofertas:
        if o.sku:
            sku_map[o.sku].add(o.producto.id)
            
    products_to_merge_by_sku = 0
    sku_groups_to_merge = 0
    
    for sku, product_ids in sku_map.items():
        if len(product_ids) > 1:
            sku_groups_to_merge += 1
            products_to_merge_by_sku += len(product_ids) - 1
            print(f"SKU {sku} is shared by {len(product_ids)} different Products. (IDs: {product_ids})")
            
    print(f"\nResult P1: {sku_groups_to_merge} SKU groups found, meaning {products_to_merge_by_sku} redundant products would be merged.")

    print("\n--- Priority 2: Fuzzy Matches (Similar Name + Same Brand) ---")
    # Group products by brand
    products = Producto.objects.all()
    brand_map = defaultdict(list)
    for p in products:
        brand = p.marca.strip().lower() if p.marca else ""
        if brand:  # Only compare if they share a brand
            brand_map[brand].append(p)
            
    fuzzy_matches_found = set()
    for brand, prods in brand_map.items():
        if len(prods) > 1:
            # O(N^2) comparison within same brand
            for i in range(len(prods)):
                for j in range(i + 1, len(prods)):
                    p1 = prods[i]
                    p2 = prods[j]
                    similarity = difflib.SequenceMatcher(None, p1.nombre.lower(), p2.nombre.lower()).ratio()
                    if similarity > 0.8:
                        print(f"Fuzzy match in brand '{brand}': '{p1.nombre}' (ID: {p1.id}) <--> '{p2.nombre}' (ID: {p2.id}) | Sim: {similarity:.2f}")
                        fuzzy_matches_found.add(p1.id)
                        fuzzy_matches_found.add(p2.id)

    print(f"\nResult P2: {len(fuzzy_matches_found)} products flagged for review due to fuzzy matches.")
    
if __name__ == '__main__':
    analyze_catalog()
