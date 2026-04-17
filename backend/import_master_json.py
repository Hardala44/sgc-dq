import os
import sys
import django
import json

# Add backend directory to sys path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')
django.setup()

from compras.models import Proveedor, Categoria

master_json = {
  "proveedores": [
    {
      "nombre": "Henry Schein",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Empresa de soluciones para profesionales de la salud impulsada por una red de personas y tecnología.",
      "condiciones": "Marca HenrySchein/Corporativas: 47% Dto. | Normon: 40% Dto. | Catálogo: 35% Dto. mín. | Equipamiento: Dto. máximo fabricante.",
      "contacto_nombre": "Sonia Pereira",
      "telefono": "913 606 000",
      "email": "sonia.pereira@henryschein.es"
    },
    {
      "nombre": "Proclinic",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Líderes del sector dental ofreciendo equipamiento innovador y el mayor portfolio de productos.",
      "condiciones": "Marca Proclinic: 40% Dto. | Tarifa general: 30% Dto. | Pequeña aparatología: 25% Dto. | Portes gratuitos.",
      "contacto_nombre": "Paola Alemán",
      "telefono": "976 28 77 99",
      "email": "paola.aleman@proclinic.es"
    },
    {
      "nombre": "Broker Dental",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Opción de compra inteligente para que la salud bucodental sea accesible a todos.",
      "condiciones": "Tarifa general: 25% Dto. | Pequeña aparatología: 10% Dto. | Ofertas de consumo (no aparatología): 10% Dto.",
      "contacto_nombre": "Isaac Núñez",
      "telefono": "900 300 269",
      "email": "broker@brokerdental.es"
    },
    {
      "nombre": "DVD Dental",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Líder y referente del sector con soluciones de valor, innovación y fomento del talento odontológico.",
      "condiciones": "Marca Nacional: 30% Dto. | Marcas Exclusivas: 50% Dto. | Aparatología: Ofertas Exclusivas Dental Quality.",
      "contacto_nombre": "Maite López",
      "telefono": "900 300 475",
      "email": "pedidos@dvd-dental.com"
    },
    {
      "nombre": "Axis Dental",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Especialistas en fresas, postes y composite con estándares de calidad suiza.",
      "condiciones": "10% de Descuento sobre tarifa.",
      "contacto_nombre": "Santiago María",
      "telefono": "916 795 980",
      "email": "info@axis-dental.es"
    },
    {
      "nombre": "Akura",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Expertos en ergonomía postural, visión, precisión y magnificación.",
      "condiciones": "Catálogo de ofertas especiales Dental Quality y compras agrupadas.",
      "contacto_nombre": "Charlotte Helt",
      "telefono": "664 509 852",
      "email": "charlotte@akura-medical.com"
    },
    {
      "nombre": "Adiemed",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Empresa dedicada a la importación de equipamiento para diagnóstico médico y desfibriladores.",
      "condiciones": "Sistema Samaritan PAD 350P: 945€+IVA. Mantenimiento: 99€+IVA cada 4 años.",
      "contacto_nombre": "Juan Barrero",
      "telefono": "619 702 898",
      "email": "jbarrero@adiemed.com"
    },
    {
      "nombre": "Endovations",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Especialistas en venta de aparatología e instrumentación para endodoncia.",
      "condiciones": "Tarifa Especial VIP. Portes gratuitos. Factura única mensual.",
      "contacto_nombre": "Aníbal Tronco",
      "telefono": "984 491 808",
      "email": "info@endovations.es"
    },
    {
      "nombre": "Katia Dental",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Asesoramiento personalizado y suministro eficiente de soluciones dentales innovadoras.",
      "condiciones": "25% de Descuento sobre tarifa.",
      "contacto_nombre": "Carolina Quinteiro",
      "telefono": "934 090 600",
      "email": "cquinteiro@katiadental.com"
    },
    {
      "nombre": "EMS",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Soluciones para prevención de caries y enfermedades periodontales (AIRFLOW).",
      "condiciones": "AirFlow Prophylaxis Master + Station: 8.963,25€. Resto de productos: 15% Dto.",
      "contacto_nombre": "Alexandra Carrillo",
      "telefono": "672 001 690",
      "email": "acarrillocasas@ems-espana.com"
    },
    {
      "nombre": "BMG - Dentalhitec",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Distribución de QuickSleeper, anestesia intraósea de alta tecnología.",
      "condiciones": "8% Descuento en QuickSleeper. Descuentos variables en resto de productos.",
      "contacto_nombre": "Antonio Barreiro",
      "telefono": "615 996 995",
      "email": "antoniobarreiro@bmggrup.com"
    },
    {
      "nombre": "Global Uniforms (Cherokee)",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Líder mundial en uniformes médicos con telas de fácil cuidado y Soil Release.",
      "condiciones": "10% de Descuento sobre tarifa.",
      "contacto_nombre": "Alex Noguera",
      "telefono": "933 07 22 29",
      "email": "alexnoguera@globaluniforms.es"
    },
    {
      "nombre": "RoBenitez",
      "categoria": "Depósitos, Aparatología y SAT",
      "descripcion": "Facilita la compra y mantenimiento de maletines de reanimación y oxígeno medicinal.",
      "condiciones": "3% de Descuento sobre tarifa.",
      "contacto_nombre": "Laura Benítez",
      "telefono": "952 608 246",
      "email": "rdebentiez@gmail.com"
    },
    {
      "nombre": "Ceranium",
      "categoria": "Laboratorios",
      "descripcion": "Laboratorio de prótesis dental especializado en la digitalización y alta estética.",
      "condiciones": "Acceso a tarifa más reducida. 10% Dto. extra durante los 3 primeros meses.",
      "contacto_nombre": "Víctor Puertas",
      "telefono": "696 514 302",
      "email": "victor.puertas@laboratorioceranium.com"
    },
    {
      "nombre": "Mondental",
      "categoria": "Laboratorios",
      "descripcion": "Prótesis y ortodoncia de calidad con materiales biocompatibles y tecnología CAD/CAM.",
      "condiciones": "Tarifa especial 5% Dto. medio (excepto marcas).",
      "contacto_nombre": "María Alejandra Pérez",
      "telefono": "602 25 09 51",
      "email": "mondental@corusdental.com"
    },
    {
      "nombre": "ConVadent",
      "categoria": "Laboratorios",
      "descripcion": "Laboratorio homologado por ZimVie para prótesis con flujo digital y material original.",
      "condiciones": "Descuento medio para el grupo: 12,5%. Portes incluidos.",
      "contacto_nombre": "Antonio Contreras",
      "telefono": "957 76 81 46",
      "email": "acontreras@convadent.com"
    },
    {
      "nombre": "Prodental Gilabert",
      "categoria": "Laboratorios",
      "descripcion": "Laboratorio de prótesis dental en Valencia recomendado por doctores del grupo.",
      "condiciones": "Condiciones especiales Dental Quality.",
      "contacto_nombre": "Amadó Gilabert",
      "telefono": "963 650 072",
      "email": "gilabertprodental@gmail.com"
    },
    {
      "nombre": "Cuspidental",
      "categoria": "Laboratorios",
      "descripcion": "Laboratorio especializado en flujo digital Straumann.",
      "condiciones": "Precios especiales flujo prótesis acabada Straumann/Medentika.",
      "contacto_nombre": "Jordi Clua",
      "telefono": "608 219 411",
      "email": "cuspidental@gmail.com"
    },
    {
      "nombre": "Mocklab",
      "categoria": "Laboratorios",
      "descripcion": "Laboratorio dental en Huelva aprobado por doctores Dental Quality.",
      "condiciones": "Condiciones especiales Dental Quality.",
      "contacto_nombre": "Lourdes Morián",
      "telefono": "640 316 233",
      "email": "gestion@mocklab.es"
    },
    {
      "nombre": "Aesinergy",
      "categoria": "Gestión, Marketing y Selección de Personal",
      "descripcion": "Consultoría ejecutiva para mejorar la rentabilidad, gestión de equipos y marketing.",
      "condiciones": "5% de Descuento en todos los servicios.",
      "contacto_nombre": "Javier López",
      "telefono": "678 000 339",
      "email": "Javier.lopez@aesinergy.es"
    },
    {
      "nombre": "Talent Salud",
      "categoria": "Gestión, Marketing y Selección de Personal",
      "descripcion": "Especialistas en selección de personal para el sector salud con cobertura nacional.",
      "condiciones": "Técnico/auxiliar: 845€+IVA. Doctores: 940€+IVA. 2 meses garantía reposición.",
      "contacto_nombre": "Mónica Forns",
      "telefono": "679 845 775",
      "email": "seleccion@talentsalud.es"
    },
    {
      "nombre": "Digimevo",
      "categoria": "Gestión, Marketing y Selección de Personal",
      "descripcion": "Sistema de comunicación educativo inteligente para salas de espera y tablets.",
      "condiciones": "25% Dto. sobre tarifa. Pago inicial 150€. Mensualidad 30€/mes.",
      "contacto_nombre": "Xavier Lleixa",
      "telefono": "672 257 053",
      "email": "xavier.lleixa@digimevo.com"
    },
    {
      "nombre": "Astute Control",
      "categoria": "Gestión, Marketing y Selección de Personal",
      "descripcion": "Sistema de encuestas de satisfacción de pacientes para medir experiencia y calidad.",
      "condiciones": "15% de Descuento. Renting 24 meses: 69€+IVA.",
      "contacto_nombre": "Martín Fungini",
      "telefono": "640 224 430",
      "email": "mfg@astutecontrol.com"
    },
    {
      "nombre": "Straumann",
      "categoria": "Implantología, biomaterial y anestesia",
      "descripcion": "Referente mundial en implantes y pilares de alta precisión.",
      "condiciones": "Implantes/pilares: 33% Dto mín. Biomateriales: 30% Dto. Pack Bienvenida: 2.546€.",
      "contacto_nombre": "Ángel Saura",
      "telefono": "650 316 634",
      "email": "angel.saura@straumann.com"
    },
    {
      "nombre": "ZimVie",
      "categoria": "Implantología, biomaterial y anestesia",
      "descripcion": "Soluciones integrales de implantología, regeneración y odontología digital.",
      "condiciones": "Implantes/prótesis: 50% Dto (53% TSX/T3PRO). Digital: 20-40% Dto. Kits quirúrgicos sin coste.",
      "contacto_nombre": "Iván Andreu",
      "telefono": "607 792 036",
      "email": "ivan.andreu@zimvie.com"
    },
    {
      "nombre": "Inibsa",
      "categoria": "Implantología, biomaterial y anestesia",
      "descripcion": "Referente en control del dolor, bioseguridad, cirugía y restauración.",
      "condiciones": "Anestesia: >30% Dto. Agujas: 50% Dto. Desinfección: 25-32% Dto. Suturas: 28-37% Dto.",
      "contacto_nombre": "Rebeca Herrero",
      "telefono": "938 609 512",
      "email": "dental.pedidos@inibsa.com"
    },
    {
      "nombre": "IPD",
      "categoria": "Implantología, biomaterial y anestesia",
      "descripcion": "Fabricante de aditamentos protésicos para implantes con soluciones digitales abiertas.",
      "condiciones": "Tarifa específica para Dental Quality.",
      "contacto_nombre": "Manuel Villagordo",
      "telefono": "610 57 11 19",
      "email": "mvillagordo@ipd2004.com"
    },
    {
      "nombre": "Botiss (Klockner)",
      "categoria": "Implantología, biomaterial y anestesia",
      "descripcion": "Especialistas en regeneración ósea y tisular (Cerabone, Jason, Mucoderm).",
      "condiciones": "15% de Descuento sobre tarifa.",
      "contacto_nombre": "Alberto Espejo",
      "telefono": "931 851 904",
      "email": "aespejo@klockner.es"
    },
    {
      "nombre": "BiteRight",
      "categoria": "Implantología, biomaterial y anestesia",
      "descripcion": "Asistente para la planificación digital de cirugía guiada compatible con todas las marcas.",
      "condiciones": "7% de Descuento mínimo sobre tarifa.",
      "contacto_nombre": "Lorenzo Gimeno",
      "telefono": "625 06 98 47",
      "email": "lorenzo.gimeno@biteright.dental"
    },
    {
      "nombre": "IOSFIX",
      "categoria": "Implantología, biomaterial y anestesia",
      "descripcion": "Metrología digital aplicada a la odontología para eliminar errores de escaneado.",
      "condiciones": "Primera corrección RingFix gratis. Cada 5 correcciones, una gratuita.",
      "contacto_nombre": "Jorge García",
      "telefono": "654 365 539",
      "email": "j.garcia@iosfix.dental"
    },
    {
      "nombre": "Ormco - Spark",
      "categoria": "Ortodoncia",
      "descripcion": "Proveedor internacional de referencia en ortodoncia y alineadores transparentes Spark.",
      "condiciones": "Spark: 48% a 52% Dto. Formación Onboarding sin coste.",
      "contacto_nombre": "José Jimenez",
      "telefono": "650 458 866",
      "email": "jose.jimenez@envistaco.com"
    },
    {
      "nombre": "Imperortho",
      "categoria": "Ortodoncia",
      "descripcion": "Depósito y laboratorio de ortodoncia con fábrica propia en EE.UU.",
      "condiciones": "20% Dto. sobre Tarifa general. 10% en Microimplantes.",
      "contacto_nombre": "Víctor Camps",
      "telefono": "962 415 647",
      "email": "victor@imperortho.com"
    },
    {
      "nombre": "Forestadent",
      "categoria": "Ortodoncia",
      "descripcion": "Proveedor mundial de productos de ortodoncia de alta precisión fabricados en Alemania.",
      "condiciones": "TARIFA GOLD.",
      "contacto_nombre": "Alexis Alonso",
      "telefono": "669 704 477",
      "email": "a.alonso@forestadent.es"
    },
    {
      "nombre": "Ortoarea",
      "categoria": "Ortodoncia",
      "descripcion": "Depósito y laboratorio de ortodoncia enfocado en la innovación y marcas pioneras.",
      "condiciones": "Tarifa Reducida y ofertas específicas en brackets (Biomim, Zafiro, HYPE).",
      "contacto_nombre": "Vanesa Flinch",
      "telefono": "902 255 252",
      "email": "vanesa.flinch@ortoarea.com"
    },
    {
      "nombre": "DentalMonitoring",
      "categoria": "Ortodoncia",
      "descripcion": "Solución de monitorización remota avanzada basada en inteligencia artificial.",
      "condiciones": "10% al 25% de Descuento en packs de licencias+Scanbox.",
      "contacto_nombre": "Juan Carlos Durán",
      "telefono": "623 508 059",
      "email": "j.duran@dental-monitoring.com"
    },
    {
      "nombre": "Infomed (Henry Schein)",
      "categoria": "Ciberseguridad, Telco y Software",
      "descripcion": "Especialistas en desarrollo de software de gestión para centros sanitarios (Gesden).",
      "condiciones": "Atención VIP-fast. Promociones especiales vía DentalQuality.",
      "contacto_nombre": "Lidia Chacón Rubio",
      "telefono": "902 104 422",
      "email": "lidia.chacon@grupoinfomed.es"
    },
    {
      "nombre": "Glofera",
      "categoria": "Ciberseguridad, Telco y Software",
      "descripcion": "Consultoría tecnológica en telecomunicaciones, centralita cloud y ciberseguridad.",
      "condiciones": "Pack Premium Dental Quality: 149€. Incluye protección y telefonía cloud.",
      "contacto_nombre": "Raúl Rodríguez",
      "telefono": "629 352 125",
      "email": "rrodriguez@glofera.com"
    },
    {
      "nombre": "Kokuai",
      "categoria": "Ciberseguridad, Telco y Software",
      "descripcion": "Plataforma de comunicación con IA para gestión de agendas y confirmación de citas.",
      "condiciones": "Instalación/Formación: Gratis. Recall/Marketing: Gratis. Mensualidades: 10% Dto.",
      "contacto_nombre": "Albert Mendieta",
      "telefono": "699 289 238",
      "email": "albert@kokuai.com"
    },
    {
      "nombre": "GPR - Proradium",
      "categoria": "Radiología, UTPR y Dosimetría",
      "descripcion": "Servicios de protección radiológica, gestión de residuos y dosimetría.",
      "condiciones": "15% de Descuento sobre tarifa.",
      "contacto_nombre": "Daniel Pérez",
      "telefono": "606 909 829",
      "email": "administracion@igpr.es"
    },
    {
      "nombre": "Radmedica",
      "categoria": "Radiología, UTPR y Dosimetría",
      "descripcion": "Centros de radiología dental con atención personalizada y procesado avanzado de imagen.",
      "condiciones": "5% de Descuento sobre tarifa. Cita preferencial.",
      "contacto_nombre": "Albert García",
      "telefono": "608 117 242",
      "email": "albert.garcia@radmedica.net"
    },
    {
      "nombre": "Sabadell Consumer",
      "categoria": "Financiación de tratamientos",
      "descripcion": "Agilidad y flexibilidad en la financiación de tratamientos para pacientes.",
      "condiciones": "Condiciones especiales en crédito gratuito, compartido e interés cliente.",
      "contacto_nombre": "José Antonio González",
      "telefono": "629 063 289",
      "email": "gonzalezjosea@bancsabadell.com"
    },
    {
      "nombre": "Kutxabank",
      "categoria": "Financiación de tratamientos",
      "descripcion": "Soluciones de financiación adaptadas con gastos de gestión reducidos.",
      "condiciones": "Tarifas preferentes según plazos (3 a 48 meses).",
      "contacto_nombre": "David Colodrero",
      "telefono": "605 779 819",
      "email": "dcolodrero@kutxabank.es"
    },
    {
      "nombre": "Nowon",
      "categoria": "Financiación de tratamientos",
      "descripcion": "Plataforma multientidad que optimiza la tasa de aceptación de financiaciones.",
      "condiciones": "10% de descuento sobre tarifa de servicios.",
      "contacto_nombre": "Alejandro J. Paredes",
      "telefono": "627 488 323",
      "email": "alejandro.paredes@nowon.es"
    },
    {
      "nombre": "Roca Asociados",
      "categoria": "Gestoría, Seguros, y Legal",
      "descripcion": "Firma de abogados y economistas especializada en asesoramiento de empresas.",
      "condiciones": "Precios especiales en todos sus servicios.",
      "contacto_nombre": "Teresa Anido",
      "telefono": "934 515 666",
      "email": "Teresa.Anido@rocassoc.com"
    },
    {
      "nombre": "Martín y Cachón",
      "categoria": "Gestoría, Seguros, y Legal",
      "descripcion": "Correduría de seguros con trato personal y gestión integral de siniestros.",
      "condiciones": "Máximos descuentos. Garantía de coste inferior si coberturas son iguales.",
      "contacto_nombre": "Andrés Martín",
      "telefono": "670 820 548",
      "email": "amartin@myc.es"
    },
    {
      "nombre": "OTP - Europreven",
      "categoria": "Gestoría, Seguros, y Legal",
      "descripcion": "Especialistas en prevención de riesgos laborales para el sector sanitario.",
      "condiciones": "Tarifa reducida en todas las opciones de servicios.",
      "contacto_nombre": "Ricard Andreu",
      "telefono": "649 819 639",
      "email": "randreu@europreven.es"
    },
    {
      "nombre": "VDoble Consultores",
      "categoria": "Gestoría, Seguros, y Legal",
      "descripcion": "Despacho especializado en la gestión laboral y de relaciones para odontólogos.",
      "condiciones": "Descuentos en todos sus servicios.",
      "contacto_nombre": "Francisco Javier Lucas",
      "telefono": "926 204 814",
      "email": "fj.lucas@vdobleconsultores.com"
    },
    {
      "nombre": "IDH Platform",
      "categoria": "Gestoría, Seguros, y Legal",
      "descripcion": "Herramienta para la recuperación de deuda y consulta de ficheros de solvencia.",
      "condiciones": "20% Dto (8% sobre deuda recuperada). Consultas gratuitas de solvencia.",
      "contacto_nombre": "María García",
      "telefono": "608 924 975",
      "email": "info@idhplatform.com"
    },
    {
      "nombre": "Mediconsulting",
      "categoria": "Gestoría, Seguros, y Legal",
      "descripcion": "Asesoría líder en sector salud (fiscal, societario, laboral y legal).",
      "condiciones": "Descuentos exclusivos en tarifa y consultas gratuitas.",
      "contacto_nombre": "Jordi Reñé",
      "telefono": "935 678 815",
      "email": "jordi.rene@med.es"
    },
    {
      "nombre": "Dentaid",
      "categoria": "Desinfección, Higiene, Análisis y Farma",
      "descripcion": "Líder en investigación y comercialización de productos de Salud Bucal.",
      "condiciones": "Consultar tarifas con descuentos especiales Dental Quality.",
      "contacto_nombre": "Delegado de zona",
      "telefono": "935 809 494",
      "email": "dentaid@dentaid.es"
    },
    {
      "nombre": "Saniswiss",
      "categoria": "Desinfección, Higiene, Análisis y Farma",
      "descripcion": "Alta tecnología suiza para el control de infecciones y desinfectantes.",
      "condiciones": "15% de Descuento sobre tarifa.",
      "contacto_nombre": "Javier Serrano",
      "telefono": "678 778 180",
      "email": "jserrano@saniswiss.es"
    },
    {
      "nombre": "Hyssogenix",
      "categoria": "Desinfección, Higiene, Análisis y Farma",
      "descripcion": "Laboratorio especializado en análisis genéticos y microbiológicos dentales.",
      "condiciones": "14% Descuento medio sobre tarifa.",
      "contacto_nombre": "Fernando López",
      "telefono": "606 558 052",
      "email": "comercial@hyssogenix.com"
    },
    {
      "nombre": "Sipco (Wellisair/Nuvohla)",
      "categoria": "Desinfección, Higiene, Análisis y Farma",
      "descripcion": "Tecnología para desinfectar aire y superficies eliminando 99.9% de virus.",
      "condiciones": "Pack cartuchos: 112€+IVA. Alquiler Nuvohla: 29€+IVA/mes.",
      "contacto_nombre": "Nieves Ruiz",
      "telefono": "623 109 086",
      "email": "info@airepurificado.es"
    },
    {
      "nombre": "Santacreu Design",
      "categoria": "Interiorismo, Mat. Oficina y Otros",
      "descripcion": "Estudio especializado en interiorismo, reformas y diseño de clínicas dentales.",
      "condiciones": "Descuento variable según proyecto.",
      "contacto_nombre": "Jordi Santacreu",
      "telefono": "696 684 062",
      "email": "jordi@santacreudesign.com"
    },
    {
      "nombre": "Sadival",
      "categoria": "Interiorismo, Mat. Oficina y Otros",
      "descripcion": "Fabricante de cestas y lotes de Navidad con primeras marcas.",
      "condiciones": "10% de Descuento sobre tarifa.",
      "contacto_nombre": "Carlos Ginés",
      "telefono": "639 961 395",
      "email": "carlosgines@sadival.com"
    },
    {
      "nombre": "Bruneau",
      "categoria": "Interiorismo, Mat. Oficina y Otros",
      "descripcion": "Proveedor integral de material de oficina, mobiliario y ofimática con servicio 24h.",
      "condiciones": "Tarifa de Gran Cuenta.",
      "contacto_nombre": "Gemma Mares",
      "telefono": "681 607 206",
      "email": "g-mares@bruneau.es"
    }
  ]
}

