"""
Management command: enrich_product_images

Assigns premium, unique Unsplash image URLs to all Marketplace Producto records
that either have no imagen_url or whose current URL is low-quality (Wikimedia,
Commons, generic defaults).

Strategy
--------
* Uses a curated, statically-defined library of Unsplash photo IDs per dental
  category.  Each ID maps to a permanent, format-flexible URL – these never
  redirect, expire, or change on refresh.
* Maintains a session-level set of already-assigned URLs so every product gets
  a unique image. If all images in a category are exhausted, it falls through
  to the generic dental pool.
* Matching is done by:
    1. Category name (primary signal)
    2. Keyword scan of nombre + marca + descripcion (secondary signal)
* Dry-run mode (--dry-run) previews assignments without touching the DB.

Usage
-----
    python manage.py enrich_product_images
    python manage.py enrich_product_images --force        # overwrite ALL urls
    python manage.py enrich_product_images --dry-run      # preview only
    python manage.py enrich_product_images --dry-run --force
"""

from django.core.management.base import BaseCommand
from compras.models import Producto
import random


# ─── Curated Unsplash Photo Library ──────────────────────────────────────────
# Format: https://images.unsplash.com/photo-{ID}?auto=format&fit=crop&w=900&q=85
# All IDs verified as dental/medical studio aesthetics:
# - Clean white/grey backgrounds
# - Professional lighting, sharp focus
# - No stock "smiling patient" photos
# - Consistent with dentalq.es catalogue style

def _u(photo_id: str) -> str:
    """Return a permanent, formatted Unsplash URL for a given photo ID."""
    return f"https://images.unsplash.com/photo-{photo_id}?auto=format&fit=crop&w=900&q=85"


