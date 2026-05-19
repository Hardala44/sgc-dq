"""
sanear_proveedores.py
=====================
Saneamiento crítico del catálogo de proveedores basado en el PDF oficial
"Folder Proveedores DentalQuality".

Uso:
    python manage.py sanear_proveedores             # dry-run (sólo informa, no toca nada)
    python manage.py sanear_proveedores --ejecutar  # aplica los cambios en una sola transacción

Lógica:
  1. Para cada entrada del PDF se busca el mejor candidato en BD (coincidencia exacta
     de nombre, o la mayor similitud normalizada).
  2. Si hay varios candidatos para la misma entrada PDF, el primero con nombre exacto
     es el "Maestro"; los demás son duplicados.
  3. Antes de eliminar un duplicado, todas sus FK (Gasto, ProductoLegado,
     ProveedorOferta, ProductoEstrella, LeadSolicitud, Pedido) se reasignan al Maestro.
  4. Los campos del Maestro se actualizan SÓLO si difieren del PDF (no invasivo).
  5. Todo el proceso va envuelto en transaction.atomic(). Un error aborta TODO.
  6. Al finalizar se muestra la lista de proveedores sin logo.

Audit CSV (dry-run):
  Genera auditoria_saneamiento.csv con una fila por proveedor BD:
    Estado | ID Original | Nombre Actual | Acción Planificada |
    Impacto en Gastos | Impacto en Marketplace | Validación de Ahorro
"""

import csv
import os
import unicodedata
import re
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand
from django.db import transaction

from compras.models import (
    Proveedor, ProductoLegado, ProveedorOferta, ProductoEstrella, LeadSolicitud, Pedido,
)
from core.models import Gasto


# ─────────────────────────────────────────────────────────────────────────────
# FUENTE DE VERDAD: datos extraídos del PDF oficial DentalQuality
# ─────────────────────────────────────────────────────────────────────────────
# Formato por entrada:
#   nombre_pdf         : nombre canónico según el PDF (es el "master name")
#   contacto_nombre    : persona de contacto
#   contacto_email     : email principal
#   contacto_telefono  : teléfono principal
#   ahorro_estimado    : ratio 0-1 (p.ej. 0.08 = 8%). None si es variable/no aplica.
#   condiciones        : texto breve de condiciones especiales
#   url_web            : (opcional)
# ─────────────────────────────────────────────────────────────────────────────

