"""
seed_master_catalog.py
======================
Populates the Marketplace with ~150 essential dental product lines
and links them to coherent supplier categories.

Usage:
    python manage.py seed_master_catalog
    python manage.py seed_master_catalog --clear  # wipe new products first
"""
from django.core.management.base import BaseCommand
from compras.models import Categoria, Producto, Proveedor

# ─── Supplier coherence map ───────────────────────────────────────────────────
# Keys match Proveedor.categoria_principal values (or substrings) stored in DB.
# Only suppliers whose categoria_principal contains one of these keys will be
# linked to a product category.  Financial / legal / gestoria providers are
# intentionally excluded from physical-product categories.

SUPPLY_CATEGORIES = {
    # Marketplace category  →  set of categoria_principal keywords that match
    "Depósitos y Aparatología": {
        "DEPÓSITOS GENERALISTAS",
        "DEPÓSITOS ESPECIALISTAS Y FABRICANTES",
    },
    "Implantología": {
        "IMPLANTES",
        "DEPÓSITOS ESPECIALISTAS Y FABRICANTES",
        "DEPÓSITOS GENERALISTAS",
    },
    "Ortodoncia": {
        "ORTODONCIA",
        "DEPÓSITOS GENERALISTAS",
        "DEPÓSITOS ESPECIALISTAS Y FABRICANTES",
    },
    "Laboratorio": {
        "LABORATORIO",
    },
    "Radiología UTPR y Dosimetría": {
        "SERVICIOS DIAGNOSTICOS",
        "DEPÓSITOS GENERALISTAS",
        "DEPÓSITOS ESPECIALISTAS Y FABRICANTES",
    },
    "Software y Ciberseguridad": {
        "CIBERSEGURIDAD Y TELCO",
        "GESTIÓN Y MARKETING DENTAL",
    },
    "Gestión y marketing dental": {
        "GESTIÓN Y MARKETING DENTAL",
    },
    "Gestoría y Seguros": {
        "GESTORÍA",
        "SEGUROS",
        "CUMPLIMIENTO NORMATIVO",
    },
    "Financieras": {
        "FINANCIERAS",
    },
    "Servicios": {
        "GESTIÓN Y MARKETING DENTAL",
        "SERVICIOS DIAGNOSTICOS",
    },
}

# ─── Master Catalog ───────────────────────────────────────────────────────────
# Format: (nombre, categoria_nombre, descripcion, aliases)
# Existing 58 products are skipped (get_or_create).

