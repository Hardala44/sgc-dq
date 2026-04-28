"""
inject_master_taxonomy.py
Wipes existing Producto/ProveedorOferta data and repopulates from the
curated expert master taxonomy.

Usage:
    cd backend
    python compras/scripts/inject_master_taxonomy.py
"""

import os
import sys
import urllib.parse
import unicodedata
import re

# ── Django setup ──────────────────────────────────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')

import django
django.setup()

from compras.models import Categoria, Proveedor, Producto, ProveedorOferta

# ── IMAGE_MAPPING ─────────────────────────────────────────────────────────────
# Sources:
#   _WC  → Wikimedia Commons Special:FilePath redirect (public domain / CC, CORS-free)
#           Each filename is unique → each physical dental line gets a distinct image.
#   Unsplash → images.unsplash.com direct CDN (CORS-free, free-to-use)
#   ''   → empty string → frontend renders the category icon fallback

_WC = "https://commons.wikimedia.org/wiki/Special:FilePath"

_I = {
    # ── Depósitos / Aparatología — 20 líneas físicas con imagen única ─────────
    # Unique Wikimedia filenames guarantee no two lines share the same URL.
    'composite':        f"{_WC}/Dental_composite.jpg?width=800",
    'bonding':          f"{_WC}/Dental_adhesive.jpg?width=800",
    'anestesia_loc':    f"{_WC}/Dental_anesthesia.jpg?width=800",
    'anestesia_inosea': f"{_WC}/Dental_syringe.jpg?width=800",
    'endodoncia':       f"{_WC}/Root_canal_treatment.jpg?width=800",
    'endodoncia_eq':    f"{_WC}/Endodontic_motor.jpg?width=800",
    'blanqueo':         f"{_WC}/Tooth_whitening.jpg?width=800",
    'higiene':          f"{_WC}/Dental_scaling.jpg?width=800",
    'ionomer':          f"{_WC}/Glass_ionomer_cement.jpg?width=800",
    'impresion':        f"{_WC}/Dental_impression.jpg?width=800",
    'instrumental':     f"{_WC}/Dental_instruments.jpg?width=800",
    'optica':           f"{_WC}/Dental_loupes.jpg?width=800",
    'airflow':          f"{_WC}/Dental_ultrasonic_scaler.jpg?width=800",
    'cadcam':           f"{_WC}/CAD-CAM_dental.jpg?width=800",
    'esterilizacion':   f"{_WC}/Dental_autoclave.jpg?width=800",
    'antimicrobiano':   f"{_WC}/Chlorhexidine.jpg?width=800",
    'barrera':          f"{_WC}/Medical_gloves.jpg?width=800",
    'fungible':         f"{_WC}/Dental_consumables.jpg?width=800",
    'sillon':           f"{_WC}/Dental_chair.jpg?width=800",
    'mobiliario':       f"{_WC}/Dental_office.jpg?width=800",

    # ── Implantología ─────────────────────────────────────────────────────────
    'implante':         f"{_WC}/Dental_implant.jpg?width=800",
    'pilar':            f"{_WC}/Dental_abutment.jpg?width=800",
    'biomaterial':      f"{_WC}/Bone_graft_material.jpg?width=800",
    'anest_qx':         f"{_WC}/Dental_local_anesthetic.jpg?width=800",
    'cirugia_guiada':   f"{_WC}/Dental_implant_surgery.jpg?width=800",
    'escaneado':        f"{_WC}/Intraoral_scanner.jpg?width=800",

    # ── Ortodoncia ────────────────────────────────────────────────────────────
    'brackets':         f"{_WC}/Dental_braces.jpg?width=800",
    'autoligado':       f"{_WC}/Self-ligating_brackets.jpg?width=800",
    'alineador':        f"{_WC}/Clear_aligners.jpg?width=800",
    'arcos_orto':       f"{_WC}/Orthodontic_wire.jpg?width=800",
    'retencion':        f"{_WC}/Dental_retainer.jpg?width=800",
    'fungible_orto':    f"{_WC}/Orthodontic_accessories.jpg?width=800",

    # ── Laboratorio ───────────────────────────────────────────────────────────
    'lab':              f"{_WC}/Dental_laboratory.jpg?width=800",
    'corona_diente':    f"{_WC}/Dental_crown.jpg?width=800",
    'corona_imp':       f"{_WC}/Implant_supported_crown.jpg?width=800",
    'protesis_rem':     f"{_WC}/Denture.jpg?width=800",
    'orto_lab':         f"{_WC}/Orthodontic_model.jpg?width=800",
    'ceramica':         f"{_WC}/Dental_ceramics.jpg?width=800",
    'acrilico_lab':     f"{_WC}/Dental_acrylic.jpg?width=800",

    # ── Radiología ────────────────────────────────────────────────────────────
    'rx_digital':       f"{_WC}/Dental_radiograph.jpg?width=800",
    'cbct':             f"{_WC}/Cone_beam_CT_scan.jpg?width=800",
    'radioproteccion':  f"{_WC}/Radiation_protection.jpg?width=800",
    'radiodiag':        f"{_WC}/Dental_panoramic_radiograph.jpg?width=800",

    # ── Servicios digitales / gestión (Unsplash — CORS-free, verificados) ─────
    'software':         'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    'citas_ia':         'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80',
    'comunicacion':     'https://images.unsplash.com/photo-1559526324-593bc073d938?auto=format&fit=crop&w=800&q=80',
    'encuesta':         'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&w=800&q=80',
    'marketing':        'https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=800&q=80',
    'cyber':            'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80',
    'monit_ia':         'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80',
    'genetica':         'https://images.unsplash.com/photo-1507120878965-54b2d3939a94?auto=format&fit=crop&w=800&q=80',

    # ── Servicios RR.HH. / Legal / Gestión (Unsplash) ────────────────────────
    'rrhh':             'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80',
    'prl':              'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80',
    'legal':            'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=800&q=80',
    'gestoria':         'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    'seguros':          'https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=800&q=80',
    'deuda':            'https://images.unsplash.com/photo-1554224154-26032ffc0d07?auto=format&fit=crop&w=800&q=80',

    # ── Financieras (Unsplash) ────────────────────────────────────────────────
    'financiacion':     'https://images.unsplash.com/photo-1601597111158-2fceff292cdc?auto=format&fit=crop&w=800&q=80',
    'multifinanciera':  'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=800&q=80',
    'finanzas_emp':     'https://images.unsplash.com/photo-1444653614773-995cb1ef9efa?auto=format&fit=crop&w=800&q=80',

    # ── Otros ─────────────────────────────────────────────────────────────────
    'dea':              f"{_WC}/Automated_external_defibrillator.jpg?width=800",
    'uniforme':         'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80',
    'aire':             'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80',
    'interiorismo':     'https://images.unsplash.com/photo-1497366412874-3415097a27c7?auto=format&fit=crop&w=800&q=80',
    'navidad':          'https://images.unsplash.com/photo-1549465045-6d9d13cd4b63?auto=format&fit=crop&w=800&q=80',
    'oficina':          'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',

    # '' → frontend renderiza el icono de fallback de la categoría
    'maletin':          '',   # no hay foto relevante para "maletín de reanimación"
}