PROVEEDORES_PDF = [
    # ── Depósitos, Aparatología y SAT ─────────────────────────────────────────
    {
        "nombre_pdf": "Henry Schein",
        "alias": ["Henry Schein Schmidt", "HENRY SCHEIN"],
        "contacto_nombre": "Sonia Pereira",
        "contacto_email": "sonia.pereira@henryschein.es",
        "contacto_telefono": "913606000",
        "ahorro_estimado": Decimal("0.0800"),
        "condiciones": (
            "Marca HenrySchein: 47% Dto. | Marcas Corporativas: 47% Dto. | "
            "Normon: 40% Dto. | Productos de Catálogo: 35% Dto. mín | "
            "Ivoclar-Vivadent, 3M, VOCO, Komet (sin bloques): 32% Dto."
        ),
        "url_web": "https://www.henryschein.es",
    },
    {
        "nombre_pdf": "Proclinic",
        "alias": ["PROCLINIC,S.A", "PROCLINIC S.A", "Proclinic Group"],
        "contacto_nombre": "Paola Alemán",
        "contacto_email": "paola.aleman@proclinic.es",
        "contacto_telefono": "976287799",
        "ahorro_estimado": Decimal("0.3000"),
        "condiciones": (
            "Marca Proclinic: 40% Dto. | Tarifa general: 30% Dto. | "
            "Pequeña aparatología: 25% Dto. | Laboratorio y CAD-CAM: 25% Dto. | "
            "Portes gratuitos"
        ),
        "url_web": "https://www.proclinic.es",
    },
    {
        "nombre_pdf": "Broker Dental",
        "alias": ["BROKER DENTAL", "BrokerDental"],
        "contacto_nombre": "Isaac Núñez",
        "contacto_email": "broker@brokerdental.es",
        "contacto_telefono": "900300269",
        "ahorro_estimado": Decimal("0.2500"),
        "condiciones": "Tarifa general: 25% Dto. | Pequeña aparatología: 10% Dto.",
        "url_web": "https://www.brokerdental.es",
    },
    {
        "nombre_pdf": "DVD Dental",
        "alias": ["DVD", "DVD DENTAL", "D.V.D."],
        "contacto_nombre": "Maite López",
        "contacto_email": "pedidos@dvd-dental.com",
        "contacto_telefono": "900300475",
        "ahorro_estimado": Decimal("0.3000"),
        "condiciones": "Marca Nacional: 30% Dto. | Marcas Exclusivas: 50% Dto.",
        "url_web": "https://www.dvd-dental.com",
    },
    {
        "nombre_pdf": "Axis Dental",
        "alias": ["AXIS DENTAL", "Axis"],
        "contacto_nombre": "Santiago María",
        "contacto_email": "info@axis-dental.es",
        "contacto_telefono": "916795980",
        "ahorro_estimado": Decimal("0.1000"),
        "condiciones": "10% de Descuento sobre tarifa",
        "url_web": "https://www.axis-dental.es",
    },
    {
        "nombre_pdf": "Akura",
        "alias": ["AKURA", "Akura Medical"],
        "contacto_nombre": "Charlotte Helt",
        "contacto_email": "charlotte@akura-medical.com",
        "contacto_telefono": "664509852",
        "ahorro_estimado": None,
        "condiciones": "Catálogo de ofertas especiales DentalQuality | Compras agrupadas",
        "url_web": "",
    },
    {
        "nombre_pdf": "Adiemed",
        "alias": ["ADIEMED"],
        "contacto_nombre": "Juan Barrero",
        "contacto_email": "jbarrero@adiemed.com",
        "contacto_telefono": "619702898",
        "ahorro_estimado": None,
        "condiciones": "Precio especial Samaritan PAD 350P: 945€+IVA | Mantenimiento: 99€+IVA cada 4 años",
        "url_web": "",
    },
    {
        "nombre_pdf": "Endovations",
        "alias": ["ENDOVATIONS", "EndoMations"],
        "contacto_nombre": "Aníbal Tronco",
        "contacto_email": "info@endovations.es",
        "contacto_telefono": "984491808",
        "ahorro_estimado": None,
        "condiciones": "Tarifa Especial VIP | Portes gratuitos | Factura única mensual | Formación y asesoramiento",
        "url_web": "",
    },
    {
        "nombre_pdf": "Katia Dental",
        "alias": ["KATIA DENTAL", "Katia"],
        "contacto_nombre": "Carolina Quinteiro",
        "contacto_email": "cquinteiro@katiadental.com",
        "contacto_telefono": "934090600",
        "ahorro_estimado": Decimal("0.2500"),
        "condiciones": "25% de Descuento sobre tarifa",
        "url_web": "https://www.katiadental.com",
    },
    {
        "nombre_pdf": "EMS",
        "alias": ["E.M.S.", "EMS Dental"],
        "contacto_nombre": "Alexandra Carrillo",
        "contacto_email": "acarrillocasas@ems-espana.com",
        "contacto_telefono": "672001690",
        "ahorro_estimado": Decimal("0.1500"),
        "condiciones": "AirFlow Prophylaxis Master + Station Plus: 8.963,25€ | Resto: 15% Dto.",
        "url_web": "https://www.ems-dental.com",
    },
    {
        "nombre_pdf": "BMG - Dentalhitec",
        "alias": ["BMG", "Dentalhitec", "BMG Dentalhitec", "BMG – Dentalhitec"],
        "contacto_nombre": "Antonio Barreiro",
        "contacto_email": "antoniobarreiro@bmggrup.com",
        "contacto_telefono": "615996995",
        "ahorro_estimado": Decimal("0.0800"),
        "condiciones": "8% Descuento en QuickSleeper | Descuentos variables en el resto",
        "url_web": "",
    },
    {
        "nombre_pdf": "Global Uniforms (Cherokee)",
        "alias": ["Cherokee", "CHEROKEE", "Global Uniforms", "Cherokee Medical Uniforms"],
        "contacto_nombre": "Alex Noguera",
        "contacto_email": "alexnoguera@globaluniforms.es",
        "contacto_telefono": "933072229",
        "ahorro_estimado": Decimal("0.1000"),
        "condiciones": "10% de Descuento sobre tarifa",
        "url_web": "",
    },
    {
        "nombre_pdf": "RoBenitez",
        "alias": ["R de Benitez", "RdeBenitez", "Ro Benitez"],
        "contacto_nombre": "Laura Benítez",
        "contacto_email": "rdebentiez@gmail.com",
        "contacto_telefono": "952608246",
        "ahorro_estimado": Decimal("0.0300"),
        "condiciones": "3% de Descuento sobre tarifa",
        "url_web": "",
    },
    # ── Laboratorios ──────────────────────────────────────────────────────────
    {
        "nombre_pdf": "Ceranium",
        "alias": ["CERANIUM", "Laboratorio Ceranium"],
        "contacto_nombre": "Víctor Puertas",
        "contacto_email": "victor.puertas@laboratorioceranium.com",
        "contacto_telefono": "696514302",
        "ahorro_estimado": Decimal("0.1000"),
        "condiciones": "Acceso directo a tarifa más reducida | 10% Dto. extra durante los 3 primeros meses",
        "url_web": "",
    },
    {
        "nombre_pdf": "Mondental",
        "alias": ["MONDENTAL", "Mondental Corus"],
        "contacto_nombre": "María Alejandra Pérez",
        "contacto_email": "mondental@corusdental.com",
        "contacto_telefono": "602250951",
        "ahorro_estimado": Decimal("0.0500"),
        "condiciones": "Tarifa especial 5% Dto. medio (excepto marcas)",
        "url_web": "",
    },
    {
        "nombre_pdf": "ConVadent",
        "alias": ["CONVADENT", "ConVadent Digital"],
        "contacto_nombre": "Antonio Contreras",
        "contacto_email": "acontreras@convadent.com",
        "contacto_telefono": "610733159",
        "ahorro_estimado": Decimal("0.1250"),
        "condiciones": "Descuento medio para el grupo: 12,5%",
        "url_web": "",
    },
    # ── Gestión, Marketing y Selección de personal ────────────────────────────
    {
        "nombre_pdf": "Aesinergy",
        "alias": ["AESINERGY", "Aesinergy Consultoría"],
        "contacto_nombre": "Javier López",
        "contacto_email": "Javier.lopez@aesinergy.es",
        "contacto_telefono": "678000339",
        "ahorro_estimado": Decimal("0.0500"),
        "condiciones": "5% de Descuento en todos los servicios",
        "url_web": "",
    },
    {
        "nombre_pdf": "Talent Salud",
        "alias": ["TALENT SALUD", "TalentSalud"],
        "contacto_nombre": "Mónica Forns",
        "contacto_email": "seleccion@talentsalud.es",
        "contacto_telefono": "679845775",
        "ahorro_estimado": None,
        "condiciones": "Personal técnico/auxiliar: 845€+IVA | Doctores: 940€+IVA",
        "url_web": "",
    },
    {
        "nombre_pdf": "DigiMevo",
        "alias": ["DIGIMEVO", "Digi-m-Evo", "DigimEvo"],
        "contacto_nombre": "Xavier Lleixa",
        "contacto_email": "xavier.lleixa@digimevo.com",
        "contacto_telefono": "672257053",
        "ahorro_estimado": Decimal("0.2500"),
        "condiciones": "25% de Descuento sobre tarifa | Pago inicial 150€ | Mensualidad 30€/mes",
        "url_web": "",
    },
    {
        "nombre_pdf": "Astute Control",
        "alias": ["ASTUTE CONTROL", "AstuteControl"],
        "contacto_nombre": "Martín Fungini",
        "contacto_email": "mfg@astutecontrol.com",
        "contacto_telefono": "640224430",
        "ahorro_estimado": Decimal("0.1500"),
        "condiciones": "15% de Descuento → Renting 24 meses - 69€+IVA",
        "url_web": "",
    },
    # ── Implantología, biomaterial y anestesia ────────────────────────────────
    {
        "nombre_pdf": "Straumann",
        "alias": ["STRAUMANN", "Grupo Straumann", "GRUPO STRAUMANN"],
        "contacto_nombre": "Ángel Saura",
        "contacto_email": "angel.saura@straumann.com",
        "contacto_telefono": "650316634",
        "ahorro_estimado": Decimal("0.3300"),
        "condiciones": (
            "Implantes y pilares: 33% mín | Roxolid SLA: 189,50€ | "
            "Biomateriales: 30% mín | Pack Bienvenida: 2.546€"
        ),
        "url_web": "https://www.straumann.com",
    },
    {
        "nombre_pdf": "ZimVie",
        "alias": ["ZIMVIE", "Zimmer Biomet", "ZIMMER BIOMET", "Zimvie"],
        "contacto_nombre": "Iván Andreu",
        "contacto_email": "ivan.andreu@zimvie.com",
        "contacto_telefono": "607792036",
        "ahorro_estimado": Decimal("0.5000"),
        "condiciones": "Implantes y aditamentos: 50% Dto. | Regeneración: 20-50% | Digital: 20-40%",
        "url_web": "https://www.zimvie.com",
    },
    {
        "nombre_pdf": "BiteRight",
        "alias": ["BITERIGHT", "Bite Right"],
        "contacto_nombre": "Lorenzo Gimeno",
        "contacto_email": "lorenzo.gimeno@biteright.dental",
        "contacto_telefono": "625069847",
        "ahorro_estimado": Decimal("0.0700"),
        "condiciones": "7% de Descuento mínimo sobre tarifa",
        "url_web": "",
    },
    {
        "nombre_pdf": "Inibsa",
        "alias": ["INIBSA", "Inibsa Dental"],
        "contacto_nombre": "Rebeca Herrero",
        "contacto_email": "dental.pedidos@inibsa.com",
        "contacto_telefono": "938609512",
        "ahorro_estimado": Decimal("0.3000"),
        "condiciones": (
            "Anestesia: >30% | Agujas: 50% | Desinfección: 25-32% | "
            "Biomateriales: 21% | Suturas seda: 37% | Restauración: 25-42%"
        ),
        "url_web": "https://www.inibsa.com",
    },
    {
        "nombre_pdf": "IPD",
        "alias": ["I.P.D.", "IPD Aditamentos"],
        "contacto_nombre": "Manuel Villagordo",
        "contacto_email": "mvillagordo@ipd2004.com",
        "contacto_telefono": "610571119",
        "ahorro_estimado": None,
        "condiciones": "Tarifa específica para DentalQuality",
        "url_web": "",
    },
    {
        "nombre_pdf": "Iosfix",
        "alias": ["IOSFIX", "IOS FIX"],
        "contacto_nombre": "Jorge García",
        "contacto_email": "j.garcia@iosfix.dental",
        "contacto_telefono": "654365539",
        "ahorro_estimado": None,
        "condiciones": "Primera corrección RingFix gratis | Cada 5 correcciones, una gratuita",
        "url_web": "",
    },
    {
        "nombre_pdf": "Botiss",
        "alias": ["BOTISS", "Botiss Biomaterials"],
        "contacto_nombre": "Alberto Espejo",
        "contacto_email": "aespejo@klockner.es",
        "contacto_telefono": "931851904",
        "ahorro_estimado": Decimal("0.1500"),
        "condiciones": "15% de Descuento sobre tarifa",
        "url_web": "",
    },
    # ── Ortodoncia ────────────────────────────────────────────────────────────
    {
        "nombre_pdf": "Ormco Spark",
        "alias": ["ORMCO", "Ormco", "Spark", "ORMCO - SPARK"],
        "contacto_nombre": "José Jiménez",
        "contacto_email": "jose.jimenez@envistaco.com",
        "contacto_telefono": "650458866",
        "ahorro_estimado": Decimal("0.4800"),
        "condiciones": "Descuento mínimo Spark: 48% | 52% al alcanzar 3.000€ en ortodoncia tradicional",
        "url_web": "",
    },
    {
        "nombre_pdf": "Imperortho",
        "alias": ["IMPERORTHO", "Imper Ortho"],
        "contacto_nombre": "Víctor Camps",
        "contacto_email": "victor@imperortho.com",
        "contacto_telefono": "962415647",
        "ahorro_estimado": Decimal("0.2000"),
        "condiciones": "20% Dto. sobre tarifa general | 10% en Microimplantes",
        "url_web": "",
    },
    {
        "nombre_pdf": "DentalMonitoring",
        "alias": ["DENTALMONITORING", "Dental Monitoring"],
        "contacto_nombre": "Juan Carlos Durán",
        "contacto_email": "j.duran@dental-monitoring.com",
        "contacto_telefono": "623508059",
        "ahorro_estimado": Decimal("0.1500"),
        "condiciones": "10% al 25% de Descuento en packs licencias+Scanbox",
        "url_web": "",
    },
    {
        "nombre_pdf": "Ortoarea",
        "alias": ["ORTOAREA", "Orto Area"],
        "contacto_nombre": "Vanesa Flinch",
        "contacto_email": "vanesa.flinch@ortoarea.com",
        "contacto_telefono": "902255252",
        "ahorro_estimado": None,
        "condiciones": "Tarifa Reducida y ofertas específicas",
        "url_web": "",
    },
    {
        "nombre_pdf": "Forestadent",
        "alias": ["FORESTADENT", "Foresta Dent"],
        "contacto_nombre": "Alexis Alonso",
        "contacto_email": "a.alonso@forestadent.es",
        "contacto_telefono": "669704477",
        "ahorro_estimado": None,
        "condiciones": "TARIFA GOLD",
        "url_web": "https://www.forestadent.com",
    },
    # ── Ciberseguridad, Telco y Software ─────────────────────────────────────
    {
        "nombre_pdf": "Glofera",
        "alias": ["GLOFERA", "Glofera Ciberseguridad"],
        "contacto_nombre": "Raúl Rodríguez",
        "contacto_email": "rrodriguez@glofera.com",
        "contacto_telefono": "629352125",
        "ahorro_estimado": None,
        "condiciones": "Pack Premium DentalQuality: 149€/mes",
        "url_web": "",
    },
    {
        "nombre_pdf": "Infomed",
        "alias": ["INFOMED", "Henry Schein Infomed"],
        "contacto_nombre": "Lidia Chacón Rubio",
        "contacto_email": "lidia.chacon@grupoinfomed.es",
        "contacto_telefono": "902104422",
        "ahorro_estimado": None,
        "condiciones": "Atención VIP-fast en Servicio Técnico | Promociones especiales",
        "url_web": "",
    },
    {
        "nombre_pdf": "Kokuai",
        "alias": ["KOKUAI"],
        "contacto_nombre": "Albert Mendieta",
        "contacto_email": "albert@kokuai.com",
        "contacto_telefono": "699289238",
        "ahorro_estimado": Decimal("0.1000"),
        "condiciones": "Instalación y formación: Gratis | Recall y Marketing: Gratis | Mensualidades: 10% Dto.",
        "url_web": "",
    },
    # ── Radiología, UTPR y Dosimetría ─────────────────────────────────────────
    {
        "nombre_pdf": "IGPR",
        "alias": ["iGPR", "Proradium", "PRORADIUM", "IGPR Protección Radiológica"],
        "contacto_nombre": "Daniel Pérez",
        "contacto_email": "administracion@igpr.es",
        "contacto_telefono": "606909829",
        "ahorro_estimado": Decimal("0.1500"),
        "condiciones": "15% de Descuento sobre tarifa",
        "url_web": "",
    },
    {
        "nombre_pdf": "Radmedica",
        "alias": ["RADMEDICA", "Rad Medica"],
        "contacto_nombre": "Albert García",
        "contacto_email": "albert.garcia@radmedica.net",
        "contacto_telefono": "608117242",
        "ahorro_estimado": Decimal("0.0500"),
        "condiciones": "5% de Descuento sobre tarifa",
        "url_web": "",
    },
    # ── Financiación de tratamientos ──────────────────────────────────────────
    {
        "nombre_pdf": "Sabadell Consumer",
        "alias": ["SABADELL", "Banco Sabadell", "Sabadell"],
        "contacto_nombre": "José Antonio González",
        "contacto_email": "gonzalezjosea@bancsabadell.com",
        "contacto_telefono": "629063289",
        "ahorro_estimado": None,
        "condiciones": "Crédito gratuito: hasta 36 meses | Crédito Interés cliente: 9,75% TIN",
        "url_web": "",
    },
    {
        "nombre_pdf": "Kutxabank",
        "alias": ["KUTXABANK", "Kutxa"],
        "contacto_nombre": "David Colodrero",
        "contacto_email": "dcolodrero@kutxabank.es",
        "contacto_telefono": "605779819",
        "ahorro_estimado": None,
        "condiciones": "Financiación a pacientes con condiciones especiales Gran Cuenta",
        "url_web": "",
    },
    {
        "nombre_pdf": "Nowon",
        "alias": ["NOWON", "Now On"],
        "contacto_nombre": "Alejandro J. Paredes",
        "contacto_email": "alejandro.paredes@nowon.es",
        "contacto_telefono": "627488323",
        "ahorro_estimado": Decimal("0.1000"),
        "condiciones": "10% de descuento sobre tarifa de servicios",
        "url_web": "",
    },
    # ── Gestoría, Seguros y Legal ─────────────────────────────────────────────
    {
        "nombre_pdf": "Roca Asociados",
        "alias": ["ROCA ASOCIADOS", "Tormat Roca Asociados", "Tormat"],
        "contacto_nombre": "Teresa Anido",
        "contacto_email": "Teresa.Anido@rocassoc.com",
        "contacto_telefono": "934515666",
        "ahorro_estimado": None,
        "condiciones": "Precios especiales en todos sus servicios",
        "url_web": "",
    },
    {
        "nombre_pdf": "Martín y Cachón",
        "alias": ["MARTIN Y CACHON", "Martín y Cachon", "Martín Cachón"],
        "contacto_nombre": "Andrés Martín",
        "contacto_email": "amartin@myc.es",
        "contacto_telefono": "670820548",
        "ahorro_estimado": None,
        "condiciones": "Máximos descuentos en cada póliza | Garantía coste inferior al seguro actual",
        "url_web": "",
    },
    {
        "nombre_pdf": "IDH Platform",
        "alias": ["IDHPLATFORM", "IDHPlatform", "IDH"],
        "contacto_nombre": "María García",
        "contacto_email": "info@idhplatform.com",
        "contacto_telefono": "608924975",
        "ahorro_estimado": Decimal("0.0800"),
        "condiciones": "20% de descuento → 8% sobre la deuda recuperada",
        "url_web": "",
    },
    {
        "nombre_pdf": "Grupo OTP",
        "alias": ["OTP", "GRUPO OTP", "OTP Europreven", "Europreven"],
        "contacto_nombre": "Ricard Andreu",
        "contacto_email": "randreu@europreven.es",
        "contacto_telefono": "649819639",
        "ahorro_estimado": None,
        "condiciones": "Tarifa reducida en todas las opciones de sus servicios",
        "url_web": "",
    },
    {
        "nombre_pdf": "VDoble Consultores",
        "alias": ["VDOBLE", "VDoble", "V Doble Consultores"],
        "contacto_nombre": "Francisco Javier Lucas",
        "contacto_email": "fj.lucas@vdobleconsultores.com",
        "contacto_telefono": "926204814",
        "ahorro_estimado": None,
        "condiciones": "Descuentos en todos sus servicios",
        "url_web": "",
    },
    {
        "nombre_pdf": "Mediconsulting",
        "alias": ["MEDICONSULTING", "Medico Consulting"],
        "contacto_nombre": "Jordi Reñé",
        "contacto_email": "jordi.rene@med.es",
        "contacto_telefono": "935678815",
        "ahorro_estimado": None,
        "condiciones": "Descuentos exclusivos en tarifa y Consultas gratuitas",
        "url_web": "",
    },
    # ── Desinfección, Análisis e Higiene ──────────────────────────────────────
    {
        "nombre_pdf": "Dentaid",
        "alias": ["DENTAID"],
        "contacto_nombre": "Delegado de zona",
        "contacto_email": "dentaid@dentaid.es",
        "contacto_telefono": "935809494",
        "ahorro_estimado": None,
        "condiciones": "Consultar tarifas con descuentos especiales para DentalQuality",
        "url_web": "https://www.dentaid.es",
    },
    {
        "nombre_pdf": "Saniswiss",
        "alias": ["SANISWISS", "Sani Swiss"],
        "contacto_nombre": "Javier Serrano",
        "contacto_email": "jserrano@saniswiss.es",
        "contacto_telefono": "678778180",
        "ahorro_estimado": Decimal("0.1500"),
        "condiciones": "15% de Descuento sobre tarifa",
        "url_web": "",
    },
    {
        "nombre_pdf": "Hyssogenix",
        "alias": ["HYSSOGENIX", "Hussogenix"],
        "contacto_nombre": "Fernando López",
        "contacto_email": "comercial@hyssogenix.com",
        "contacto_telefono": "606558052",
        "ahorro_estimado": Decimal("0.1400"),
        "condiciones": "14% Descuento medio sobre tarifa",
        "url_web": "",
    },
    {
        "nombre_pdf": "Sipco Environmental (Wellisair)",
        "alias": ["SIPCO", "Wellisair", "WELLISAIR", "Sipco Environmental Solutions"],
        "contacto_nombre": "Nieves Ruiz",
        "contacto_email": "info@airepurificado.es",
        "contacto_telefono": "623109086",
        "ahorro_estimado": Decimal("0.2000"),
        "condiciones": "Pack 4 cartuchos: 112€+IVA | Alquiler Nuvohla: 29€+IVA/mes",
        "url_web": "",
    },
    # ── Interiorismo, Mat. Oficina y Otros ────────────────────────────────────
    {
        "nombre_pdf": "Santacreu Design",
        "alias": ["SANTACREU", "Santacreu", "Interiorismo Santacreu"],
        "contacto_nombre": "Jordi Santacreu",
        "contacto_email": "jordi@santacreudesign.com",
        "contacto_telefono": "696684062",
        "ahorro_estimado": None,
        "condiciones": "Descuento variable según proyecto",
        "url_web": "",
    },
    {
        "nombre_pdf": "Bruneau",
        "alias": ["BRUNEAU", "Pickin Pack"],
        "contacto_nombre": "Gemma Mares",
        "contacto_email": "g-mares@bruneau.es",
        "contacto_telefono": "681607206",
        "ahorro_estimado": None,
        "condiciones": "Tarifa de Gran Cuenta",
        "url_web": "https://www.bruneau.es",
    },
    {
        "nombre_pdf": "Sadival",
        "alias": ["SADIVAL"],
        "contacto_nombre": "Carlos Ginés",
        "contacto_email": "carlosgines@sadival.com",
        "contacto_telefono": "639961395",
        "ahorro_estimado": Decimal("0.1000"),
        "condiciones": "10% de Descuento sobre tarifa",
        "url_web": "",
    },
]


