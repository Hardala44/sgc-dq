"""
fix_product_provider_mapping.py
================================
Creates correct ProveedorOferta records based on dental industry knowledge.
Each product is mapped to the providers that realistically sell it.

Run from backend/ directory:
    python fix_product_provider_mapping.py
"""

import os
import sys
import django
from urllib.parse import quote

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from compras.models import Producto, Proveedor, ProveedorOferta

# ---------------------------------------------------------------------------
# Mapping: product name (exact) → list of provider nombres
# ---------------------------------------------------------------------------

MAPPING = {

    # ── DEPÓSITOS Y APARATOLOGÍA ─────────────────────────────────────────────

    # Adhesives / Composites / Resins
    'Adhesivo Universal de 7ª Generación':      ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental', 'Katia Dental'],
    'Adhesivo de Grabado Total (Total Etch)':   ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental', 'Katia Dental'],
    'Composite Fluido (flowable)':              ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental', 'Katia Dental'],
    'Composite Fotopolimerizable Universal':    ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental', 'Katia Dental'],
    'Selladores de Fisuras':                    ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Ácido Fosfórico al 37%':                  ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],

    # Cements / Restoratives
    'Cemento Provisional (Temp-Bond, Freegenol)': ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental', 'Katia Dental'],
    'Cemento de Fosfato de Zinc':               ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Cemento de Ionómero de Vidrio':            ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental', 'Katia Dental'],
    'Cemento de Policarboxilato':               ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Cemento de Resina Definitivo (dual)':      ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental', 'Katia Dental'],
    'Dique de Goma y Accesorios':              ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Grampas para Dique de Goma':              ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Matrices Metálicas Sectorizadas':          ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Matrices de Celuloide (anteriores)':       ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Cuñas de Madera y Plástico':              ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Yeso Dental Tipo III y IV':               ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],

    # Anesthesia
    'Agujas de Anestesia Cortas y Largas':      ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Inibsa', 'Adiemed'],
    'Anestesia Tópica (spray y gel)':           ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Inibsa'],
    'Cartuchos de Anestesia Local (Mepivacaína, Articaína)': ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Inibsa'],
    'Jeringa Carpule de Anestesia':             ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Adiemed'],

    # Endodontics
    'Conos de Gutapercha':                      ['Henry Schein', 'Proclinic', 'DVD Dental', 'Endovations'],
    'Irrigantes de Endodoncia (NaOCl, EDTA)':  ['Henry Schein', 'Proclinic', 'DVD Dental', 'Endovations'],
    'Limas K y H de Acero Inoxidable':         ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Endovations'],
    'Limas de NiTi Rotatorias (endodoncia)':   ['Henry Schein', 'Proclinic', 'DVD Dental', 'Endovations'],
    'Puntas de Papel para Endodoncia':          ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Endovations'],

    # Sterilisation / Disinfection
    'Autoclave Clase B':                        ['Henry Schein', 'Proclinic', 'Saniswiss', 'BMG - Dentalhitec'],
    'Bolsas de Esterilización (Pouches)':      ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Saniswiss'],
    'Desinfectante de Alto Nivel (glutaraldehído/OPA)': ['Henry Schein', 'Proclinic', 'Saniswiss'],
    'Desinfectante de Impresiones':             ['Henry Schein', 'Proclinic', 'DVD Dental', 'Saniswiss'],
    'Desinfectante de Superficies (spray/toallitas)': ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Saniswiss'],
    'Detergente Enzimático para Instrumentos': ['Henry Schein', 'Proclinic', 'Saniswiss'],
    'Indicadores Biológicos (esporas)':        ['Henry Schein', 'Proclinic', 'Saniswiss'],
    'Indicadores Químicos de Esterilización':  ['Henry Schein', 'Proclinic', 'DVD Dental', 'Saniswiss'],
    'Rolls/Rollos de Esterilización':          ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Saniswiss'],

    # Profilaxis
    'Copas y Cepillos de Profilaxis':          ['Henry Schein', 'Proclinic', 'DVD Dental', 'EMS', 'Dentaid'],
    'Pasta Profiláctica':                       ['Henry Schein', 'Proclinic', 'DVD Dental', 'EMS', 'Dentaid'],
    'Pasta Dentífrica Profiláctica':            ['Henry Schein', 'Proclinic', 'Dentaid'],
    'Polvo Airflow (eritritol/bicarbonato)':   ['EMS', 'Henry Schein', 'Proclinic'],
    'Puntas de Ultrasonidos':                   ['Henry Schein', 'Proclinic', 'DVD Dental', 'EMS'],
    'Reveladores de Placa Bacteriana':          ['Henry Schein', 'Proclinic', 'Dentaid'],

    # Blanqueamiento
    'Cubetas de Blanqueamiento':                ['Henry Schein', 'Proclinic', 'DVD Dental', 'Dentaid'],
    'Kit de Blanqueamiento Domiciliario':       ['Henry Schein', 'Proclinic', 'DVD Dental', 'Dentaid'],
    'Kit de Blanqueamiento en Consulta (H2O2 35-40%)': ['Henry Schein', 'Proclinic', 'DVD Dental', 'Dentaid'],

    # PPE / Single-use hygiene
    'Baberos Dentales':                         ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Sadival', 'Bruneau', 'Hyssogenix'],
    'Batas Desechables':                        ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Hyssogenix', 'Bruneau'],
    'Calzas y Cubrezapatos':                   ['Henry Schein', 'Proclinic', 'DVD Dental', 'Hyssogenix', 'Bruneau'],
    'Eyectores de Saliva Desechables':         ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Sadival'],
    'Gasas Estériles':                          ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Sadival'],
    'Gel Hidroalcohólico':                      ['Henry Schein', 'Proclinic', 'DVD Dental', 'Hyssogenix', 'Sadival', 'Bruneau'],
    'Gorros Desechables':                       ['Henry Schein', 'Proclinic', 'DVD Dental', 'Hyssogenix', 'Bruneau'],
    'Guantes Estériles Quirúrgicos':           ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Hyssogenix'],
    'Guantes de Látex':                         ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Hyssogenix', 'Sadival'],
    'Guantes de Nitrilo':                       ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Hyssogenix', 'Sadival'],
    'Guantes de Vinilo':                        ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Hyssogenix'],
    'Jabón Antiséptico con Clorhexidina':      ['Henry Schein', 'Proclinic', 'DVD Dental', 'Dentaid', 'Sadival'],
    'Mascarillas FFP2/N95':                    ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Hyssogenix'],
    'Mascarillas Quirúrgicas IIR':             ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Hyssogenix', 'Sadival'],
    'Pellets de Algodón':                       ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Sadival'],
    'Rollos de Algodón':                        ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Sadival'],
    'Servilletas y Rollos de Papel':           ['Henry Schein', 'Proclinic', 'DVD Dental', 'Sadival', 'Bruneau'],
    'Vasos Desechables para Enjuague':         ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Sadival', 'Bruneau'],
    'Puntas de Aerosol (puntas de spray)':     ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Sadival'],
    'Protectores Oculares / Gafas Paciente':   ['Henry Schein', 'Proclinic', 'DVD Dental', 'Sadival'],

    # Uniforms / Clothing
    'Uniformes y Pijamas Clínicos':            ['Global Uniforms (Cherokee)', 'RoBenitez', 'Sadival'],
    'Zuecos Clínicos':                          ['Global Uniforms (Cherokee)', 'RoBenitez', 'Sadival'],

    # Patient gift items
    'Cepillos Dentales de Regalo (paciente)':  ['Sadival', 'Bruneau', 'Dentaid'],
    'Hilo Dental y Floss para Pacientes':      ['Sadival', 'Bruneau', 'Dentaid'],
    'Colutorios de Clorhexidina':              ['Henry Schein', 'Proclinic', 'Dentaid', 'Sadival'],
    'Barniz de Flúor':                          ['Henry Schein', 'Proclinic', 'DVD Dental', 'Dentaid'],

    # Impression materials
    'Alginato de Impresión':                    ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Bandejas de Impresión (metálicas y plásticas)': ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Poliéter de Impresión':                   ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Silicona de Adición (PVS) Pesada + Fluida': ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Silicona de Condensación':                 ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],

    # Small instruments / burs
    'Fresas de Carburo Tungsteno':              ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Fresas de Diamante':                       ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Discos de Carborundum y Diamante':        ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Gomas y Puntas de Pulido':                ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Amalgamador / Mezclador de Cápsulas':     ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Jeringuillas de Irrigación (10ml/20ml)':  ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Sadival'],

    # Surgery / extraction
    'Agujas de Sutura':                         ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Cánulas de Aspiración Quirúrgica':        ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Celulosa Oxidada Hemostática':            ['Henry Schein', 'Proclinic', 'DVD Dental'],
    'Elevadores y Botadores':                   ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Esponjas Hemostáticas de Colágeno':       ['Henry Schein', 'Proclinic', 'DVD Dental'],
    'Fórceps de Extracción':                   ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Hilo de Sutura No Reabsorbible (seda/nylon)': ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Hilo de Sutura Reabsorbible':             ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Legras y Periostótomos':                  ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental', 'Axis Dental'],
    'Membranas de Regeneración Ósea (colágeno/PTFE)': ['Henry Schein', 'Proclinic', 'DVD Dental'],
    'Porta-Agujas y Tijeras de Sutura':        ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],
    'Retractores y Espátulas Quirúrgicas':     ['Henry Schein', 'Proclinic', 'DVD Dental', 'Broker Dental'],

    # Dental equipment
    'Compresor Dental':                         ['Henry Schein', 'Proclinic', 'BMG - Dentalhitec'],
    'Lámpara de Fotopolimerización LED':       ['Henry Schein', 'Proclinic', 'DVD Dental', 'BMG - Dentalhitec'],
    'Micromotor y Contraángulo':               ['Henry Schein', 'Proclinic', 'DVD Dental', 'BMG - Dentalhitec'],
    'Sillón Dental Completo':                   ['Henry Schein', 'Proclinic', 'BMG - Dentalhitec'],
    'Turbina de Alta Velocidad':               ['Henry Schein', 'Proclinic', 'DVD Dental', 'BMG - Dentalhitec'],
    'Ultrasonidos (scaler piezoeléctrico)':    ['Henry Schein', 'Proclinic', 'DVD Dental', 'EMS'],

    # Radiology equipment
    'Aparato de Radiología Periapical Digital': ['Henry Schein', 'Proclinic', 'BMG - Dentalhitec', 'Akura'],
    'Equipo de Rayos X Periapical (brazo)':    ['Henry Schein', 'Proclinic', 'BMG - Dentalhitec', 'Akura'],

    # ── IMPLANTOLOGÍA ────────────────────────────────────────────────────────

    'Hueso Bovino Deproteinizado (Bio-Oss tipo)': ['BOTISS', 'Straumann', 'Henry Schein'],
    'Hueso Sintético (sustituto óseo)':         ['BOTISS', 'Straumann'],
    'Implantes Unitarios (distintas marcas)':   ['Straumann', 'ZimVie', 'IPD'],
    'Pilares Protéticos Estándar':              ['Straumann', 'ZimVie', 'IPD'],
    'Pilares de Cicatrización (Healing Abutments)': ['Straumann', 'ZimVie', 'IPD'],
    'Plasma Rico en Factores de Crecimiento (PRGF/PRF)': ['Henry Schein', 'Inibsa'],
    'Portaimplantes y Kit de Cirugía':          ['Straumann', 'ZimVie', 'IPD'],
    'Tornillos de Implante (Fixture Screws)':  ['Straumann', 'ZimVie', 'IPD'],

    # ── LABORATORIO ──────────────────────────────────────────────────────────

    'Ceras de Modelado Dental':                 ['Ceranium', 'ConVadent', 'Mondental'],
    'Discos de Zirconio y Composite CAD/CAM':  ['Ceranium', 'ConVadent', 'Mondental'],
    'Material de Revestimiento (fosfato)':      ['Ceranium', 'ConVadent', 'Mondental'],
    'Resina Acrílica de Laboratorio (PMMA)':   ['Ceranium', 'ConVadent', 'Mondental'],
    'Yeso Piedra Tipo IV (laboratorio)':        ['Ceranium', 'ConVadent', 'Mondental'],

    # ── ORTODONCIA ───────────────────────────────────────────────────────────

    'Bandas Molares con Tubo':                  ['Imperortho', 'Forestadent', 'Ortoarea'],
    'Cera para Ortodoncia':                     ['Imperortho', 'Forestadent', 'Ortoarea', 'Sadival'],
    'Elásticos Intermaxilares':                 ['Imperortho', 'Forestadent', 'Ortoarea'],
    'Ligaduras Elásticas de Colores':          ['Imperortho', 'Forestadent', 'Ortoarea'],
    'Placas Base y Ceras de Articulación':     ['Imperortho', 'Forestadent', 'Ortoarea'],
    'Separadores Elásticos y Metálicos':       ['Imperortho', 'Forestadent', 'Ortoarea'],

    # ── RADIOLOGÍA UTPR Y DOSIMETRÍA ─────────────────────────────────────────

    'Dosímetros de Radiación Personal':         ['IGPR', 'Radmedica'],
    'Pantallas Plomadas y EPIs Radiológicos':  ['Radmedica', 'Hyssogenix'],
    'Película Radiográfica Dental':             ['Henry Schein', 'Proclinic', 'BMG - Dentalhitec', 'Akura'],
    'Soporte para Radiografía (posicionador)': ['Henry Schein', 'Proclinic', 'BMG - Dentalhitec', 'Akura'],
}