CATALOG = [
    # ── Consumibles de barrera y protección ──
    ("Baberos Dentales", "Depósitos y Aparatología",
     "Baberos de papel o TNT para protección de paciente durante el tratamiento.", []),
    ("Vasos Desechables para Enjuague", "Depósitos y Aparatología",
     "Vasos de plástico o papel para pacientes.", []),
    ("Servilletas y Rollos de Papel", "Depósitos y Aparatología",
     "Material absorbente de papel para uso clínico general.", []),
    ("Gorros Desechables", "Depósitos y Aparatología",
     "Gorros de protección de un solo uso para personal clínico.", []),
    ("Calzas y Cubrezapatos", "Depósitos y Aparatología",
     "Fundas desechables para calzado de uso clínico.", []),
    ("Batas Desechables", "Depósitos y Aparatología",
     "Batas no tejidas de un solo uso para clínica.", []),
    ("Protectores Oculares / Gafas Paciente", "Depósitos y Aparatología",
     "Gafas protectoras reutilizables o desechables para el paciente.", []),

    # ── Guantes ──
    ("Guantes de Nitrilo", "Depósitos y Aparatología",
     "Guantes de exploración sin latex en distintas tallas.", []),
    ("Guantes de Látex", "Depósitos y Aparatología",
     "Guantes de exploración de látex natural.", []),
    ("Guantes de Vinilo", "Depósitos y Aparatología",
     "Alternativa económica sin látex para exploraciones de bajo riesgo.", []),
    ("Guantes Estériles Quirúrgicos", "Depósitos y Aparatología",
     "Guantes estériles de cirugía en pares individuales.", []),

    # ── Mascarillas ──
    ("Mascarillas Quirúrgicas IIR", "Depósitos y Aparatología",
     "Mascarillas de tipo IIR para uso clínico estándar.", []),
    ("Mascarillas FFP2/N95", "Depósitos y Aparatología",
     "Mascarillas de alta filtración para procedimientos de riesgo.", []),

    # ── Jeringuillas y agujas ──
    ("Jeringuillas de Irrigación (10ml/20ml)", "Depósitos y Aparatología",
     "Jeringuillas desechables para irrigación de campo quirúrgico.", []),
    ("Agujas de Anestesia Cortas y Largas", "Depósitos y Aparatología",
     "Agujas para cartuchos de anestesia dental en calibres 27G y 30G.", []),
    ("Agujas de Sutura", "Depósitos y Aparatología",
     "Agujas atraumáticas con hilo de sutura reabsorbible y no reabsorbible.", []),

    # ── Hilo de sutura y hemostasia ──
    ("Hilo de Sutura Reabsorbible", "Depósitos y Aparatología",
     "Sutura Vicryl o similar para cierres intraorales.", []),
    ("Hilo de Sutura No Reabsorbible (seda/nylon)", "Depósitos y Aparatología",
     "Sutura de seda o nylon para cierre en boca.", []),
    ("Esponjas Hemostáticas de Colágeno", "Depósitos y Aparatología",
     "Esponjas de colágeno para hemostasia postextracción.", []),
    ("Celulosa Oxidada Hemostática", "Depósitos y Aparatología",
     "Material hemostático reabsorbible tipo Surgicel.", []),

    # ── Eyectores y aspiración ──
    ("Eyectores de Saliva Desechables", "Depósitos y Aparatología",
     "Cánulas de aspiración de saliva en bolsas de 100 uds.", []),
    ("Cánulas de Aspiración Quirúrgica", "Depósitos y Aparatología",
     "Cánulas de mayor diámetro para aspiración en cirugía.", []),
    ("Puntas de Aerosol (puntas de spray)", "Depósitos y Aparatología",
     "Puntas para jeringa triple desechables.", []),

    # ── Rollos de algodón y pellets ──
    ("Rollos de Algodón", "Depósitos y Aparatología",
     "Rollos de algodón para aislamiento relativo.", []),
    ("Pellets de Algodón", "Depósitos y Aparatología",
     "Bolitas de algodón para aplicación de medicamentos.", []),
    ("Gasas Estériles", "Depósitos y Aparatología",
     "Compresas de gasa estéril para uso quirúrgico y clínico.", []),

    # ── Matrices y cuñas ──
    ("Matrices Metálicas Sectorizadas", "Depósitos y Aparatología",
     "Matrices Tofflemire y sectorizadas para restauraciones posteriores.", []),
    ("Matrices de Celuloide (anteriores)", "Depósitos y Aparatología",
     "Tiras de celuloide para restauraciones anteriores.", []),
    ("Cuñas de Madera y Plástico", "Depósitos y Aparatología",
     "Cuñas interdentales en madera o plástico para matrices.", []),

    # ── Dique de goma ──
    ("Dique de Goma y Accesorios", "Depósitos y Aparatología",
     "Láminas de látex/látex-free, grampas, arco y perforadora.", []),
    ("Grampas para Dique de Goma", "Depósitos y Aparatología",
     "Surtido de grampas metálicas para aislamiento absoluto.", []),

    # ── Puntas de papel ──
    ("Puntas de Papel para Endodoncia", "Depósitos y Aparatología",
     "Conos absorbentes ISO 15-140 para secado de conductos.", []),
    ("Conos de Gutapercha", "Depósitos y Aparatología",
     "Conos de gutapercha en calibres ISO y no normalizados.", []),

    # ── Limas endodóncicas ──
    ("Limas K y H de Acero Inoxidable", "Depósitos y Aparatología",
     "Limas manuales de acero para acceso y conformado de conductos.", []),
    ("Limas de NiTi Rotatorias (endodoncia)", "Depósitos y Aparatología",
     "Sistemas de limas rotatorias NiTi para endodoncia mecanizada.", []),
    ("Irrigantes de Endodoncia (NaOCl, EDTA)", "Depósitos y Aparatología",
     "Soluciones de hipoclorito sódico y EDTA para irrigación radicular.", []),

    # ── Material de composite y obturación ──
    ("Composite Fotopolimerizable Universal", "Depósitos y Aparatología",
     "Resina compuesta en jeringa de diferentes opacidades y colores VITA.", []),
    ("Composite Fluido (flowable)", "Depósitos y Aparatología",
     "Composite de baja viscosidad para bases y fosas y fisuras.", []),
    ("Cemento de Ionómero de Vidrio", "Depósitos y Aparatología",
     "Ionómero convencional y de alta viscosidad para obturación y base.", []),
    ("Cemento de Fosfato de Zinc", "Depósitos y Aparatología",
     "Cemento clásico para cementado de coronas metálicas.", []),
    ("Cemento de Policarboxilato", "Depósitos y Aparatología",
     "Cemento poliácido para cementado provisional y bases.", []),
    ("Cemento Provisional (Temp-Bond, Freegenol)", "Depósitos y Aparatología",
     "Cementos temporales eugenólicos y no eugenólicos.", []),
    ("Cemento de Resina Definitivo (dual)", "Depósitos y Aparatología",
     "Cementos de resina dual para cementado de restauraciones cerámicas.", []),

    # ── Adhesivos ──
    ("Adhesivo Universal de 7ª Generación", "Depósitos y Aparatología",
     "Adhesivo de botella única compatible con auto, fotopolimerización y dual.", []),
    ("Adhesivo de Grabado Total (Total Etch)", "Depósitos y Aparatología",
     "Sistemas adhesivos de 2-3 pasos con ácido fosfórico aparte.", []),
    ("Ácido Fosfórico al 37%", "Depósitos y Aparatología",
     "Gel de grabado para esmalte y dentina.", []),

    # ── Blanqueamiento ──
    ("Kit de Blanqueamiento en Consulta (H2O2 35-40%)", "Depósitos y Aparatología",
     "Peróxido de hidrógeno de alta concentración para blanqueamiento en silla.", []),
    ("Kit de Blanqueamiento Domiciliario", "Depósitos y Aparatología",
     "Peróxido de carbamida 10-16-22% con cubetas a medida.", []),
    ("Cubetas de Blanqueamiento", "Depósitos y Aparatología",
     "Cubetas termoformables estándar o universales.", []),

    # ── Materiales de impresión ──
    ("Alginato de Impresión", "Depósitos y Aparatología",
     "Material de alginato para impresiones de estudio.", []),
    ("Silicona de Adición (PVS) Pesada + Fluida", "Depósitos y Aparatología",
     "Silicona vinilpolisiloxano de 2 consistencias para impresiones definitivas.", []),
    ("Silicona de Condensación", "Depósitos y Aparatología",
     "Silicona de tipo C (putty y wash) para impresiones.", []),
    ("Poliéter de Impresión", "Depósitos y Aparatología",
     "Impresión de alta precisión dimensional para implantología.", []),
    ("Yeso Dental Tipo III y IV", "Depósitos y Aparatología",
     "Yeso de laboratorio para modelos de estudio y trabajo.", []),
    ("Bandejas de Impresión (metálicas y plásticas)", "Depósitos y Aparatología",
     "Cubetas estándar y de stock en distintos tamaños.", []),

    # ── Profilaxis ──
    ("Pasta Profiláctica", "Depósitos y Aparatología",
     "Pastas de pulido en distintas granulometrías para copa de goma y Airflow.", []),
    ("Copas y Cepillos de Profilaxis", "Depósitos y Aparatología",
     "Copas de goma, pinceles y cepillos para profilaxis en baja velocidad.", []),
    ("Polvo Airflow (eritritol/bicarbonato)", "Depósitos y Aparatología",
     "Polvos para handpiece de chorro aire-agua (Airflow, Prophyflex).", []),
    ("Puntas de Ultrasonidos", "Depósitos y Aparatología",
     "Insertos universales y periodontales para escalador ultrasónico.", []),
    ("Barniz de Flúor", "Depósitos y Aparatología",
     "Barniz fluorado 5% para aplicación tópica postprofilaxis.", []),
    ("Selladores de Fisuras", "Depósitos y Aparatología",
     "Selladores de resina o ionómero para prevención caries en fosas y fisuras.", []),

    # ── Anestesia ──
    ("Cartuchos de Anestesia Local (Mepivacaína, Articaína)", "Depósitos y Aparatología",
     "Cartuchos 1.8ml de distintos principios activos y vasoconstrictores.", []),
    ("Anestesia Tópica (spray y gel)", "Depósitos y Aparatología",
     "Benzocaína o lidocaína en gel/spray para anestesia superficial.", []),
    ("Jeringa Carpule de Anestesia", "Depósitos y Aparatología",
     "Jeringas metálicas o plásticas para cartuchos de anestesia.", []),

    # ── Instrumental rotatorio ──
    ("Fresas de Carburo Tungsteno", "Depósitos y Aparatología",
     "Fresas FG y CA de vástago redondo, fisura, troncocónica y de acabado.", []),
    ("Fresas de Diamante", "Depósitos y Aparatología",
     "Fresas diamantadas de distintas granulometrías para preparaciones.", []),
    ("Discos de Carborundum y Diamante", "Depósitos y Aparatología",
     "Discos de corte en soporte mandril.", []),
    ("Gomas y Puntas de Pulido", "Depósitos y Aparatología",
     "Sistemas de pulido en goma abrasiva para composites y cerámicas.", []),

    # ── Esterilización ──
    ("Bolsas de Esterilización (Pouches)", "Depósitos y Aparatología",
     "Bolsas mixtas papel-film autosellantes para autoclave.", []),
    ("Rolls/Rollos de Esterilización", "Depósitos y Aparatología",
     "Rollo continuo para envasar piezas de gran formato.", []),
    ("Detergente Enzimático para Instrumentos", "Depósitos y Aparatología",
     "Solución limpiadora para lavadora de instrumentos o fregado manual.", []),
    ("Indicadores Químicos de Esterilización", "Depósitos y Aparatología",
     "Tiras y etiquetas de control clase 4/5/6 para autoclaves.", []),
    ("Indicadores Biológicos (esporas)", "Depósitos y Aparatología",
     "Viales de esporas para validación de ciclos de esterilización.", []),

    # ── Desinfección ──
    ("Desinfectante de Superficies (spray/toallitas)", "Depósitos y Aparatología",
     "Desinfectante de superficies de amplio espectro para clínica.", []),
    ("Desinfectante de Alto Nivel (glutaraldehído/OPA)", "Depósitos y Aparatología",
     "Soluciones de inmersión para instrumental que no tolera autoclave.", []),
    ("Desinfectante de Impresiones", "Depósitos y Aparatología",
     "Spray o solución para descontaminación de impresiones antes de laboratorio.", []),
    ("Gel Hidroalcohólico", "Depósitos y Aparatología",
     "Solución desinfectante de manos sin agua.", []),
    ("Jabón Antiséptico con Clorhexidina", "Depósitos y Aparatología",
     "Jabón quirúrgico para lavado de manos.", []),

    # ── Cirugía y periotecnia ──
    ("Retractores y Espátulas Quirúrgicas", "Depósitos y Aparatología",
     "Instrumental de retracción de tejidos blandos en cirugía.", []),
    ("Legras y Periostótomos", "Depósitos y Aparatología",
     "Instrumentos para despegamiento de colgajos mucoperiosticos.", []),
    ("Fórceps de Extracción", "Depósitos y Aparatología",
     "Fórceps superiores e inferiores para exodoncias.", []),
    ("Elevadores y Botadores", "Depósitos y Aparatología",
     "Elevadores recto y angulado para luxación dental.", []),
    ("Porta-Agujas y Tijeras de Sutura", "Depósitos y Aparatología",
     "Instrumental quirúrgico para colocación y corte de suturas.", []),
    ("Membranas de Regeneración Ósea (colágeno/PTFE)", "Depósitos y Aparatología",
     "Membranas reabsorbibles y no reabsorbibles para RTG/ROG.", []),

    # ── Implantes y pilares ──
    ("Implantes Unitarios (distintas marcas)", "Implantología",
     "Fijaciones de titanio de distintos sistemas (conexión interna/externa).", []),
    ("Pilares de Cicatrización (Healing Abutments)", "Implantología",
     "Pilares de cicatrización de distintos diámetros y alturas.", []),
    ("Pilares Protéticos Estándar", "Implantología",
     "Pilares rectos y angulados para prótesis sobre implante.", []),
    ("Tornillos de Implante (Fixture Screws)", "Implantología",
     "Tornillos de fijación y oclusales de repuesto.", []),
    ("Portaimplantes y Kit de Cirugía", "Implantología",
     "Instrumental específico del sistema para la colocación de implantes.", []),
    ("Hueso Sintético (sustituto óseo)", "Implantología",
     "Gránulos de hidroxiapatita, β-TCP o combinados para relleno óseo.", []),
    ("Hueso Bovino Deproteinizado (Bio-Oss tipo)", "Implantología",
     "Sustituto óseo xenólogo en gránulos finos y gruesos.", []),
    ("Plasma Rico en Factores de Crecimiento (PRGF/PRF)", "Implantología",
     "Kits y centrífuga para preparación de plasma autólogo.", []),

    # ── Ortodoncia consumible ──
    ("Ligaduras Elásticas de Colores", "Ortodoncia",
     "Módulos elásticos para ligar arcos en brackets convencionales.", []),
    ("Cera para Ortodoncia", "Ortodoncia",
     "Cera de alivio para irritación de mejillas y encías.", []),
    ("Separadores Elásticos y Metálicos", "Ortodoncia",
     "Módulos separadores para crear espacio molar previo a banda.", []),
    ("Bandas Molares con Tubo", "Ortodoncia",
     "Bandas con tubo soldado en molar superior e inferior.", []),
    ("Elásticos Intermaxilares", "Ortodoncia",
     "Gomas de tracción intermaxilar en distintos diámetros y fuerzas.", []),
    ("Placas Base y Ceras de Articulación", "Ortodoncia",
     "Material de registro de mordida para diagnóstico.", []),

    # ── Uniformes clínicos ──
    ("Uniformes y Pijamas Clínicos", "Depósitos y Aparatología",
     "Pijamas y uniformes sanitarios de distintos colores y tallas.", []),
    ("Zuecos Clínicos", "Depósitos y Aparatología",
     "Calzado sanitario anatómico antideslizante.", []),

    # ── Equipamiento ──
    ("Lámpara de Fotopolimerización LED", "Depósitos y Aparatología",
     "Unidad de luz LED para polimerización de resinas.", []),
    ("Ultrasonidos (scaler piezoeléctrico)", "Depósitos y Aparatología",
     "Escalador piezoeléctrico para tartrectomía y cirugía periimplantaria.", []),
    ("Aparato de Radiología Periapical Digital", "Depósitos y Aparatología",
     "Sensor digital o película de radiografía periapical.", []),
    ("Amalgamador / Mezclador de Cápsulas", "Depósitos y Aparatología",
     "Mezclador de alta velocidad para activar cápsulas de ionómero/amalgama.", []),
    ("Compresor Dental", "Depósitos y Aparatología",
     "Compresor libre de aceite para equipamiento neumático clínico.", []),
    ("Equipo de Rayos X Periapical (brazo)", "Depósitos y Aparatología",
     "Tubo de rayos X de pared para radiografías periapicales.", []),
    ("Autoclave Clase B", "Depósitos y Aparatología",
     "Autoclave de vapor de agua con fracciones de vacío para instrumental hueco.", []),
    ("Sillón Dental Completo", "Depósitos y Aparatología",
     "Unidad dental completa con jeringa triple, aspiración y lámpara.", []),
    ("Micromotor y Contraángulo", "Depósitos y Aparatología",
     "Motor eléctrico o neumático y contraángulo 1:1 y 1:5.", []),
    ("Turbina de Alta Velocidad", "Depósitos y Aparatología",
     "Turbina de aire con luz y spray para instrumentación rotativa.", []),

    # ── Radiología y dosimetría ──
    ("Dosímetros de Radiación Personal", "Radiología UTPR y Dosimetría",
     "Dosímetros TLD o OSL para vigilancia de exposición individual.", []),
    ("Pantallas Plomadas y EPIs Radiológicos", "Radiología UTPR y Dosimetría",
     "Delantales, collares tiroideos y mamparas de plomo.", []),
    ("Soporte para Radiografía (posicionador)", "Radiología UTPR y Dosimetría",
     "Posicionadores Rinn y XCP para radiografías periapicales y aleta mordida.", []),
    ("Película Radiográfica Dental", "Radiología UTPR y Dosimetría",
     "Película periapical E/F speed para revelado convencional.", []),

    # ── Laboratorio dental ──
    ("Yeso Piedra Tipo IV (laboratorio)", "Laboratorio",
     "Yeso de alta resistencia para modelos definitivos.", []),
    ("Ceras de Modelado Dental", "Laboratorio",
     "Ceras inlay, de dientes y para modelar estructuras metálicas.", []),
    ("Resina Acrílica de Laboratorio (PMMA)", "Laboratorio",
     "Polvo y líquido acrílico para bases de prótesis completa.", []),
    ("Material de Revestimiento (fosfato)", "Laboratorio",
     "Revest. de fosfato para colados metálicos y prensado de cerámica.", []),
    ("Discos de Zirconio y Composite CAD/CAM", "Laboratorio",
     "Bloques y discos de zirconio o composite para fresadora CAD/CAM.", []),

    # ── Higiene bucal para pacientes ──
    ("Cepillos Dentales de Regalo (paciente)", "Depósitos y Aparatología",
     "Cepillos de media dureza para entrega en consulta.", []),
    ("Hilo Dental y Floss para Pacientes", "Depósitos y Aparatología",
     "Hilo dental, superfloss y cepillos interproximales para higiene domiciliaria.", []),
    ("Pasta Dentífrica Profiláctica", "Depósitos y Aparatología",
     "Dentífrico con alta concentración de flúor o prescripción.", []),
    ("Colutorios de Clorhexidina", "Depósitos y Aparatología",
     "Enjuague 0.12-0.20% para postoperatorio y periodontitis.", []),
    ("Reveladores de Placa Bacteriana", "Depósitos y Aparatología",
     "Comprimidos o líquido para tinción de placa, uso en consulta y domicilio.", []),
]