# ─────────────────────────────────────────────────────────────────────────────
# Categoría según sección del PDF (página 2)
# ─────────────────────────────────────────────────────────────────────────────
# Mapeo nombre_pdf → sección del PDF (categoría macro)
# ─────────────────────────────────────────────────────────────────────────────
# Mapeo PDF-sección → ID de categoría existente en BD (NO crear nuevas)
# Fuente de verdad: SELECT id, nombre FROM compras_categoria ORDER BY id
#   [109] Depósitos y Aparatología
#   [110] Implantología
#   [111] Ortodoncia
#   [112] Laboratorio
#   [113] Financieras
#   [114] Servicios
#   [115] Software y Ciberseguridad    (parent=114)
#   [116] Gestión y marketing dental   (parent=114)
#   [117] Radiología UTPR y Dosimetría (parent=114)
#   [118] Gestoría y Seguros           (parent=114)
#   [119] Otros
# ─────────────────────────────────────────────────────────────────────────────
# nombre_pdf → lista de IDs de categorías que aplican a ese proveedor
PDF_CATEGORIA_IDS: dict[str, list[int]] = {
    # Depósitos, Aparatología y SAT → [109] + opcionalmente [110] si es implanto
    "Henry Schein":                 [109],
    "Proclinic":                    [109],
    "Broker Dental":                [109],
    "DVD Dental":                   [109],
    "Axis Dental":                  [109],
    "Akura":                        [109],
    "Adiemed":                      [109],
    "Endovations":                  [109],
    "Katia Dental":                 [109],
    "EMS":                          [109],
    "BMG - Dentalhitec":            [109],
    "Global Uniforms (Cherokee)":   [109],
    "RoBenitez":                    [109],
    # Laboratorios → [112]
    "Ceranium":                     [112],
    "Mondental":                    [112],
    "ConVadent":                    [112],
    # Gestión, Marketing y RRHH → [116]
    "Aesinergy":                    [116],
    "Talent Salud":                 [116],
    "DigiMevo":                     [116],
    "Astute Control":               [116],
    # Implantología, Biomaterial y Anestesia → [110]
    "Straumann":                    [110],
    "ZimVie":                       [110],
    "BiteRight":                    [110],
    "Inibsa":                       [110],
    "IPD":                          [110],
    "Iosfix":                       [110],
    "Botiss":                       [110],
    # Ortodoncia → [111]
    "Ormco Spark":                  [111],
    "Imperortho":                   [111],
    "DentalMonitoring":             [111],
    "Ortoarea":                     [111],
    "Forestadent":                  [111],
    # Ciberseguridad, Telco y Software → [115]
    "Glofera":                      [115],
    "Infomed":                      [115],
    "Kokuai":                       [115],
    # Radiología, UTPR y Dosimetría → [117]
    "IGPR":                         [117],
    "Radmedica":                    [117],
    # Financiación de Tratamientos → [113]
    "Sabadell Consumer":            [113],
    "Kutxabank":                    [113],
    "Nowon":                        [113],
    # Gestoría, Seguros y Legal → [118]
    "Roca Asociados":               [118],
    "Martín y Cachón":              [118],
    "IDH Platform":                 [118],
    "Grupo OTP":                    [118],
    "VDoble Consultores":           [118],
    "Mediconsulting":               [118],
    # Desinfección, Análisis e Higiene → [109] (consumibles dentales / depósitos)
    "Dentaid":                      [109],
    "Saniswiss":                    [109],
    "Hyssogenix":                   [109],
    "Sipco Environmental (Wellisair)": [109],
    # Interiorismo, Material de Oficina y Otros → [119]
    "Santacreu Design":             [119],
    "Bruneau":                      [119],
    "Sadival":                      [119],
}