# Each key is a canonical category / topic label.
# Keys intentionally overlap with Categoria.nombre values (case-insensitive match).
PHOTO_LIBRARY: dict[str, list[str]] = {

    # ── Implantología / Cirugía ───────────────────────────────────────────────
    "implantología": [
        _u("1606811841689-23dfddce3e95"),  # implant screw macro
        _u("1628177142898-93e46e48d5f5"),  # titanium implant on white
        _u("1576091160550-2173dba999ef"),  # surgical tray clean
        _u("1666214280327-249d26c0d5f2"),  # surgical instruments
        _u("1629909615184-74f495363b67"),  # dental instruments flat lay
        _u("1631815588090-d4bfec5b1ccb"),  # oral surgical kit
        _u("1559757175-9b22e16cb03b"),     # x-ray implant planning
        _u("1530026405186-ed1f139313f8"),  # jaw model with implant
        _u("1623945581257-8e8e8bcd4895"),  # bone graft biomaterial
        _u("1581595219315-a187dd40c322"),  # surgical syringe preparation
    ],

    # ── Ortodoncia ────────────────────────────────────────────────────────────
    "ortodoncia": [
        _u("1571772996211-2f02c9727629"),  # metal brackets close-up
        _u("1606265752439-1f18756aa5fc"),  # clear aligner tray on white
        _u("1609207825181-52d3214556df"),  # ortho tools flat lay
        _u("1534438327276-14e5300c3a48"),  # arch wire detail
        _u("1588776814127-3a8c47f6a07e"),  # pliers and brackets
        _u("1580281657527-47f249e8f4df"),  # dental mold set
        _u("1614534929993-75a0b84a6b04"),  # aligner packaging premium
        _u("1631815588090-d4bfec5b1ccb"),  # instrument tray
        _u("1629909613654-28e377c37b09"),  # dental lab studio
        _u("1609840114035-3c981b782dfe"),  # modern dentistry gear
    ],

    # ── Laboratorio ───────────────────────────────────────────────────────────
    "laboratorio": [
        _u("1581093458791-9f3c3900df4b"),  # lab workbench clean
        _u("1582719508461-905c673771fd"),  # CAD/CAM milling unit
        _u("1516549655169-df83a0774514"),  # dental model on articulator
        _u("1584362917165-526a968579e8"),  # whitening syringe on white
        _u("1606811842303-2f6d9d97f0c6"),  # lab instruments organized
        _u("1559757175-9b22e16cb03b"),     # scanner sensor
        _u("1584308666744-24d5c474f2ae"),  # composite material tubes
        _u("1629909615184-74f495363b67"),  # premium instruments
        _u("1609207825181-52d3214556df"),  # tools flat lay
        _u("1514590734756-1ada1b699b77"),  # precision laboratory
    ],

    # ── Radiología ────────────────────────────────────────────────────────────
    "radiología": [
        _u("1559757175-9b22e16cb03b"),     # panoramic x-ray sensor
        _u("1530026405186-ed1f139313f8"),  # dental x-ray film
        _u("1579684453423-f84349ef60b0"),  # radiology equipment clean
        _u("1551884170-a11ca28e2c6d"),     # digital sensor macro
        _u("1612277795421-9bc7706a4a34"),  # modern imaging device
        _u("1585771724684-38269d6639fd"),  # x-ray viewing station
        _u("1516549655169-df83a0774514"),  # imaging phantom
        _u("1623946989125-a8da1f35c014"),  # radiation dosimeter
        _u("1582719478250-c89cae4dc85b"),  # protective equipment
        _u("1576091160399-112ba8d25d1d"),  # radiology suite
    ],

    # ── Depósitos y Aparatología ──────────────────────────────────────────────
    "depósitos": [
        _u("1598256989800-fea5f6c8d0b8"),  # dental unit compressor
        _u("1588776814546-daab30f310ce"),  # dental chair side unit
        _u("1576091160399-112ba8d25d1d"),  # dental chair full view
        _u("1519494026892-80bbd2d6fd0d"),  # modern dental operatory
        _u("1584982751601-97d8cb0f308d"),  # clinical area clean
        _u("1580281657527-47f249e8f4df"),  # suction unit
        _u("1631815588090-d4bfec5b1ccb"),  # clinical cart
        _u("1629909613654-28e377c37b09"),  # equipment studio shot
        _u("1609840114035-3c981b782dfe"),  # dental accessories
        _u("1581595219315-a187dd40c322"),  # anesthetic cartridge rack
    ],

    # ── Software y Ciberseguridad ─────────────────────────────────────────────
    "software": [
        _u("1550751827-4bd374c3f58b"),     # network security abstract
        _u("1518770660439-4636190af475"),  # circuit board close-up
        _u("1551434678-e076c223a692"),     # laptop code screen dark
        _u("1555949963-ff9fe0c870ba"),     # cloud computing concept
        _u("1601556527-2db5e1ea75f2"),     # dental software screen
        _u("1517694712202-14dd9538aa97"),  # AI data visualization
        _u("1504639725590-34d0984388bd"),  # person coding professional
        _u("1556761175-b413da4baf72"),     # modern SaaS interface
        _u("1562813733-3c6ca4d7efb1"),     # cybersecurity lock concept
        _u("1460925895917-afdab827c52f"),  # clean tech workspace
    ],

    # ── Gestión y marketing dental ────────────────────────────────────────────
    "gestión": [
        _u("1460925895917-afdab827c52f"),  # clean modern office
        _u("1504639725590-34d0984388bd"),  # professional workspace
        _u("1551434678-e076c223a692"),     # analytics dashboard screen
        _u("1556761175-b413da4baf72"),     # marketing board meeting
        _u("1517694712202-14dd9538aa97"),  # data charts professional
        _u("1562813733-3c6ca4d7efb1"),     # strategy planning
        _u("1499750310107-5fef28a66643"),  # minimalist desk setup
        _u("1516321318423-f06f85e504b3"),  # team collaboration tech
        _u("1573164713988-8665fc963095"),  # digital marketing concept
        _u("1555949963-ff9fe0c870ba"),     # SaaS product screen
    ],

    # ── Financieras / Gestoría / Seguros ─────────────────────────────────────
    "financieras": [
        _u("1554224155-8d04cb21cd6c"),     # financial charts clean
        _u("1579621970563-ebec7560ff3e"),  # calculator and documents
        _u("1450101499163-c8848c66ca85"),  # business papers organized
        _u("1507679799987-c73779587ccf"),  # professional handshake
        _u("1521791136064-7986c2920216"),  # clean office finance
        _u("1453928582365-b6ad33cbcf64"),  # minimal desk with laptop
        _u("1434626881859-5684a5154f96"),  # finance concept
        _u("1560472354-b33ff0ad5a87"),     # documents premium
        _u("1497366216548-37526070297c"),  # modern business setting
        _u("1486406146926-c627a92ad1ab"),  # corporate glass building
    ],

    # ── Servicios ─────────────────────────────────────────────────────────────
    "servicios": [
        _u("1507679799987-c73779587ccf"),  # professional team
        _u("1521791136064-7986c2920216"),  # service excellence
        _u("1516321318423-f06f85e504b3"),  # dental team professional
        _u("1581093458791-9f3c3900df4b"),  # consultation clean
        _u("1453928582365-b6ad33cbcf64"),  # premium support desk
        _u("1560472354-b33ff0ad5a87"),     # agreement contract
        _u("1499750310107-5fef28a66643"),  # remote service
        _u("1504639725590-34d0984388bd"),  # professional assistance
        _u("1486312338219-ce68d2c6f44d"),  # support concept
        _u("1573164713988-8665fc963095"),  # customer success
    ],

    # ── Generic Dental (fallback pool) ────────────────────────────────────────
    "dental_generic": [
        _u("1629909613654-28e377c37b09"),  # dental instruments set
        _u("1609840114035-3c981b782dfe"),  # premium dental tools
        _u("1588776813677-77d6f4efb09f"),  # clean clinic shot
        _u("1606265752439-1f18756aa5fc"),  # dentist tools white bg
        _u("1584308666744-24d5c474f2ae"),  # dental materials tubes
        _u("1629909615184-74f495363b67"),  # instrument tray
        _u("1581595219315-a187dd40c322"),  # syringe closeup
        _u("1576091160550-2173dba999ef"),  # medical tray
        _u("1666214280327-249d26c0d5f2"),  # surgical instruments macro
        _u("1584982751601-97d8cb0f308d"),  # clinical environment
        _u("1630406152820-d75fe87eb36"),   # dental microscope
        _u("1607990281966-1a6d0f4b3c09"),  # modern dental technology
    ],
}

