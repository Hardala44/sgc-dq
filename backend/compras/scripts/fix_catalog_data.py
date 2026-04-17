import os
import sys
import django

# Setup django
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from compras.models import Producto, Categoria
from django.db.models import F

def run_rescue():
    print("--- Iniciando Misión de Rescate del Catálogo ---")
    
    # 1. Poblar linea_producto si está vacío
    orphans_linea = Producto.objects.filter(linea_producto="")
    print(f"Poblando linea_producto para {orphans_linea.count()} productos...")
    orphans_linea.update(linea_producto=F('nombre'))
    
    # 2. Mapeo inteligente de categorías por keywords
    # Definimos los IDs de las nuevas categorías (obtenidos previamente)
    MAPPING = {
        'Implantología': 71,   # Palabra clave -> ID
        'Laboratorio': 69,
        'Ortodoncia': 72,
        'Depósitos y Aparatología': 73,
        'Servicios': 74,
        'Gestión y marketing': 75,
        'Software': 76,
        'Radiología': 77,
        'Gestoría': 78,
        'Otros': 79
    }
    
    KEYWORDS = {
        71: ['implante', 'tornillo', 'aditamento', 'protesis', 'klockner', 'zimvie', 'ipd'],
        72: ['bracket', 'ortodoncia', 'arco', 'mbt', 'spark', 'ormco'],
        69: ['guante', 'nitrilo', 'mascarilla', 'composite', 'jeringa', 'blanqueador', 'filtek', 'z250'],
        73: ['fresa', 'turbina', 'pieza de mano', 'autoclave', 'instrumento', 'espejo'],
        76: ['software', 'gestion', 'ciberseguridad', 'infomed', 'gesden'],
        75: ['marketing', 'publicidad', 'web', 'seo'],
    }
    
    print("Iniciando re-categorización por keywords...")
    for cat_id, keywords in KEYWORDS.items():
        try:
            category = Categoria.objects.get(id=cat_id)
            for kw in keywords:
                matches = Producto.objects.filter(nombre__icontains=kw)
                if matches.exists():
                    print(f"  Mapping {matches.count()} items containing '{kw}' to {category.nombre}")
                    matches.update(categoria=category)
        except Categoria.DoesNotExist:
            print(f"  Error: Categoria ID {cat_id} no encontrada.")

    # 3. Fallback final a 'Otros' para cualquier producto que haya quedado fuera de los IDs 69-79
    valid_ids = list(Categoria.objects.values_list('id', flat=True))
    Otros = Categoria.objects.get(nombre='Otros')
    leftovers = Producto.objects.exclude(categoria_id__in=valid_ids)
    if leftovers.exists():
        print(f"Asignando fallback 'Otros' a {leftovers.count()} productos restantes...")
        leftovers.update(categoria=Otros)
        
    print("--- Rescate Completado con Éxito ---")

if __name__ == "__main__":
    run_rescue()