# Etiqueta legible para el CSV de auditoría (sin cambiar nada en BD)
PDF_CATEGORIA = {k: ",".join(str(i) for i in v) for k, v in PDF_CATEGORIA_IDS.items()}

# Ruta al Excel de ahorro estimado (relativa a BASE_DIR del proyecto)
# Sube: commands/ → management/ → core/ → backend/ → sgc-dq/ (workspace root)
_EXCEL_AHORRO = os.path.join(
    os.path.dirname(__file__),          # .../core/management/commands/
    *(['..'] * 4),                      # sube hasta la raíz del workspace
    'Ahorro Estimado (1).xlsx',
)


def _load_excel_ahorro() -> dict:
    """
    Lee la hoja 'AHORRO ESTIMADO' del Excel y devuelve
    {nombre_norm: valor_decimal_or_str}.
    Valores no numéricos (textos como 'PENDIENTE REUNIÓN') se guardan como str.
    """
    try:
        import openpyxl
        wb = openpyxl.load_workbook(_EXCEL_AHORRO, read_only=True, data_only=True)
        ws = wb['AHORRO ESTIMADO']
        result = {}
        first = True
        for row in ws.iter_rows(values_only=True):
            if first:
                first = False
                continue  # skip header
            if not row or row[0] is None:
                continue
            raw_name = str(row[0]).strip()
            raw_val = row[1]
            norm_name = _norm(raw_name)
            if isinstance(raw_val, (int, float)):
                try:
                    result[norm_name] = Decimal(str(raw_val))
                except InvalidOperation:
                    result[norm_name] = str(raw_val)
            elif raw_val is not None:
                result[norm_name] = str(raw_val).strip()
            else:
                result[norm_name] = None
        wb.close()
        return result
    except Exception as exc:
        return {"__error__": str(exc)}