def sync_proveedores():
    created_count = 0
    updated_count = 0
    
    for prov_data in master_json["proveedores"]:
        # Get or create the category
        cat_name = prov_data["categoria"]
        categoria, _ = Categoria.objects.get_or_create(nombre=cat_name)
        
        # We find provider by name
        prov_obj, created = Proveedor.objects.get_or_create(
            nombre=prov_data["nombre"],
            defaults={
                "descripcion_larga": prov_data["descripcion"],
                "condiciones_especiales": prov_data["condiciones"],
                "contacto_nombre": prov_data["contacto_nombre"],
                "contacto_telefono": prov_data["telefono"],
                "contacto_email": prov_data["email"],
                "activo": True
            }
        )
        
        if not created:
            # Update existing values
            prov_obj.descripcion_larga = prov_data["descripcion"]
            prov_obj.condiciones_especiales = prov_data["condiciones"]
            prov_obj.contacto_nombre = prov_data["contacto_nombre"]
            prov_obj.contacto_telefono = prov_data["telefono"]
            prov_obj.contacto_email = prov_data["email"]
            prov_obj.activo = True
            prov_obj.save()
            updated_count += 1
        else:
            created_count += 1
            
        # Add category to M2M relation
        prov_obj.categorias.add(categoria)

    print(f"Sync complete. Created: {created_count}, Updated: {updated_count}")

if __name__ == "__main__":
    sync_proveedores()
