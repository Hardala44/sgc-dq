"""
update_supplier_logos.py
Populates Proveedor.logo_url using Google's S2 favicon service (reliable, free,
no API key). Falls back to a manual domain map for suppliers without a web URL.

The logo_url field is served directly by the REST serializer — no file download needed.

Usage:
    cd backend
    python compras/scripts/update_supplier_logos.py
"""

import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sgc_dq.settings')

import django
django.setup()

import requests
from compras.models import Proveedor

# ── Logo sources ──────────────────────────────────────────────────────────────

def google_logo(domain):
    return f"https://www.google.com/s2/favicons?domain={domain}&sz=128"

def duckduckgo_logo(domain):
    return f"https://icons.duckduckgo.com/ip3/{domain}.ico"


# ── Manual domain map ─────────────────────────────────────────────────────────

MANUAL_DOMAINS = {
    "Henry Schein":           "henryschein.com",
    "Proclinic":              "proclinic.es",
    "DVD Dental":             "dvd-dental.com",
    "Broker Dental":          "brokerdental.es",
    "Axis Dental":            "axisdental.es",
    "Katia Dental":           "katiadental.com",
    "Akura":                  "akura-medical.com",
    "Adiemed":                "adiemed.es",
    "Endovations":            "endovations.com",
    "EMS":                    "ems-dental.com",
    "Dentaid":                "dentaid.com",
    "Saniswiss":              "saniswiss.com",
    "Straumann":              "straumann.com",
    "ZimVie":                 "zimvie.com",
    "Inibsa":                 "inibsa.com",
    "IPD":                    "ipd2004.com",
    "Klockner":               "klockner.es",
    "Botiss":                 "botiss.com",
    "Imperortho":             "imperortho.com",
    "Forestadent":            "forestadent.com",
    "Ormco":                  "ormco.com",
    "Ortoarea":               "ortoarea.com",
    "DentalMonitoring":       "dental-monitoring.com",
    "Ceranium":               "ceranium.es",
    "Mondental":              "mondental.es",
    "ConVaden":               "convadent.com",
    "Hussogenix":             "hussogenix.com",
    "Hyssogenix":             "hussogenix.com",
    "Infomed":                "infomed.es",
    "Kokuai":                 "kokuai.com",
    "Digimevo":               "digimevo.com",
    "Astute Control":         "astutecontrol.com",
    "Aesinergy":              "aesinergy.com",
    "Radmedica":              "radmedica.es",
    "Talent Salud":           "talentsalud.es",
    "OTP":                    "grupopreving.com",
    "Roca Asociados":         "rocaasociados.com",
    "Mediconsulting":         "mediconsulting.es",
    "VDOBLE":                 "vdobleconsultores.com",
    "IDH Platform":           "idhplatform.com",
    "Sabadell Consumer":      "bancsabadell.com",
    "Kutxabank":              "kutxabank.es",
    "Nowon":                  "nowon.es",
    "Cherokee":               "cherokee-uniform.com",
    "Wellisair":              "wellisair.com",
    "Santacreu":              "santacreu.com",
    "Sadival":                "sadival.com",
    "Bruneau":                "bruneau.fr",
    "BiteRight":              "biteright.io",
    "IOSFIX":                 "iosfix.com",
    "Spark":                  "ormco.com",
    "Martín":                 "martinycachon.com",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def extract_domain(url: str) -> str | None:
    try:
        parsed = urllib.parse.urlparse(url)
        host = parsed.netloc or parsed.path
        host = host.split(':')[0].lstrip('www.').lower()
        return host if '.' in host else None
    except Exception:
        return None


def manual_domain(nombre: str) -> str | None:
    nombre_lower = nombre.lower()
    for key, domain in MANUAL_DOMAINS.items():
        if key.lower() in nombre_lower or nombre_lower in key.lower():
            return domain
    return None


def verify_logo(url: str) -> bool:
    """Return True if HEAD request confirms an image response."""
    try:
        r = requests.head(url, timeout=5, allow_redirects=True,
                          headers={'User-Agent': 'Mozilla/5.0'})
        ct = r.headers.get('Content-Type', '')
        return r.status_code == 200 and 'image' in ct
    except requests.RequestException:
        return False


# ── Main ──────────────────────────────────────────────────────────────────────

def run():
    proveedores = Proveedor.objects.all().order_by('nombre')
    total = proveedores.count()
    ok = 0
    failed = []

    print(f"Proveedores a procesar: {total}\n")

    for prov in proveedores:
        # 1. Determine domain
        domain = None
        if prov.url_web:
            domain = extract_domain(prov.url_web)
        if not domain:
            domain = manual_domain(prov.nombre)

        if not domain:
            print(f"  [SKIP] {prov.nombre} — sin dominio")
            failed.append(prov.nombre)
            continue

        # 2. Try Google favicon first, then DuckDuckGo
        logo_url = google_logo(domain)
        source = 'Google'

        if not verify_logo(logo_url):
            logo_url = duckduckgo_logo(domain)
            source = 'DuckDuckGo'
            if not verify_logo(logo_url):
                # Store Google URL anyway — browser degrades gracefully
                logo_url = google_logo(domain)
                source = 'Google (unverified)'

        prov.logo_url = logo_url
        prov.save(update_fields=['logo_url'])
        print(f"  [OK]   {prov.nombre} → {domain}  [{source}]")
        ok += 1

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print("─── Resumen ──────────────────────────────────────")
    print(f"  Logos asignados  : {ok} / {total}")
    print(f"  Sin logo         : {len(failed)}")
    if failed:
        print(f"  Sin dominio:")
        for name in failed:
            print(f"    • {name}")
    print("──────────────────────────────────────────────────")


if __name__ == '__main__':
    run()