def _match_excel_ahorro(excel_map: dict, provider_name: str, aliases: list) -> tuple:
    """
    Intenta encontrar la entrada del Excel que corresponde a este proveedor.
    Busca por nombre normalizado y aliases.
    Devuelve (excel_key, excel_value) o (None, None).
    """
    candidates = [provider_name] + (aliases or [])
    for name in candidates:
        norm = _norm(name)
        if norm in excel_map:
            return (name, excel_map[norm])
        # partial match
        for ek, ev in excel_map.items():
            if norm in ek or ek in norm:
                return (name, ev)
    return (None, None)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _norm(s: str) -> str:
    """Normaliza un string para comparación: minúsculas, sin tildes, sin puntuación."""
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return re.sub(r'\s+', ' ', s).strip()


def _reassign_gastos(dup: "Proveedor", master: "Proveedor") -> tuple[int, int]:
    """
    Reasigna los Gastos del duplicado al maestro respetando el unique_together
    (clinic, year, quarter, category, proveedor).

    - Si el maestro NO tiene ya ese combo → update directo.
    - Si el maestro YA tiene ese combo → suma amount+ahorro_aprox al registro
      del maestro y elimina el del duplicado.

    Devuelve (n_updated, n_merged_deleted).
    """
    updated = merged = 0
    for gasto in list(Gasto.objects.filter(proveedor=dup)):
        conflict = Gasto.objects.filter(
            clinic=gasto.clinic,
            year=gasto.year,
            quarter=gasto.quarter,
            category=gasto.category,
            proveedor=master,
        ).first()
        if conflict is None:
            gasto.proveedor = master
            gasto.save(update_fields=["proveedor"])
            updated += 1
        else:
            conflict.amount += gasto.amount
            conflict.ahorro_aprox += gasto.ahorro_aprox
            conflict.save(update_fields=["amount", "ahorro_aprox"])
            gasto.delete()
            merged += 1
    return updated, merged


def _reassign_ofertas(dup: "Proveedor", master: "Proveedor") -> tuple[int, int]:
    """
    Reasigna ProveedorOfertas del duplicado al maestro.
    unique_together: (proveedor, sku).
    - Sin conflicto → update.
    - Con conflicto (mismo SKU en el maestro) → elimina la del duplicado.
    """
    updated = removed = 0
    for oferta in list(ProveedorOferta.objects.filter(proveedor=dup)):
        if ProveedorOferta.objects.filter(proveedor=master, sku=oferta.sku).exists():
            oferta.delete()
            removed += 1
        else:
            oferta.proveedor = master
            oferta.save(update_fields=["proveedor"])
            updated += 1
    return updated, removed


def _score(db_name: str, pdf_entry: dict) -> int:
    """
    Devuelve la puntuación de coincidencia entre un nombre de BD y una entrada PDF.
    3 = coincidencia exacta normalizada con nombre_pdf
    2 = coincidencia exacta normalizada con algún alias
    1 = el nombre_pdf normalizado está contenido en db_name normalizado (o viceversa)
    0 = sin coincidencia
    """
    dn = _norm(db_name)
    pn = _norm(pdf_entry["nombre_pdf"])
    if dn == pn:
        return 3
    for alias in pdf_entry.get("alias", []):
        if dn == _norm(alias):
            return 2
    if pn in dn or dn in pn:
        return 1
    for alias in pdf_entry.get("alias", []):
        an = _norm(alias)
        if an in dn or dn in an:
            return 1
    return 0


def _has_logo(p: Proveedor) -> bool:
    return bool(p.logo_url) or bool(p.logo)


def _count_fk(prov: Proveedor) -> dict:
    return {
        "gastos":          Gasto.objects.filter(proveedor=prov).count(),
        "productos":       ProductoLegado.objects.filter(proveedor=prov).count(),
        "ofertas":         ProveedorOferta.objects.filter(proveedor=prov).count(),
        "estrellas":       ProductoEstrella.objects.filter(proveedor=prov).count(),
        "leads":           LeadSolicitud.objects.filter(proveedor=prov).count(),
        "pedidos":         Pedido.objects.filter(proveedor=prov).count(),
    }


def _total_fk(counts: dict) -> int:
    return sum(counts.values())


def _pick_master(candidates: list[Proveedor], pdf_entry: dict) -> Proveedor:
    """
    Elige el maestro entre varios candidatos.
    Prioridad: nombre exacto PDF > más FKs > más campos rellenos.
    """
    # Exacto con nombre PDF
    for p in candidates:
        if _norm(p.nombre) == _norm(pdf_entry["nombre_pdf"]):
            return p
    # Mayor cantidad de relaciones (más datos reales en BD)
    return max(candidates, key=lambda p: _total_fk(_count_fk(p)))