# ---------------------------------------------------------------------------
# Helper: build search URL for a provider given a product name
# ---------------------------------------------------------------------------

SEARCH_URL_TEMPLATES = {
    'Henry Schein':        'https://www.henryschein.es/search?q={q}',
    'Proclinic':           'https://www.proclinic.es/search?q={q}',
    'DVD Dental':          'https://www.dvd-dental.com/search?q={q}',
    'Broker Dental':       'https://www.brokerdental.es/search?q={q}',
    'Axis Dental':         'https://www.axis-dental.es/search?q={q}',
    'Katia Dental':        'https://www.katiadental.com/search?q={q}',
    'EMS':                 'https://www.ems-dental.com/search?q={q}',
    'Dentaid':             'https://www.dentaid.es/search?q={q}',
    'Saniswiss':           'https://saniswiss.es/search?q={q}',
    'Sadival':             'https://sadival.com/search?q={q}',
    'Bruneau':             'https://www.bruneau.es/search?q={q}',
    'Inibsa':              'https://www.inibsa.com/search?q={q}',
    'Endovations':         'https://endovations.es/search?q={q}',
    'Straumann':           'https://www.straumann.com/es/es/dental-professionals/products.html',
    'ZimVie':              'https://www.zimvie.com',
    'BOTISS':              'https://botiss.com',
    'IPD':                 'https://ipd2004.com',
    'Ceranium':            'https://laboratorioceranium.com',
    'ConVadent':           'https://convadent.com',
    'Mondental':           'https://corusdental.com',
    'Imperortho':          'https://imperortho.com/search?q={q}',
    'Forestadent':         'https://www.forestadent.com',
    'Ortoarea':            'https://ortoarea.com',
    'BMG - Dentalhitec':   'https://bmggrup.com',
    'Akura':               'https://akura-medical.com',
    'Global Uniforms (Cherokee)': 'https://globaluniforms.es/search?q={q}',
    'RoBenitez':           'https://gmail.com',
    'Hyssogenix':          'https://hyssogenix.com',
    'IGPR':                '',
    'Radmedica':           'https://radmedica.net',
    'Adiemed':             'https://adiemed.com',
}