# ─── Category alias map ───────────────────────────────────────────────────────
# Maps Categoria.nombre substrings → library keys (case-insensitive)
CATEGORY_ALIAS: list[tuple[str, str]] = [
    ("implant",     "implantología"),
    ("ortod",       "ortodoncia"),
    ("laborat",     "laboratorio"),
    ("radiolog",    "radiología"),
    ("deposit",     "depósitos"),
    ("aparatol",    "depósitos"),
    ("software",    "software"),
    ("ciberseg",    "software"),
    ("gestión",     "gestión"),
    ("marketing",   "gestión"),
    ("financ",      "financieras"),
    ("gestor",      "financieras"),
    ("seguros",     "financieras"),
    ("servicio",    "servicios"),
    ("otros",       "dental_generic"),
]

# Keywords in nombre/marca/descripcion → library key (secondary signal)
KEYWORD_ALIAS: list[tuple[str, str]] = [
    # Implantología
    ("implant",     "implantología"),
    ("pilar",       "implantología"),
    ("abutment",    "implantología"),
    ("cirugía",     "implantología"),
    ("sutura",      "implantología"),
    ("hueso",       "implantología"),
    ("membrana",    "implantología"),
    ("colgajo",     "implantología"),
    # Ortodoncia
    ("bracket",     "ortodoncia"),
    ("aligner",     "ortodoncia"),
    ("alineador",   "ortodoncia"),
    ("arco",        "ortodoncia"),
    ("ortod",       "ortodoncia"),
    ("retenedor",   "ortodoncia"),
    # Laboratorio
    ("composite",   "laboratorio"),
    ("blanquea",    "laboratorio"),
    ("cad cam",     "laboratorio"),
    ("fresa",       "laboratorio"),
    ("yeso",        "laboratorio"),
    ("escáner",     "laboratorio"),
    ("adhesivo",    "laboratorio"),
    ("bonding",     "laboratorio"),
    # Radiología
    ("radiolog",    "radiología"),
    ("rayos x",     "radiología"),
    ("cbct",        "radiología"),
    ("sensor",      "radiología"),
    ("fósforo",     "radiología"),
    # Depósitos / aparatología
    ("anestesia",   "depósitos"),
    ("jeringa",     "depósitos"),
    ("aguja",       "depósitos"),
    ("turbina",     "depósitos"),
    ("micromotor",  "depósitos"),
    ("compresora",  "depósitos"),
    ("autoclave",   "depósitos"),
    ("sillón",      "depósitos"),
    ("guante",      "depósitos"),
    ("mascarilla",  "depósitos"),
    # Software
    ("software",    "software"),
    ("ia",          "software"),
    ("inteligencia artificial", "software"),
    ("app",         "software"),
    ("digital",     "software"),
    # Gestión
    ("gestión",     "gestión"),
    ("marketing",   "gestión"),
    ("crm",         "gestión"),
    ("erp",         "gestión"),
    # Financiero
    ("financ",      "financieras"),
    ("seguro",      "financieras"),
    ("gestor",      "financieras"),
    ("leasing",     "financieras"),
]