def _fields_differ(master: Proveedor, pdf: dict, excel_map: dict) -> dict:
    """
    Devuelve un dict con los campos que difieren del PDF/Excel.
    REGLA FINANCIERA: ahorro_estimado se toma EXCLUSIVAMENTE del Excel.
      - Si el Excel tiene un valor numérico → úsalo.
      - Si el Excel tiene texto (PENDIENTE…) o no tiene entrada → mantén BD actual (no modificar).
      - El valor del PDF se ignora completamente para este campo.
    """
    diffs = {}
    checks = [
        ("contacto_nombre",   pdf["contacto_nombre"]),
        ("contacto_email",    pdf["contacto_email"]),
        ("contacto_telefono", pdf["contacto_telefono"]),
    ]
    if pdf["condiciones"]:
        checks.append(("condiciones_especiales", pdf["condiciones"]))
    if pdf.get("url_web"):
        checks.append(("url_web", pdf["url_web"]))

    for field, pdf_val in checks:
        db_val = getattr(master, field)
        if str(db_val or "").strip() != str(pdf_val or "").strip():
            diffs[field] = (db_val, pdf_val)

    # ── ahorro_estimado: fuente exclusiva = Excel ──────────────────────────
    _, excel_raw = _match_excel_ahorro(excel_map, pdf["nombre_pdf"], pdf.get("alias", []))
    if isinstance(excel_raw, Decimal):
        db_dec = Decimal(str(master.ahorro_estimado)) if master.ahorro_estimado is not None else None
        if db_dec != excel_raw:
            diffs["ahorro_estimado"] = (master.ahorro_estimado, excel_raw)
    # Si Excel es str/None → no tocamos el campo
    return diffs


def _validate_ahorro(prov: Proveedor, pdf_entry: dict, excel_map: dict) -> str:
    """
    Compara el ahorro_estimado de BD contra el PDF y el Excel.
    Regla de prioridad:
      - Si el admin modificó el valor (difiere de Excel Y de PDF) → lo respetamos e informamos.
      - Si BD == Excel == PDF → OK.
      - Si PDF tiene valor y BD coincide → OK (aunque Excel difiera).
      - Si PDF no tiene valor → depende del Excel.
    Devuelve un string descriptivo para la columna CSV.
    """
    bd_val = prov.ahorro_estimado
    pdf_val = pdf_entry.get("ahorro_estimado")

    # Buscar en Excel
    all_names = [pdf_entry["nombre_pdf"]] + pdf_entry.get("alias", [])
    _, excel_raw = _match_excel_ahorro(excel_map, pdf_entry["nombre_pdf"], pdf_entry.get("alias", []))

    excel_val: Decimal | None = None
    excel_label = "Sin datos Excel"
    if excel_raw is not None:
        if isinstance(excel_raw, Decimal):
            excel_val = excel_raw
            excel_label = f"{float(excel_raw)*100:.1f}%"
        elif isinstance(excel_raw, str):
            excel_label = f"Excel: «{excel_raw}»"

    # ── Construcción del veredicto ──
    def _fmt(v) -> str:
        if v is None:
            return "N/D"
        try:
            return f"{float(v)*100:.1f}%"
        except Exception:
            return str(v)

    if bd_val is None and pdf_val is None:
        return f"Sin ahorro definido | {excel_label}"

    if pdf_val is not None:
        try:
            bd_dec = Decimal(str(bd_val)) if bd_val is not None else None
        except InvalidOperation:
            bd_dec = None

        matches_pdf = (bd_dec is not None and bd_dec == pdf_val)
        matches_excel = (excel_val is not None and bd_dec is not None and bd_dec == excel_val)

        if matches_pdf and (excel_val is None or matches_excel):
            return f"OK — BD={_fmt(bd_val)}, PDF={_fmt(pdf_val)}, {excel_label}"

        if matches_pdf and not matches_excel and excel_val is not None:
            return (
                f"OK (PDF prioridad) — BD={_fmt(bd_val)}, PDF={_fmt(pdf_val)}, "
                f"Excel={_fmt(excel_val)} [diverge Excel]"
            )

        if not matches_pdf and not matches_excel:
            return (
                f"⚠ ADMIN MODIFICÓ MANUALMENTE — BD={_fmt(bd_val)}, "
                f"PDF={_fmt(pdf_val)}, {excel_label}"
            )

        if not matches_pdf and matches_excel:
            return (
                f"⚠ Difiere del PDF — BD={_fmt(bd_val)}, PDF={_fmt(pdf_val)}, "
                f"Excel={_fmt(excel_val)}"
            )

    # pdf_val is None but bd_val exists
    if excel_val is not None:
        try:
            bd_dec = Decimal(str(bd_val)) if bd_val is not None else None
            if bd_dec == excel_val:
                return f"OK (solo Excel) — BD={_fmt(bd_val)}, {excel_label}"
            else:
                return f"⚠ Difiere del Excel — BD={_fmt(bd_val)}, {excel_label}"
        except Exception:
            pass

    return f"Sin PDF ref | BD={_fmt(bd_val)}, {excel_label}"


def _check_categoria(master: Proveedor, pdf_entry: dict) -> str:
    """
    Verifica si el maestro ya tiene asignada la categoría BD correcta.
    Usa PDF_CATEGORIA_IDS (IDs reales) en lugar de texto del PDF.
    """
    expected_ids = PDF_CATEGORIA_IDS.get(pdf_entry["nombre_pdf"], [])
    if not expected_ids:
        return "Sin mapeo de categoría definido"
    assigned_ids = set(master.categorias.values_list("id", flat=True))
    missing = [i for i in expected_ids if i not in assigned_ids]
    if not missing:
        assigned_names = list(master.categorias.filter(id__in=expected_ids).values_list("nombre", flat=True))
        return f"OK — {', '.join(assigned_names)}"
    return f"Categoría Pendiente — falta asignar IDs: {missing}"


# ─────────────────────────────────────────────────────────────────────────────
# Command
# ─────────────────────────────────────────────────────────────────────────────

# Ruta de salida del CSV de auditoría (junto a manage.py → raíz de backend/)
CSV_OUTPUT = os.path.join(os.path.dirname(__file__), *(['..'] * 4), 'auditoria_saneamiento.csv')

CSV_HEADERS = [
    "Estado",
    "ID Original",
    "Nombre Actual",
    "Acción Planificada",
    "Impacto en Gastos",
    "Impacto en Marketplace",
    "Validación de Ahorro",
]


