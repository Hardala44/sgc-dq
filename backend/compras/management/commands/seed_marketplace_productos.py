"""
Management command: seed_marketplace_productos

Populates the Marketplace Producto + ProveedorOferta tables with
high-quality test data covering 3 product families across different categories.

Usage:
    python manage.py seed_marketplace_productos
    python manage.py seed_marketplace_productos --clear   (wipe & reseed)
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from compras.models import Categoria, Proveedor, Producto, ProveedorOferta
from decimal import Decimal


# ─── Seed data ────────────────────────────────────────────────────────────────
# Each entry defines a parent Producto and a list of ProveedorOferta rows.
# supplier_id → use real IDs from the DB (Henry Schein=70, Proclinic=71, etc.)
SEED_DATA = [

    # ── Product 1: Nitrile Gloves (Consumibles / Implantología/Laboratorio)
    {
        "producto": {
            "nombre": "Guante de Nitrilo Azul Caja 100u",
            "marca": "Medicaline",
            "categoria_nombre": "Laboratorio",   # id=42
            "descripcion": (
                "Guantes de nitrilo azul sin polvo, alta resistencia química. "
                "Caja de 100 unidades. Tallas S / M / L / XL. "
                "Certificación EN374 y EN455. Ideales para uso clínico diario."
            ),
            "imagen_url": (
                "https://images.unsplash.com/photo-1584036561566-baf8f5f1b144"
                "?auto=format&fit=crop&q=80&w=1200"
            ),
        },
        "ofertas": [
            {
                "proveedor_id": 70,   # Henry Schein
                "sku": "HS-GNT-NITRIl-L-BLU-100",
                "precio": Decimal("5.20"),
                "url_compra": "",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 71,   # Proclinic
                "sku": "PRO-GLOVE-NIT-BL-100",
                "precio": Decimal("5.80"),
                "url_compra": "",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 97,   # INIBSA
                "sku": "INI-NIT-BLUE-M-100",
                "precio": Decimal("6.10"),
                "url_compra": "https://www.google.com/search?q=guante+nitrilo+azul+inibsa",
                "stock_status": "low_stock",
            },
            {
                "proveedor_id": 75,   # Infomed
                "sku": "INF-GNT-NIT-BL-100U",
                "precio": Decimal("5.55"),
                "url_compra": "https://www.google.com/search?q=guante+nitrilo+azul+infomed",
                "stock_status": "in_stock",
            },
        ],
    },

    # ── Product 2: Composite 3M Filtek Supreme XTE
    {
        "producto": {
            "nombre": "Composite Filtek Supreme XTE",
            "marca": "3M",
            "categoria_nombre": "Implantología",   # id=35 (closest to restorative)
            "descripcion": (
                "Composite nanorelleno de alta estética para restauraciones anteriores y "
                "posteriores. Alta translucidez, fácil pulido y excelente resistencia al "
                "desgaste. Jeringa de 4g. Colores A1, A2, A3, A3.5 disponibles."
            ),
            "imagen_url": (
                "https://images.unsplash.com/photo-1606811841689-23dfddce3e95"
                "?auto=format&fit=crop&q=80&w=1200"
            ),
        },
        "ofertas": [
            {
                "proveedor_id": 70,   # Henry Schein
                "sku": "HS-3M-FLT-SUP-XTE-A2",
                "precio": Decimal("45.00"),
                "url_compra": "https://www.google.com/search?q=composite+filtek+supreme+XTE+henry+schein",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 71,   # Proclinic
                "sku": "PRO-3M-FILTEK-SUPXTE",
                "precio": Decimal("48.50"),
                "url_compra": "https://www.google.com/search?q=composite+filtek+supreme+XTE+proclinic",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 80,   # AXIS DENTAL
                "sku": "AXS-3M-FLTK-XTE-4G",
                "precio": Decimal("42.90"),
                "url_compra": "https://www.google.com/search?q=composite+filtek+supreme+XTE+axis+dental",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 98,   # IPD
                "sku": "IPD-FILTEK-SUPREME-XTE",
                "precio": Decimal("46.75"),
                "url_compra": "https://www.google.com/search?q=composite+filtek+supreme+XTE+ipd",
                "stock_status": "low_stock",
            },
        ],
    },

    # ── Product 3: Klockner Vega Implant
    {
        "producto": {
            "nombre": "Implante Klockner Vega",
            "marca": "Klockner",
            "categoria_nombre": "Implantología",   # id=35
            "descripcion": (
                "Implante de titanio grado IV con superficie SLA y conexión hexagonal "
                "interna. Diseño Vega de alto rendimiento primario. Disponible en "
                "diámetros Ø3.3 / Ø3.75 / Ø4.2 y longitudes 8–16mm. "
                "Compatible con protocolo de carga inmediata."
            ),
            "imagen_url": (
                "https://images.unsplash.com/photo-1628177142898-93e46e48d5f5"
                "?auto=format&fit=crop&q=80&w=1200"
            ),
        },
        "ofertas": [
            {
                "proveedor_id": 70,   # Henry Schein
                "sku": "HS-KLK-VEGA-375-10",
                "precio": Decimal("120.00"),
                "url_compra": "https://www.google.com/search?q=implante+klockner+vega+henry+schein",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 71,   # Proclinic
                "sku": "PRO-KLOCKNER-VGA-375-10",
                "precio": Decimal("115.00"),
                "url_compra": "https://www.google.com/search?q=implante+klockner+vega+proclinic",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 75,   # Infomed
                "sku": "INF-KLK-VEGA-3-75-10MM",
                "precio": Decimal("130.00"),
                "url_compra": "https://www.google.com/search?q=implante+klockner+vega+infomed",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 80,   # AXIS DENTAL
                "sku": "AXS-KLKVG-42-12",
                "precio": Decimal("118.50"),
                "url_compra": "https://www.google.com/search?q=implante+klockner+vega+axis+dental",
                "stock_status": "low_stock",
            },
        ],
    },

    # ── Product 4: Bracket Metálico MBT (bonus — Ortodoncia)
    {
        "producto": {
            "nombre": "Bracket Metálico MBT 0.022\" Kit 20u",
            "marca": "Ormco",
            "categoria_nombre": "Ortodoncia",   # id=36
            "descripcion": (
                "Kit de 20 brackets metálicos MBT preangulados con slot 0.022\". "
                "Base de malla láser de alta adhesión. Incluye: incisivos, caninos "
                "y premolares. Torque prescripción estándar MBT. Autoclavables."
            ),
            "imagen_url": (
                "https://images.unsplash.com/photo-1571772996211-2f02c9727629"
                "?auto=format&fit=crop&q=80&w=1200"
            ),
        },
        "ofertas": [
            {
                "proveedor_id": 74,   # Ormco
                "sku": "ORM-BKT-MBT-022-20U",
                "precio": Decimal("28.90"),
                "url_compra": "https://www.google.com/search?q=bracket+metalico+mbt+0022+ormco",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 70,   # Henry Schein
                "sku": "HS-ORM-BKT-MBT-22-20",
                "precio": Decimal("31.50"),
                "url_compra": "https://www.google.com/search?q=bracket+metalico+mbt+henry+schein",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 103, # IMPERORTHO
                "sku": "IMP-BKT-MBT-022-K20",
                "precio": Decimal("26.00"),
                "url_compra": "https://www.google.com/search?q=bracket+metalico+mbt+imperortho",
                "stock_status": "in_stock",
            },
        ],
    },

    # ── Product 5: Peróxido Blanqueador Carbamida 22% (bonus — Laboratorio)
    {
        "producto": {
            "nombre": "Blanqueador Carbamida 22% Jeringa 3ml",
            "marca": "Opalescence",
            "categoria_nombre": "Laboratorio",   # id=42
            "descripcion": (
                "Gel blanqueador de peróxido de carbamida al 22% con nitrato potásico "
                "y fluoruro. Jeringa de 3ml para una sesión de férula. "
                "pH neutro, máxima tolerancia. Sabor menta. "
                "Indicado para blanqueamiento domiciliario supervisado."
            ),
            "imagen_url": (
                "https://images.unsplash.com/photo-1584362917165-526a968579e8"
                "?auto=format&fit=crop&q=80&w=1200"
            ),
        },
        "ofertas": [
            {
                "proveedor_id": 70,   # Henry Schein
                "sku": "HS-OPL-CARB22-3ML",
                "precio": Decimal("8.40"),
                "url_compra": "https://www.google.com/search?q=opalescence+carbamida+22+henry+schein",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 71,   # Proclinic
                "sku": "PRO-OPL-22PCT-3ML",
                "precio": Decimal("9.10"),
                "url_compra": "https://www.google.com/search?q=opalescence+carbamida+22+proclinic",
                "stock_status": "in_stock",
            },
            {
                "proveedor_id": 121, # DENTAID
                "sku": "DTA-WH-CARB22-3ML-MNT",
                "precio": Decimal("7.95"),
                "url_compra": "https://www.google.com/search?q=blanqueador+carbamida+22+dentaid",
                "stock_status": "in_stock",
            },
        ],
    },
]


class Command(BaseCommand):
    help = "Seeds the Marketplace (Producto + ProveedorOferta) with high-quality test data."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing Marketplace Productos before seeding.",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count, _ = Producto.objects.all().delete()
            self.stdout.write(self.style.WARNING(f"  [!] Cleared {count} existing Marketplace records."))

        self.stdout.write(self.style.MIGRATE_HEADING("\n>>> Seeding Marketplace Productos...\n"))

        created_productos = 0
        created_ofertas = 0
        updated_ofertas = 0
        errors = []

        with transaction.atomic():
            for entry in SEED_DATA:
                pd = entry["producto"]
                cat_nombre = pd.pop("categoria_nombre")

                # Resolve Categoria by name
                try:
                    categoria = Categoria.objects.get(nombre=cat_nombre)
                except Categoria.DoesNotExist:
                    msg = f"  [X] Categoría '{cat_nombre}' no encontrada. Saltando producto '{pd['nombre']}'."
                    self.stderr.write(self.style.ERROR(msg))
                    errors.append(msg)
                    pd["categoria_nombre"] = cat_nombre  # restore
                    continue

                # Get or create parent Producto
                producto, was_created = Producto.objects.get_or_create(
                    nombre=pd["nombre"],
                    marca=pd["marca"],
                    defaults={
                        "categoria": categoria,
                        "descripcion": pd.get("descripcion", ""),
                        "imagen_url": pd.get("imagen_url", ""),
                    },
                )

                if was_created:
                    created_productos += 1
                    self.stdout.write(
                        f"  [OK] Producto creado: {self.style.SUCCESS(producto.nombre)} "
                        f"[{producto.marca}] -> cat={categoria.nombre}"
                    )
                else:
                    # Update fields in case they changed
                    producto.categoria = categoria
                    producto.descripcion = pd.get("descripcion", producto.descripcion)
                    producto.imagen_url = pd.get("imagen_url", producto.imagen_url)
                    producto.save(update_fields=["categoria", "descripcion", "imagen_url"])
                    self.stdout.write(
                        f"  [~] Producto actualizado: {self.style.WARNING(producto.nombre)}"
                    )

                # Create / update each ProveedorOferta
                for oferta_data in entry["ofertas"]:
                    proveedor_id = oferta_data["proveedor_id"]
                    try:
                        proveedor = Proveedor.objects.get(pk=proveedor_id)
                    except Proveedor.DoesNotExist:
                        msg = f"     ⚠️ Proveedor id={proveedor_id} no encontrado. SKU={oferta_data['sku']}"
                        self.stderr.write(self.style.WARNING(msg))
                        errors.append(msg)
                        continue

                    oferta, oferta_created = ProveedorOferta.objects.update_or_create(
                        proveedor=proveedor,
                        sku=oferta_data["sku"],
                        defaults={
                            "producto": producto,
                            "precio": oferta_data["precio"],
                            "url_compra": oferta_data["url_compra"],
                            "stock_status": oferta_data["stock_status"],
                        },
                    )

                    verb = "creada" if oferta_created else "actualizada"
                    icon = "    [+]" if oferta_created else "    [~]"
                    self.stdout.write(
                        f"{icon} Oferta {verb}: {proveedor.nombre} "
                        f"· {oferta_data['precio']}EUR · SKU={oferta.sku}"
                    )

                    if oferta_created:
                        created_ofertas += 1
                    else:
                        updated_ofertas += 1

                self.stdout.write("")  # blank line between products

        # -- Summary ----------------------------------------------------------
        self.stdout.write(self.style.MIGRATE_HEADING("-" * 60))
        self.stdout.write(
            self.style.SUCCESS(
                f"[OK] Seeding completado:\n"
                f"   Productos creados    : {created_productos}\n"
                f"   Ofertas creadas      : {created_ofertas}\n"
                f"   Ofertas actualizadas : {updated_ofertas}\n"
                f"   Errores              : {len(errors)}"
            )
        )
        if errors:
            self.stdout.write(self.style.WARNING("\nErrores encontrados:"))
            for e in errors:
                self.stdout.write(f"  · {e}")