def get_coherent_providers_for_category(cat_nombre: str) -> list:
    """Return Proveedor instances whose categoria_principal matches the supply map."""
    keywords = SUPPLY_CATEGORIES.get(cat_nombre, set())
    if not keywords:
        return []

    matching = []
    for prov in Proveedor.objects.filter(activo=True).exclude(categoria_principal__isnull=True).exclude(categoria_principal=''):
        cp_upper = (prov.categoria_principal or '').upper()
        for kw in keywords:
            if kw.upper() in cp_upper:
                matching.append(prov)
                break
    return matching


class Command(BaseCommand):
    help = 'Seeds the Marketplace with ~150 essential dental product lines.'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true',
                            help='Delete products added by this command before re-seeding (only those with needs_review=False and no ofertas).')

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0
        linked_count = 0

        for nombre, cat_nombre, descripcion, _aliases in CATALOG:
            try:
                cat = Categoria.objects.get(nombre=cat_nombre)
            except Categoria.DoesNotExist:
                self.stdout.write(self.style.WARNING(f'  [SKIP] Categoria not found: {cat_nombre}'))
                skipped_count += 1
                continue

            producto, created = Producto.objects.get_or_create(
                nombre=nombre,
                marca='',
                defaults={
                    'categoria': cat,
                    'descripcion': descripcion,
                    'activo': True,
                    'linea_producto': nombre,
                }
            )

            if not created:
                skipped_count += 1
                self.stdout.write(f'  [EXISTS] {nombre}')
            else:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  [NEW]    {nombre}'))

            # Link coherent providers to the product's category (via Proveedor.categorias M2M)
            providers = get_coherent_providers_for_category(cat_nombre)
            for prov in providers:
                prov.categorias.add(cat)
                linked_count += 1

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS(
            f'Done. Created: {created_count} | Skipped (already exist): {skipped_count} | Provider-category links: {linked_count}'
        ))