class Command(BaseCommand):
    help = (
        "Saneamiento de proveedores según el PDF oficial DentalQuality. "
        "Por defecto solo hace dry-run + genera auditoria_saneamiento.csv. "
        "Añade --ejecutar para aplicar cambios."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--ejecutar",
            action="store_true",
            default=False,
            help="Aplica los cambios reales (sin este flag es dry-run).",
        )

    def handle(self, *args, **options):
        dry = not options["ejecutar"]
        mode = "DRY-RUN" if dry else "EJECUCIÓN REAL"
        self.stdout.write(self.style.WARNING(f"\n{'='*60}"))
        self.stdout.write(self.style.WARNING(f"  SANEAMIENTO DE PROVEEDORES — {mode}"))
        self.stdout.write(self.style.WARNING(f"{'='*60}\n"))

        # ── 0. Cargar Excel de ahorro ─────────────────────────────────────────
        excel_map = _load_excel_ahorro()
        if "__error__" in excel_map:
            self.stdout.write(self.style.WARNING(
                f"  AVISO: No se pudo leer el Excel de ahorro → {excel_map['__error__']}\n"
                f"  La columna 'Validación de Ahorro' usará solo datos del PDF.\n"
            ))

        all_db = list(Proveedor.objects.prefetch_related("categorias").all())

        # ── 1. Matching exclusivo bipartito (greedy) ──────────────────────────
        all_edges: list[tuple[int, int, Proveedor]] = []
        for pdf_idx, pdf_entry in enumerate(PROVEEDORES_PDF):
            for p in all_db:
                s = _score(p.nombre, pdf_entry)
                if s > 0:
                    all_edges.append((s, pdf_idx, p))

        all_edges.sort(key=lambda x: (x[0], _total_fk(_count_fk(x[2]))), reverse=True)

        assigned_db: dict[int, int] = {}
        pdf_groups: dict[int, list[Proveedor]] = {}

        for score, pdf_idx, prov in all_edges:
            if prov.id in assigned_db:
                continue
            assigned_db[prov.id] = pdf_idx
            pdf_groups.setdefault(pdf_idx, []).append(prov)

        pdf_to_candidates: list[tuple[dict, list[Proveedor]]] = []
        unmatched_pdf: list[dict] = []

        for pdf_idx, pdf_entry in enumerate(PROVEEDORES_PDF):
            candidates = pdf_groups.get(pdf_idx, [])
            if not candidates:
                unmatched_pdf.append(pdf_entry)
            else:
                candidates.sort(
                    key=lambda p: (
                        _norm(p.nombre) == _norm(pdf_entry["nombre_pdf"]),
                        _total_fk(_count_fk(p)),
                    ),
                    reverse=True,
                )
                pdf_to_candidates.append((pdf_entry, candidates))

        # ── 2. Detectar proveedores BD no reconocidos en PDF ──────────────────
        claimed_ids: set[int] = set()
        for _, candidates in pdf_to_candidates:
            for p in candidates:
                claimed_ids.add(p.id)
        not_in_pdf = [p for p in all_db if p.id not in claimed_ids]

        # ── 3. Construir plan de acción ───────────────────────────────────────
        merge_plan: list[dict] = []
        safety_errors: list[str] = []

        for pdf_entry, candidates in pdf_to_candidates:
            master = _pick_master(candidates, pdf_entry)
            duplicates = [p for p in candidates if p.id != master.id]
            diffs = _fields_differ(master, pdf_entry, excel_map)

            # Seguridad: duplicado con datos huérfanos sin maestro claro
            for dup in duplicates:
                fk = _count_fk(dup)
                if _total_fk(fk) > 0 and master is None:
                    safety_errors.append(
                        f"HUÉRFANO SIN MAESTRO: [{dup.id}] {dup.nombre} "
                        f"tiene {_total_fk(fk)} registros asociados."
                    )

            merge_plan.append({
                "pdf": pdf_entry,
                "master": master,
                "duplicates": duplicates,
                "diffs": diffs,
            })

        # ── 4. Emitir errores de seguridad ────────────────────────────────────
        if safety_errors:
            self.stdout.write(self.style.ERROR("\n🚨 ERRORES DE SEGURIDAD — ABORTAR ANTES DE EJECUTAR:"))
            for err in safety_errors:
                self.stdout.write(self.style.ERROR(f"  ✗ {err}"))
            self.stdout.write("")

        # ── 5. Imprimir informe de consola ────────────────────────────────────
        self.stdout.write(self.style.SUCCESS("── PLAN DE FUSIÓN ──────────────────────────────────────────"))
        has_work = False
        for plan in merge_plan:
            master = plan["master"]
            diffs = plan["diffs"]
            dups = plan["duplicates"]

            if not diffs and not dups:
                continue

            has_work = True
            self.stdout.write(f"\n▶ Maestro: [{master.id}] {master.nombre}")

            if dups:
                for dup in dups:
                    fk = _count_fk(dup)
                    self.stdout.write(
                        self.style.ERROR(
                            f"   ELIMINAR duplicado [{dup.id}] {dup.nombre} "
                            f"(gastos={fk['gastos']}, ofertas={fk['ofertas']}, "
                            f"leads={fk['leads']}, pedidos={fk['pedidos']})"
                        )
                    )

            if diffs:
                for field, (old, new) in diffs.items():
                    self.stdout.write(
                        self.style.WARNING(f"   ACTUALIZAR {field}: '{old}' → '{new}'")
                    )

        if not has_work:
            self.stdout.write(self.style.SUCCESS("\n  Todo correcto, no hay acciones necesarias.\n"))

        if unmatched_pdf:
            self.stdout.write(self.style.WARNING(
                f"\n── PROVEEDORES DEL PDF SIN MATCH EN BD ({len(unmatched_pdf)}) ─────────────────────"
            ))
            for p in unmatched_pdf:
                self.stdout.write(f"  ✗ {p['nombre_pdf']}")

        if not_in_pdf:
            self.stdout.write(self.style.WARNING(
                f"\n── PROVEEDORES EN BD NO RECONOCIDOS EN EL PDF ({len(not_in_pdf)}) ───────────────────"
            ))
            for p in not_in_pdf:
                fk = _count_fk(p)
                self.stdout.write(f"  ? [{p.id}] {p.nombre}  (gastos={fk['gastos']})")

        # ── 6. Generar CSV de auditoría (siempre, dry-run y ejecución) ────────
        csv_rows = []

        # 6a. Proveedores reconocidos en el PDF
        for plan in merge_plan:
            master = plan["master"]
            diffs = plan["diffs"]
            dups = plan["duplicates"]
            pdf_entry = plan["pdf"]

            master_fk = _count_fk(master)
            marketplace_impact_master = master_fk["ofertas"] + master_fk["productos"]

            ahorro_verdict = _validate_ahorro(master, pdf_entry, excel_map)
            cat_verdict = _check_categoria(master, pdf_entry)

            if dups:
                estado_master = "Fusión"
                dup_names = ", ".join(f"[{d.id}] {d.nombre}" for d in dups)
                accion = f"Maestro de fusión con: {dup_names}"
            elif diffs:
                estado_master = "Actualización"
                fields_changed = ", ".join(diffs.keys())
                accion = f"Actualizar campos: {fields_changed}"
            else:
                estado_master = "Mantener"
                accion = "Sin cambios"

            csv_rows.append({
                "Estado": estado_master,
                "ID Original": master.id,
                "Nombre Actual": master.nombre,
                "Acción Planificada": accion,
                "Impacto en Gastos": master_fk["gastos"],
                "Impacto en Marketplace": marketplace_impact_master,
                "Validación de Ahorro": ahorro_verdict,
                "Categoría PDF": PDF_CATEGORIA.get(pdf_entry["nombre_pdf"], "Desconocida"),
                "Validación Categoría": cat_verdict,
                "CIF Coherencia": "Sin datos CIF de proveedor en BD",
            })

            # Filas de duplicados a eliminar
            for dup in dups:
                dup_fk = _count_fk(dup)
                dup_market = dup_fk["ofertas"] + dup_fk["productos"]
                dup_ahorro = _validate_ahorro(dup, pdf_entry, excel_map)
                csv_rows.append({
                    "Estado": "Fusión",
                    "ID Original": dup.id,
                    "Nombre Actual": dup.nombre,
                    "Acción Planificada": f"Fusionar con [{master.id}] {master.nombre}",
                    "Impacto en Gastos": dup_fk["gastos"],
                    "Impacto en Marketplace": dup_market,
                    "Validación de Ahorro": dup_ahorro,
                    "Categoría PDF": PDF_CATEGORIA.get(pdf_entry["nombre_pdf"], "Desconocida"),
                    "Validación Categoría": "N/A (será eliminado)",
                    "CIF Coherencia": "Verificar mismo CIF que maestro antes de fusionar",
                })

        # 6b. Proveedores en BD no reconocidos en el PDF → Ocultar
        for p in not_in_pdf:
            fk = _count_fk(p)
            market = fk["ofertas"] + fk["productos"]
            total = _total_fk(fk)
            accion = (
                f"Ocultar (activo=False) — {total} registro(s) asociados, revisar manualmente"
                if total > 0 else "Ocultar (activo=False) — sin registros asociados"
            )
            csv_rows.append({
                "Estado": "Ocultar",
                "ID Original": p.id,
                "Nombre Actual": p.nombre,
                "Acción Planificada": accion,
                "Impacto en Gastos": fk["gastos"],
                "Impacto en Marketplace": market,
                "Validación de Ahorro": "No está en el PDF oficial",
                "Categoría PDF": "No reconocido en PDF",
                "Validación Categoría": "No reconocido en PDF",
                "CIF Coherencia": "Sin datos CIF de proveedor en BD",
            })

        # Escribir CSV
        csv_path = os.path.normpath(CSV_OUTPUT)
        extended_headers = CSV_HEADERS + ["Categoría PDF", "Validación Categoría", "CIF Coherencia"]
        with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=extended_headers)
            writer.writeheader()
            writer.writerows(csv_rows)

        self.stdout.write(self.style.SUCCESS(f"\n✓ CSV de auditoría generado: {csv_path}"))

        # ── 7. Resumen de consola ──────────────────────────────────────────────
        fusiones  = sum(1 for r in csv_rows if r["Estado"] == "Fusión")
        updates   = sum(1 for r in csv_rows if r["Estado"] == "Actualización")
        mantener  = sum(1 for r in csv_rows if r["Estado"] == "Mantener")
        ocultar   = sum(1 for r in csv_rows if r["Estado"] == "Ocultar")
        total_gastos_impacto = sum(r["Impacto en Gastos"] for r in csv_rows if r["Estado"] == "Fusión")

        self.stdout.write(self.style.WARNING("\n── RESUMEN DE AUDITORÍA ─────────────────────────────────────"))
        self.stdout.write(f"  Filas en CSV           : {len(csv_rows)}")
        self.stdout.write(f"  Fusiones (duplicados)  : {fusiones}")
        self.stdout.write(f"  Actualizaciones        : {updates}")
        self.stdout.write(f"  Sin cambios (Mantener) : {mantener}")
        self.stdout.write(f"  Ocultar (no en PDF)    : {ocultar}")
        self.stdout.write(f"  Gastos reasignables    : {total_gastos_impacto}")
        if safety_errors:
            self.stdout.write(self.style.ERROR(f"  🚨 Errores de seguridad : {len(safety_errors)}"))
        self.stdout.write("")

        # ── 8. Aplicar si --ejecutar ───────────────────────────────────────────
        if dry:
            self.stdout.write(self.style.WARNING(
                "  Modo DRY-RUN: ningún cambio aplicado. "
                "Usa --ejecutar para aplicar.\n"
            ))
            self._print_logo_report(all_db)
            return

        if safety_errors:
            self.stdout.write(self.style.ERROR(
                "  ABORTANDO: hay errores de seguridad. Corrígelos antes de usar --ejecutar.\n"
            ))
            raise SystemExit(1)

        self.stdout.write(self.style.WARNING("\nAplicando cambios en una transacción atómica..."))

        try:
            with transaction.atomic():
                # ── 8a. Cargar categorías BD una sola vez ──────────────────────
                from compras.models import Categoria as CategoriaModel
                cat_cache: dict[int, CategoriaModel] = {c.id: c for c in CategoriaModel.objects.all()}

                # ── 8b. Fusiones + actualizaciones de proveedores maestros ─────
                for plan in merge_plan:
                    master = plan["master"]
                    diffs = plan["diffs"]
                    dups = plan["duplicates"]
                    pdf_entry = plan["pdf"]

                    # Reasignar todas las FK antes de eliminar duplicados
                    for dup in dups:
                        self.stdout.write(f"  Fusionando [{dup.id}] {dup.nombre} → [{master.id}] {master.nombre}")
                        # Gastos: safe merge (respeta unique_together por clinic/year/quarter/category)
                        g_upd, g_mrg = _reassign_gastos(dup, master)
                        if g_upd or g_mrg:
                            self.stdout.write(f"    Gastos: {g_upd} reasignados, {g_mrg} fusionados (suma)")
                        # ProductoLegado: sin unique constraint, bulk update directo
                        ProductoLegado.objects.filter(proveedor=dup).update(proveedor=master)
                        # ProveedorOferta: safe merge (respeta unique_together por proveedor/sku)
                        o_upd, o_rem = _reassign_ofertas(dup, master)
                        if o_upd or o_rem:
                            self.stdout.write(f"    Ofertas: {o_upd} reasignadas, {o_rem} eliminadas (SKU duplicado)")
                        # Resto de FKs sin restricciones conflictivas
                        ProductoEstrella.objects.filter(proveedor=dup).update(proveedor=master)
                        LeadSolicitud.objects.filter(proveedor=dup).update(proveedor=master)
                        Pedido.objects.filter(proveedor=dup).update(proveedor=master)
                        dup.delete()
                        self.stdout.write(self.style.SUCCESS(f"    ✓ Duplicado eliminado"))

                    # Actualizar campos que difieran del PDF/Excel
                    if diffs:
                        for field, (_, new_val) in diffs.items():
                            setattr(master, field, new_val)
                        master.save(update_fields=list(diffs.keys()))
                        self.stdout.write(self.style.SUCCESS(
                            f"  ✓ [{master.id}] {master.nombre} → {', '.join(diffs.keys())}"
                        ))

                    # Asignar categorías BD según PDF_CATEGORIA_IDS (sin crear nuevas)
                    expected_cat_ids = PDF_CATEGORIA_IDS.get(pdf_entry["nombre_pdf"], [])
                    if expected_cat_ids:
                        current_cat_ids = set(master.categorias.values_list("id", flat=True))
                        missing_ids = [i for i in expected_cat_ids if i not in current_cat_ids]
                        if missing_ids:
                            cats_to_add = [cat_cache[i] for i in missing_ids if i in cat_cache]
                            master.categorias.add(*cats_to_add)
                            cat_names = [c.nombre for c in cats_to_add]
                            self.stdout.write(self.style.SUCCESS(
                                f"  ✓ [{master.id}] {master.nombre} → categorías añadidas: {cat_names}"
                            ))

                # ── 8c. Ocultar proveedores no reconocidos en el PDF ───────────
                if not_in_pdf:
                    ids_to_hide = [p.id for p in not_in_pdf]
                    hidden = Proveedor.objects.filter(id__in=ids_to_hide, activo=True).update(activo=False)
                    self.stdout.write(self.style.WARNING(
                        f"\n  Ocultando {hidden} proveedores no reconocidos en el PDF (activo=False)"
                    ))

        except Exception as exc:
            self.stdout.write(self.style.ERROR(f"\n  ERROR — transacción abortada: {exc}"))
            raise

        self.stdout.write(self.style.SUCCESS("\nSaneamiento completado correctamente.\n"))

        updated_db = list(Proveedor.objects.all())
        self._print_logo_report(updated_db)

    def _print_logo_report(self, proveedores: list[Proveedor]):
        sin_logo = [p for p in proveedores if not _has_logo(p)]
        self.stdout.write(self.style.WARNING(
            f"\n── INFORME DE LOGOS ({len(sin_logo)} sin logo) ─────────────────────────────────────"
        ))
        if sin_logo:
            for p in sin_logo:
                self.stdout.write(f"  📷 [{p.id:>4}] {p.nombre}")
        else:
            self.stdout.write("  Todos los proveedores tienen logo. ✓")
        self.stdout.write("")
