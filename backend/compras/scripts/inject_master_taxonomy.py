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
    # 1. DEPÓSITOS Y APARATOLOGÍA
    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['composite'],
     "linea_producto": "Material de Composite y Resinas",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "BROKER", "AXIS"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['bonding'],
     "linea_producto": "Adhesivos y Bonding Dental",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "BROKER", "KATIA"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['anestesia_loc'],
     "linea_producto": "Anestésicos Locales (cartuchos, agujas)",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "BROKER"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['anestesia_inosea'],
     "linea_producto": "Sistemas de Anestesia Intraósea",
     "proveedores": ["ADIEMED"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['endodoncia'],
     "linea_producto": "Material de Endodoncia",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "BROKER", "ENDOVATIONS"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['blanqueo'],
     "linea_producto": "Blanqueamiento Dental",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "DENTAID"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['higiene'],
     "linea_producto": "Higiene y Profilaxis Clínica",
     "proveedores": ["EMS", "DENTAID", "HENRY SCHEIN", "PROCLINIC"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['ionomer'],
     "linea_producto": "Material de Obturación y Ionómeros",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['impresion'],
     "linea_producto": "Materiales de Impresión (alginatos, siliconas)",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "BROKER"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['instrumental'],
     "linea_producto": "Instrumental Manual y Rotatorio",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "AXIS", "KATIA"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['optica'],
     "linea_producto": "Óptica Dental y Magnificación",
     "proveedores": ["AKURA", "HENRY SCHEIN"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['airflow'],
     "linea_producto": "Aparatología de Profilaxis (Airflow, scaler)",
     "proveedores": ["EMS", "HENRY SCHEIN", "PROCLINIC"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['cadcam'],
     "linea_producto": "Equipamiento CAD-CAM (escáner, fresadora)",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['rx_digital'],
     "linea_producto": "Radiología Digital (sensores, RVG, CBCT)",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['esterilizacion'],
     "linea_producto": "Desinfección y Esterilización",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "SANISWISS"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['antimicrobiano'],
     "linea_producto": "Soluciones Antimicrobianas y Biocidas",
     "proveedores": ["SANISWISS", "DENTAID"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['barrera'],
     "linea_producto": "Material de Barrera (guantes, mascarillas)",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "BROKER", "AXIS", "KATIA"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['fungible'],
     "linea_producto": "Material Fungible General",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "BROKER", "KATIA", "AXIS"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['sillon'],
     "linea_producto": "Sillones y Unidades Dentales",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "ENDOVATIONS"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['mobiliario'],
     "linea_producto": "Mobiliario Clínico",
     "proveedores": ["HENRY SCHEIN", "PROCLINIC", "DVD", "ENDOVATIONS"]},

    {"categoria_raiz": "Depósitos y Aparatología", "subcategoria": None, "image_url": _I['endodoncia_eq'],
     "linea_producto": "Equipamiento Especializado Endodoncia",
     "proveedores": ["ENDOVATIONS"]},

    # 2. IMPLANTOLOGÍA
    {"categoria_raiz": "Implantología", "subcategoria": None, "image_url": _I['implante'],
     "linea_producto": "Implantes Dentales",
     "proveedores": ["ZIMMER", "STRAUMANN", "IPD", "INIBSA", "KLOCKNER"]},

    {"categoria_raiz": "Implantología", "subcategoria": None, "image_url": _I['pilar'],
     "linea_producto": "Pilares Protéticos",
     "proveedores": ["ZIMMER", "STRAUMANN", "IPD", "KLOCKNER"]},

    {"categoria_raiz": "Implantología", "subcategoria": None, "image_url": _I['biomaterial'],
     "linea_producto": "Biomateriales de Regeneración Ósea",
     "proveedores": ["KLOCKNER", "STRAUMANN"]},

    {"categoria_raiz": "Implantología", "subcategoria": None, "image_url": _I['anest_qx'],
     "linea_producto": "Anestésicos y Fungible Quirúrgico",
     "proveedores": ["INIBSA", "HENRY SCHEIN", "PROCLINIC"]},

    {"categoria_raiz": "Implantología", "subcategoria": None, "image_url": _I['cirugia_guiada'],
     "linea_producto": "Planificación de Cirugía Guiada Digital",
     "proveedores": ["BITERIGHT"]},

    {"categoria_raiz": "Implantología", "subcategoria": None, "image_url": _I['escaneado'],
     "linea_producto": "Corrección y Validación de Escaneado",
     "proveedores": ["IOSFIX"]},

    # 3. ORTODONCIA
    {"categoria_raiz": "Ortodoncia", "subcategoria": None, "image_url": _I['brackets'],
     "linea_producto": "Brackets Metálicos y Cerámicos",
     "proveedores": ["IMPER-ORTHO", "FORESTADENT", "ORMCO", "ORTOAREA"]},

    {"categoria_raiz": "Ortodoncia", "subcategoria": None, "image_url": _I['autoligado'],
     "linea_producto": "Sistema de Brackets de Autoligado",
     "proveedores": ["ORMCO", "FORESTADENT", "IMPER-ORTHO"]},

    {"categoria_raiz": "Ortodoncia", "subcategoria": None, "image_url": _I['alineador'],
     "linea_producto": "Alineadores Transparentes",
     "proveedores": ["ORMCO"]},

    {"categoria_raiz": "Ortodoncia", "subcategoria": None, "image_url": _I['arcos_orto'],
     "linea_producto": "Arcos, Tubos y Accesorios de Ortodoncia",
     "proveedores": ["IMPER-ORTHO", "FORESTADENT", "ORTOAREA"]},

    {"categoria_raiz": "Ortodoncia", "subcategoria": None, "image_url": _I['retencion'],
     "linea_producto": "Retenciones y Contenciones",
     "proveedores": ["ORTOAREA", "IMPER-ORTHO"]},

    {"categoria_raiz": "Ortodoncia", "subcategoria": None, "image_url": _I['monit_ia'],
     "linea_producto": "Monitorización Remota por IA",
     "proveedores": ["ORMCO"]},

    {"categoria_raiz": "Ortodoncia", "subcategoria": None, "image_url": _I['fungible_orto'],
     "linea_producto": "Material Fungible de Ortodoncia",
     "proveedores": ["IMPER-ORTHO", "ORTOAREA", "FORESTADENT"]},
     
    # 4. LABORATORIO
    {"categoria_raiz": "Laboratorio", "subcategoria": None, "image_url": _I['lab'], "linea_producto": "Laboratorio Dental y Prótesis", "proveedores": ["CERANIUM", "MONDENTAL", "CONVADENT", "PRODENTAL", "CUSPIDENTAL", "MOCKLAB", "ARZENDENT", "DENTEKLAB"]},

    # 5. FINANCIERAS
    {"categoria_raiz": "Financieras", "subcategoria": None, "image_url": _I['finanzas_emp'], "linea_producto": "Financiación de Pacientes", "proveedores": ["SABADELL CONSUMER", "KUTXABANK", "NOWON"]},

    # 6. SERVICIOS
    {"categoria_raiz": "Servicios", "subcategoria": "Software y Ciberseguridad", "image_url": _I['software'], "linea_producto": "Software de Gestión Clínica (HIS/PMS)", "proveedores": ["INFOMED"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Software y Ciberseguridad", "image_url": _I['software'], "linea_producto": "Firma Digital y Consentimientos", "proveedores": ["INFOMED"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Software y Ciberseguridad", "image_url": _I['cyber'], "linea_producto": "Centralita Virtual y Telefonía IP", "proveedores": ["GLOFERA"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Software y Ciberseguridad", "image_url": _I['cyber'], "linea_producto": "Ciberseguridad y Cumplimiento RGPD", "proveedores": ["GLOFERA"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Software y Ciberseguridad", "image_url": _I['cyber'], "linea_producto": "Agentes de Voz con Inteligencia Artificial", "proveedores": ["GLOFERA"]},

    {"categoria_raiz": "Servicios", "subcategoria": "Gestión y marketing dental", "image_url": _I['citas_ia'], "linea_producto": "Confirmación y Gestión de Citas (WhatsApp/IA)", "proveedores": ["KOKUAI"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestión y marketing dental", "image_url": _I['marketing'], "linea_producto": "Marketing Digital y Consultoría Estratégica", "proveedores": ["AESINERGY"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestión y marketing dental", "image_url": _I['marketing'], "linea_producto": "Posicionamiento SEO Local (Google Maps)", "proveedores": ["AESINERGY"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestión y marketing dental", "image_url": _I['encuesta'], "linea_producto": "Encuestas de Satisfacción y Reputación (NPS)", "proveedores": ["ASTUTE CONTROL", "AESINERGY"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestión y marketing dental", "image_url": _I['comunicacion'], "linea_producto": "Comunicación Educativa en Sala de Espera", "proveedores": ["DIGIMEVO"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestión y marketing dental", "image_url": _I['rrhh'], "linea_producto": "Selección y Headhunting de Personal Clínico", "proveedores": ["TALENT SALUD"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestión y marketing dental", "image_url": _I['deuda'], "linea_producto": "Recuperación de Deuda de Pacientes Morosos", "proveedores": ["I-PACIENTES"]},

    {"categoria_raiz": "Servicios", "subcategoria": "Radiología UTPR y Dosimetría", "image_url": _I['radioproteccion'], "linea_producto": "Protección Radiológica (UTPR y Dosimetría)", "proveedores": ["GPR"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Radiología UTPR y Dosimetría", "image_url": _I['prl'], "linea_producto": "Prevención de Riesgos Laborales (PRL)", "proveedores": ["OTP"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Radiología UTPR y Dosimetría", "image_url": _I['prl'], "linea_producto": "Higiene Industrial y Ergonomía Clínica", "proveedores": ["OTP"]},

    {"categoria_raiz": "Servicios", "subcategoria": "Gestoría y Seguros", "image_url": _I['gestoria'], "linea_producto": "Asesoría Fiscal y Contable", "proveedores": ["ROCA ASOCIADOS", "MEDICONSULTING", "VDOBLE"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestoría y Seguros", "image_url": _I['gestoria'], "linea_producto": "Asesoría Laboral (Nóminas y Contratos)", "proveedores": ["ROCA ASOCIADOS", "MEDICONSULTING", "VDOBLE"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestoría y Seguros", "image_url": _I['legal'], "linea_producto": "Asesoría Societaria y Legal", "proveedores": ["ROCA ASOCIADOS", "MEDICONSULTING"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestoría y Seguros", "image_url": _I['seguros'], "linea_producto": "Seguro de Responsabilidad Civil Profesional", "proveedores": ["MARTÍN Y CACHÓN"]},
    {"categoria_raiz": "Servicios", "subcategoria": "Gestoría y Seguros", "image_url": _I['seguros'], "linea_producto": "Seguro de Clínica (Continente y Contenido)", "proveedores": ["MARTÍN Y CACHÓN"]},

    # 7. OTROS
    {"categoria_raiz": "Otros", "subcategoria": None, "image_url": _I['radiodiag'], "linea_producto": "Radiodiagnóstico Externo (CBCT, Ortopantomografía)", "proveedores": ["RADMEDICA"]},
    {"categoria_raiz": "Otros", "subcategoria": None, "image_url": _I['navidad'], "linea_producto": "Lotes y Cestas de Navidad Corporativas", "proveedores": ["SADIVAL"]},
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
    n_categorias, _ = Categoria.objects.all().delete()
    print(f"Borrados: {n_categorias} Categoria(s), {n_productos} Producto(s), {n_ofertas} ProveedorOferta(s)")

    productos_creados = 0
    ofertas_creadas = 0
    warnings = []

    cat_cache = {}

    for entry in MASTER_TAXONOMY:
        cat_raiz_nombre = entry['categoria_raiz']
        subcat_nombre = entry.get('subcategoria')
        linea = entry['linea_producto']
        image_url = entry.get('image_url', '')
        prov_nombres = entry['proveedores']

        # ── 1. Categoria ──────────────────────────────────────────────────
        if cat_raiz_nombre not in cat_cache:
            cat_raiz, created = Categoria.objects.get_or_create(nombre=cat_raiz_nombre, parent=None)
            if created:
                print(f"  [CAT] Creada categoría raíz: {cat_raiz_nombre}")
            cat_cache[cat_raiz_nombre] = cat_raiz
        cat_raiz = cat_cache[cat_raiz_nombre]
            
        if subcat_nombre:
            subcat_key = f"{cat_raiz_nombre}::{subcat_nombre}"
            if subcat_key not in cat_cache:
                cat_final, created_sub = Categoria.objects.get_or_create(nombre=subcat_nombre, parent=cat_raiz)
                if created_sub:
                    print(f"  [CAT] Creada subcategoría: {subcat_nombre} (bajo {cat_raiz_nombre})")
                cat_cache[subcat_key] = cat_final
            cat_final = cat_cache[subcat_key]
        else:
            cat_final = cat_raiz

        # ── 2. Producto ────────────────────────────────────────────────────
        producto, created = Producto.objects.get_or_create(
            nombre=linea,
            marca='',
            defaults={
                'linea_producto': linea,
                'categoria': cat_final,
                'imagen_url': image_url,
                'activo': True,
            }
        )
        if created:
            productos_creados += 1
        else:
            update_fields = []
            if producto.categoria_id != cat_final.pk:
                producto.categoria = cat_final
                update_fields.append('categoria')
            if producto.imagen_url != image_url:
                producto.imagen_url = image_url
                update_fields.append('imagen_url')
            if update_fields:
                producto.save(update_fields=update_fields)

        # ── 3. Proveedores ────────────────────────────────────────────────
        for prov_nombre in prov_nombres:
            matches = Proveedor.objects.filter(nombre__icontains=prov_nombre)
            if matches.count() == 1:
                proveedor = matches.first()
            elif matches.count() > 1:
                proveedor = min(matches, key=lambda p: len(p.nombre))
                warnings.append(
                    f"WARN: '{prov_nombre}' tiene múltiples coincidencias, "
                    f"usando '{proveedor.nombre}'"
                )
            else:
                proveedor = Proveedor.objects.create(
                    nombre=prov_nombre,
                    ahorro_estimado=None
                )
                print(f"  [PROV] Creado proveedor dinámicamente: {prov_nombre}")
                warnings.append(f"WARN: Proveedor creado dinámicamente en BD: '{prov_nombre}'")

            # Re-vincular el proveedor a las categorías creadas
            proveedor.categorias.add(cat_final)
            if cat_raiz != cat_final:
                proveedor.categorias.add(cat_raiz)

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
        print("--- Avisos ---------------------------------------")
        for w in warnings:
            print(f"  {w}")
        print()

    print("--- Resumen --------------------------------------")
    print(f"  Productos creados   : {productos_creados}")
    print(f"  Con imagen URL      : {productos_con_imagen}")
    print(f"  Ofertas creadas     : {ofertas_creadas}")
    print(f"  Avisos              : {len(warnings)}")
    print("--------------------------------------------------")

if __name__ == '__main__':
    run()