# ── MASTER TAXONOMY ───────────────────────────────────────────────────────────
# Cada linea_producto tiene su propia clave en _I → imagen única y semánticamente correcta.

MASTER_TAXONOMY = [
    # 1. DEPÓSITOS Y APARATOLOGÍA  (20 líneas físicas, todas con imagen única)
    {"categoria": "Depósitos y Aparatología", "image_url": _I['composite'],
     "linea_producto": "Material de Composite y Resinas",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Broker Dental", "Axis Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['bonding'],
     "linea_producto": "Adhesivos y Bonding Dental",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Broker Dental", "Katia Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['anestesia_loc'],
     "linea_producto": "Anestésicos Locales (cartuchos, agujas)",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Broker Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['anestesia_inosea'],
     "linea_producto": "Sistemas de Anestesia Intraósea",
     "proveedores": ["Quicksleeper"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['endodoncia'],
     "linea_producto": "Material de Endodoncia",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Broker Dental", "Endovations"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['blanqueo'],
     "linea_producto": "Blanqueamiento Dental",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Dentaid"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['higiene'],
     "linea_producto": "Higiene y Profilaxis Clínica",
     "proveedores": ["EMS Dental", "Dentaid", "Henry Schein", "Proclinic"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['ionomer'],
     "linea_producto": "Material de Obturación y Ionómeros",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['impresion'],
     "linea_producto": "Materiales de Impresión (alginatos, siliconas)",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Broker Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['instrumental'],
     "linea_producto": "Instrumental Manual y Rotatorio",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Axis Dental", "Katia Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['optica'],
     "linea_producto": "Óptica Dental y Magnificación",
     "proveedores": ["Akura", "Henry Schein"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['airflow'],
     "linea_producto": "Aparatología de Profilaxis (Airflow, scaler)",
     "proveedores": ["EMS Dental", "Henry Schein", "Proclinic"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['cadcam'],
     "linea_producto": "Equipamiento CAD-CAM (escáner, fresadora)",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['rx_digital'],
     "linea_producto": "Radiología Digital (sensores, RVG, CBCT)",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['esterilizacion'],
     "linea_producto": "Desinfección y Esterilización",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Saniswiss"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['antimicrobiano'],
     "linea_producto": "Soluciones Antimicrobianas y Biocidas",
     "proveedores": ["Saniswiss", "Dentaid"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['barrera'],
     "linea_producto": "Material de Barrera (guantes, mascarillas)",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Broker Dental", "Axis Dental", "Katia Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['fungible'],
     "linea_producto": "Material Fungible General",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Broker Dental", "Katia Dental", "Axis Dental"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['sillon'],
     "linea_producto": "Sillones y Unidades Dentales",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Endovations"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['mobiliario'],
     "linea_producto": "Mobiliario Clínico",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental", "Endovations"]},

    {"categoria": "Depósitos y Aparatología", "image_url": _I['endodoncia_eq'],
     "linea_producto": "Equipamiento Especializado Endodoncia",
     "proveedores": ["Endovations"]},

    # 2. IMPLANTOLOGÍA
    {"categoria": "Implantología", "image_url": _I['implante'],
     "linea_producto": "Implantes Dentales",
     "proveedores": ["ZimVie", "Straumann", "IPD", "Inibsa", "Klockner"]},

    {"categoria": "Implantología", "image_url": _I['pilar'],
     "linea_producto": "Pilares Protéticos",
     "proveedores": ["ZimVie", "Straumann", "IPD", "Klockner"]},

    {"categoria": "Implantología", "image_url": _I['biomaterial'],
     "linea_producto": "Biomateriales de Regeneración Ósea",
     "proveedores": ["Botiss", "Klockner", "Straumann"]},

    {"categoria": "Implantología", "image_url": _I['anest_qx'],
     "linea_producto": "Anestésicos y Fungible Quirúrgico",
     "proveedores": ["Inibsa", "Henry Schein", "Proclinic"]},

    {"categoria": "Implantología", "image_url": _I['cirugia_guiada'],
     "linea_producto": "Planificación de Cirugía Guiada Digital",
     "proveedores": ["BiteRight"]},

    {"categoria": "Implantología", "image_url": _I['escaneado'],
     "linea_producto": "Corrección y Validación de Escaneado",
     "proveedores": ["IOSFIX"]},

    # 3. ORTODONCIA
    {"categoria": "Ortodoncia", "image_url": _I['brackets'],
     "linea_producto": "Brackets Metálicos y Cerámicos",
     "proveedores": ["Imperortho", "Forestadent", "Ormco", "Ortoarea"]},

    {"categoria": "Ortodoncia", "image_url": _I['autoligado'],
     "linea_producto": "Sistema de Brackets de Autoligado",
     "proveedores": ["Ormco", "Forestadent", "Imperortho"]},

    {"categoria": "Ortodoncia", "image_url": _I['alineador'],
     "linea_producto": "Alineadores Transparentes",
     "proveedores": ["Ormco", "DentalMonitoring"]},

    {"categoria": "Ortodoncia", "image_url": _I['arcos_orto'],
     "linea_producto": "Arcos, Tubos y Accesorios de Ortodoncia",
     "proveedores": ["Imperortho", "Forestadent", "Ortoarea"]},

    {"categoria": "Ortodoncia", "image_url": _I['retencion'],
     "linea_producto": "Retenciones y Contenciones",
     "proveedores": ["Ortoarea", "Imperortho"]},

    {"categoria": "Ortodoncia", "image_url": _I['monit_ia'],
     "linea_producto": "Monitorización Remota por IA",
     "proveedores": ["DentalMonitoring"]},

    {"categoria": "Ortodoncia", "image_url": _I['fungible_orto'],
     "linea_producto": "Material Fungible de Ortodoncia",
     "proveedores": ["Imperortho", "Ortoarea", "Forestadent"]},

    # 4. LABORATORIO
    {"categoria": "Laboratorio", "image_url": _I['corona_diente'],
     "linea_producto": "Prótesis Fija sobre Diente",
     "proveedores": ["Ceranium", "Mondental", "ConVaden"]},

    {"categoria": "Laboratorio", "image_url": _I['corona_imp'],
     "linea_producto": "Prótesis Fija sobre Implante",
     "proveedores": ["Ceranium", "Mondental", "ConVaden"]},

    {"categoria": "Laboratorio", "image_url": _I['protesis_rem'],
     "linea_producto": "Prótesis Removible",
     "proveedores": ["Mondental", "ConVaden"]},

    {"categoria": "Laboratorio", "image_url": _I['orto_lab'],
     "linea_producto": "Ortodoncia de Laboratorio",
     "proveedores": ["Mondental", "Ortoarea"]},

    {"categoria": "Laboratorio", "image_url": _I['ceramica'],
     "linea_producto": "Cerámica Dental y Materiales de Prótesis",
     "proveedores": ["Henry Schein", "Proclinic"]},

    {"categoria": "Laboratorio", "image_url": _I['acrilico_lab'],
     "linea_producto": "Composites y Acrílicos para Laboratorio",
     "proveedores": ["Henry Schein", "Proclinic", "DVD Dental"]},

    {"categoria": "Laboratorio", "image_url": _I['genetica'],
     "linea_producto": "Análisis Genéticos y Microbiológicos",
     "proveedores": ["Hussogenix"]},

    # 5. SERVICIOS
    {"categoria": "Servicios", "image_url": _I['software'],
     "linea_producto": "Software de Gestión Clínica (HIS/PMS)",
     "proveedores": ["Infomed"]},

    {"categoria": "Servicios", "image_url": _I['citas_ia'],
     "linea_producto": "Confirmación y Gestión de Citas por IA",
     "proveedores": ["Kokuai"]},

    {"categoria": "Servicios", "image_url": _I['comunicacion'],
     "linea_producto": "Comunicación Educativa con Pacientes",
     "proveedores": ["Digimevo"]},

    {"categoria": "Servicios", "image_url": _I['encuesta'],
     "linea_producto": "Encuestas de Satisfacción y Reputación Online",
     "proveedores": ["Astute Control"]},

    {"categoria": "Servicios", "image_url": _I['marketing'],
     "linea_producto": "Marketing Digital y Consultoría",
     "proveedores": ["Aesinergy"]},

    {"categoria": "Servicios", "image_url": _I['cyber'],
     "linea_producto": "Ciberseguridad y Centralita Cloud",
     "proveedores": ["Ciberseguridad"]},

    {"categoria": "Servicios", "image_url": _I['radioproteccion'],
     "linea_producto": "Protección Radiológica (UTPR, dosimetría)",
     "proveedores": ["Protección Radiológica"]},

    {"categoria": "Servicios", "image_url": _I['radiodiag'],
     "linea_producto": "Radiodiagnóstico y Estudios Radiológicos",
     "proveedores": ["Radmedica"]},

    {"categoria": "Servicios", "image_url": _I['rrhh'],
     "linea_producto": "Selección y Headhunting de Personal",
     "proveedores": ["Talent Salud"]},

    {"categoria": "Servicios", "image_url": _I['prl'],
     "linea_producto": "Prevención de Riesgos Laborales (PRL)",
     "proveedores": ["OTP"]},

    {"categoria": "Servicios", "image_url": _I['legal'],
     "linea_producto": "Asesoría Jurídica, Fiscal y Laboral",
     "proveedores": ["Roca Asociados", "Mediconsulting"]},

    {"categoria": "Servicios", "image_url": _I['gestoria'],
     "linea_producto": "Gestoría Especializada en Clínicas",
     "proveedores": ["VDOBLE"]},

    {"categoria": "Servicios", "image_url": _I['seguros'],
     "linea_producto": "Seguros de Clínica Dental",
     "proveedores": ["Martín y Cachón"]},

    {"categoria": "Servicios", "image_url": _I['deuda'],
     "linea_producto": "Recuperación de Deuda de Pacientes",
     "proveedores": ["IDH Platform"]},

    # 6. FINANCIERAS
    {"categoria": "Financieras", "image_url": _I['financiacion'],
     "linea_producto": "Financiación a Pacientes",
     "proveedores": ["Sabadell Consumer", "Kutxabank", "Nowon"]},

    {"categoria": "Financieras", "image_url": _I['multifinanciera'],
     "linea_producto": "Plataforma Multifinanciera",
     "proveedores": ["Nowon"]},

    {"categoria": "Financieras", "image_url": _I['finanzas_emp'],
     "linea_producto": "Financiación Empresarial para Clínicas",
     "proveedores": ["Kutxabank"]},

    # 7. OTROS
    {"categoria": "Otros", "image_url": _I['dea'],
     "linea_producto": "Desfibriladores (DEA/DESA)",
     "proveedores": ["Adiemed"]},

    {"categoria": "Otros", "image_url": _I['maletin'],
     "linea_producto": "Maletín de Reanimación / Emergencias",
     "proveedores": ["Maletín de Reanimación"]},

    {"categoria": "Otros", "image_url": _I['uniforme'],
     "linea_producto": "Uniformes y Ropa Laboral",
     "proveedores": ["Cherokee"]},

    {"categoria": "Otros", "image_url": _I['aire'],
     "linea_producto": "Purificación de Aire y Control Ambiental",
     "proveedores": ["Wellisair"]},

    {"categoria": "Otros", "image_url": _I['interiorismo'],
     "linea_producto": "Interiorismo y Diseño de Clínicas",
     "proveedores": ["Santacreu"]},

    {"categoria": "Otros", "image_url": _I['navidad'],
     "linea_producto": "Lotes y Cestas de Navidad",
     "proveedores": ["Sadival"]},

    {"categoria": "Otros", "image_url": _I['oficina'],
     "linea_producto": "Material de Oficina y Mobiliario",
     "proveedores": ["Bruneau"]},
]


# ── Helpers ───────────────────────────────────────────────────────────────────

def slugify(text):
    """ASCII slug for use as SKU."""
    text = unicodedata.normalize('NFKD', text).encode('ascii', 'ignore').decode('ascii')
    text = re.sub(r'[^\w\s-]', '', text).strip().lower()
    return re.sub(r'[\s_-]+', '-', text)[:100]


def build_url(proveedor, linea_producto):
    base = proveedor.url_catalogo or proveedor.url_web
    if not base:
        return ''
    base = base.rstrip('/')
    q = urllib.parse.quote(linea_producto, safe='')
    return f"{base}/search?q={q}"


# ── Main ──────────────────────────────────────────────────────────────────────

def run():
    # ── Wipe existing marketplace data ────────────────────────────────────────
    n_ofertas, _ = ProveedorOferta.objects.all().delete()
    n_productos, _ = Producto.objects.all().delete()
    print(f"Borrados: {n_productos} Producto(s), {n_ofertas} ProveedorOferta(s)")

    productos_creados = 0
    ofertas_creadas = 0
    warnings = []

    cat_cache = {}
    prov_cache = {}

    for entry in MASTER_TAXONOMY:
        cat_nombre = entry['categoria']
        linea = entry['linea_producto']
        image_url = entry.get('image_url', '')
        prov_nombres = entry['proveedores']

        # ── 1. Categoria ──────────────────────────────────────────────────
        if cat_nombre not in cat_cache:
            try:
                cat = Categoria.objects.get(nombre__iexact=cat_nombre)
            except Categoria.DoesNotExist:
                cat = Categoria.objects.create(nombre=cat_nombre)
                print(f"  [CAT] Creada categoría: {cat_nombre}")
            cat_cache[cat_nombre] = cat
        cat = cat_cache[cat_nombre]

        # ── 2. Producto ────────────────────────────────────────────────────
        producto, created = Producto.objects.get_or_create(
            nombre=linea,
            marca='',
            defaults={
                'linea_producto': linea,
                'categoria': cat,
                'imagen_url': image_url,
                'activo': True,
            }
        )
        if created:
            productos_creados += 1
        else:
            update_fields = []
            if producto.categoria_id != cat.pk:
                producto.categoria = cat
                update_fields.append('categoria')
            if producto.imagen_url != image_url:
                producto.imagen_url = image_url
                update_fields.append('imagen_url')
            if update_fields:
                producto.save(update_fields=update_fields)

        # ── 3. Proveedores ────────────────────────────────────────────────
        for prov_nombre in prov_nombres:
            if prov_nombre not in prov_cache:
                matches = Proveedor.objects.filter(nombre__icontains=prov_nombre)
                if matches.count() == 1:
                    prov_cache[prov_nombre] = matches.first()
                elif matches.count() > 1:
                    prov_cache[prov_nombre] = min(matches, key=lambda p: len(p.nombre))
                    warnings.append(
                        f"WARN: '{prov_nombre}' → múltiples coincidencias, "
                        f"usando '{prov_cache[prov_nombre].nombre}'"
                    )
                else:
                    prov_cache[prov_nombre] = None
                    warnings.append(f"WARN: Proveedor no encontrado en BD: '{prov_nombre}'")

            proveedor = prov_cache[prov_nombre]
            if proveedor is None:
                continue

            sku = f"{slugify(proveedor.nombre)}__{slugify(linea)}"
            url_compra = build_url(proveedor, linea)

            _, oferta_created = ProveedorOferta.objects.get_or_create(
                proveedor=proveedor,
                sku=sku,
                defaults={
                    'producto': producto,
                    'precio': 0.00,
                    'url_compra': url_compra,
                    'stock_status': 'unknown',
                }
            )
            if oferta_created:
                ofertas_creadas += 1

    # ── Summary ───────────────────────────────────────────────────────────────
    productos_con_imagen = Producto.objects.exclude(imagen_url='').count()

    print()
    if warnings:
        print("─── Avisos ───────────────────────────────────────")
        for w in warnings:
            print(f"  {w}")
        print()

    print("─── Resumen ──────────────────────────────────────")
    print(f"  Productos creados   : {productos_creados}")
    print(f"  Con imagen URL      : {productos_con_imagen}")
    print(f"  Ofertas creadas     : {ofertas_creadas}")
    print(f"  Avisos              : {len(warnings)}")
    print("──────────────────────────────────────────────────")


if __name__ == '__main__':
    run()