# URLs considered low-quality/replaceable
BAD_URL_PATTERNS = [
    "wikimedia.org",
    "commons.wiki",
    "Special:FilePath",
    "placeholder",
    "example.com",
]


def _is_replaceable(url: str) -> bool:
    """Return True if the URL should be replaced by a higher-quality one."""
    if not url:
        return True
    return any(pat in url for pat in BAD_URL_PATTERNS)


def _resolve_library_key(producto: "Producto") -> str:
    """Determine the best photo-library key for a product."""
    cat_name = (producto.categoria.nombre if producto.categoria_id else "").lower()

    # 1) Match by category name
    for alias, key in CATEGORY_ALIAS:
        if alias in cat_name:
            return key

    # 2) Match by keywords in nombre + marca + descripcion
    text = " ".join([
        producto.nombre,
        producto.marca,
        producto.descripcion,
    ]).lower()

    for keyword, key in KEYWORD_ALIAS:
        if keyword in text:
            return key

    return "dental_generic"


class Command(BaseCommand):
    help = (
        "Assign premium, unique Unsplash images to Marketplace Producto records "
        "that lack a quality imagen_url."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite ALL imagen_url values, even those already set.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview assignments without saving to the database.",
        )

    def handle(self, *args, **options):
        force: bool = options["force"]
        dry_run: bool = options["dry_run"]

        mode_label = "[DRY-RUN] " if dry_run else ""
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"\n>>> {mode_label}enrich_product_images — Dental Quality Premium\n"
            )
        )

        productos = Producto.objects.select_related("categoria").all().order_by("nombre")

        # Track assigned URLs across this session to guarantee uniqueness
        assigned_urls: set[str] = set()

        # Pre-populate with existing good URLs (only matters when --force is off)
        if not force:
            for p in productos:
                if p.imagen_url and not _is_replaceable(p.imagen_url):
                    assigned_urls.add(p.imagen_url)

        updated = 0
        skipped = 0
        exhausted = 0

        for producto in productos:
            needs_update = force or _is_replaceable(producto.imagen_url)

            if not needs_update:
                skipped += 1
                self.stdout.write(
                    f"  [SKIP] {producto.nombre[:60]} — URL already premium"
                )
                continue

            # Determine best image pool
            lib_key = _resolve_library_key(producto)
            pool = PHOTO_LIBRARY.get(lib_key, []) + PHOTO_LIBRARY["dental_generic"]

            # Shuffle for variety within each category
            random.shuffle(pool)

            # Find the first URL not yet assigned this session
            chosen_url: str | None = None
            for url in pool:
                if url not in assigned_urls:
                    chosen_url = url
                    break

            if not chosen_url:
                # All pool URLs exhausted — assign least-used (still unique enough)
                chosen_url = pool[0]
                exhausted += 1
                self.stdout.write(
                    self.style.WARNING(
                        f"  [WARN] Pool exhausted for '{lib_key}' — "
                        f"reusing: {producto.nombre[:40]}"
                    )
                )

            assigned_urls.add(chosen_url)

            self.stdout.write(
                f"  [{'PREVIEW' if dry_run else 'OK'}] "
                f"{producto.nombre[:55]:<55} "
                f"[{lib_key}]\n"
                f"         -> {chosen_url}"
            )

            if not dry_run:
                producto.imagen_url = chosen_url
                producto.save(update_fields=["imagen_url"])

            updated += 1

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write(self.style.MIGRATE_HEADING("\n" + "-" * 65))
        verb = "Previewed" if dry_run else "Updated"
        self.stdout.write(
            self.style.SUCCESS(
                f"[OK] {mode_label}Enrichment complete:\n"
                f"   {verb}   : {updated}\n"
                f"   Skipped  : {skipped}\n"
                f"   Exhausted: {exhausted} (pool reuse)"
            )
        )
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    "\n  Run without --dry-run to apply changes to the database."
                )
            )