def build_url(proveedor_nombre: str, producto_nombre: str) -> str:
    template = SEARCH_URL_TEMPLATES.get(proveedor_nombre, '')
    if not template:
        return ''
    if '{q}' in template:
        return template.format(q=quote(producto_nombre))
    return template


def slugify(text: str) -> str:
    import unicodedata
    text = unicodedata.normalize('NFKD', text)
    text = text.encode('ascii', 'ignore').decode('ascii')
    text = text.lower()
    import re
    text = re.sub(r'[^a-z0-9]+', '-', text)
    return text.strip('-')


# ---------------------------------------------------------------------------
# Main: create ProveedorOferta records
# ---------------------------------------------------------------------------

def run():
    # Build lookup caches
    proveedores = {p.nombre: p for p in Proveedor.objects.filter(activo=True)}
    productos   = {p.nombre: p for p in Producto.objects.filter(activo=True)}

    created = 0
    skipped = 0
    missing_prov = set()
    missing_prod = set()

    for product_nombre, prov_nombres in MAPPING.items():
        producto = productos.get(product_nombre)
        if not producto:
            missing_prod.add(product_nombre)
            continue

        for prov_nombre in prov_nombres:
            proveedor = proveedores.get(prov_nombre)
            if not proveedor:
                missing_prov.add(prov_nombre)
                continue

            sku = f'{slugify(prov_nombre)}__{slugify(product_nombre)}'
            url = build_url(prov_nombre, product_nombre)

            obj, was_created = ProveedorOferta.objects.get_or_create(
                proveedor=proveedor,
                sku=sku,
                defaults={
                    'producto': producto,
                    'precio': 0.00,
                    'url_compra': url,
                    'stock_status': 'unknown',
                }
            )
            if was_created:
                created += 1
                print(f'  + {prov_nombre} -> {product_nombre}')
            else:
                skipped += 1

    print()
    print(f'Done. Created: {created} | Already existed: {skipped}')
    if missing_prod:
        print(f'\nProducts NOT FOUND in DB ({len(missing_prod)}):')
        for n in sorted(missing_prod):
            print(f'  - {n}')
    if missing_prov:
        print(f'\nProviders NOT FOUND in DB ({len(missing_prov)}):')
        for n in sorted(missing_prov):
            print(f'  - {n}')


if __name__ == '__main__':
    run()
