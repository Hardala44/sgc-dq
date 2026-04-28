#!/usr/bin/env python3
"""
run_mass_ingestion.py
=====================
Master orchestrator for DQ catalog mass ingestion.

Reads marketplace_targets.json, scrapes every supplier in concurrent
batches of 3, normalises with Gemini Flash, and POSTs to the local
Django ingestion API.  All failures are logged to ingestion_errors.log
and the process always continues to the next provider.

Usage
-----
    # Full run (requires Django server running on :8000)
    python backend/run_mass_ingestion.py

    # Dry-run — fetch + Gemini but skip the API POST
    python backend/run_mass_ingestion.py --dry-run

    # Process only specific providers
    python backend/run_mass_ingestion.py --only henry-schein proclinic

    # Skip known-broken providers
    python backend/run_mass_ingestion.py --skip cherokee maletin-reanimacion

    # Point to a different targets file
    python backend/run_mass_ingestion.py --targets /path/to/targets.json

Environment variables
---------------------
    GEMINI_API_KEY   (required)  Google AI Studio key
    DQ_API_KEY       (optional)  Ingestion gateway key (dev default works locally)
    DQ_API_URL       (optional)  Base ingestion URL    (default: http://localhost:8000/api/ingesta-productos/)
"""

import os
import sys
import json
import time
import logging
import argparse
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from bs4 import BeautifulSoup

import warnings
warnings.filterwarnings("ignore", category=FutureWarning)   # suppress google.generativeai deprecation noise

try:
    import google.generativeai as genai
except ImportError:
    print("ERROR: google-generativeai not installed.  Run:  pip install google-generativeai", file=sys.stderr)
    sys.exit(1)

# ── Path constants ─────────────────────────────────────────────────────────────
BACKEND_DIR     = Path(__file__).parent.resolve()
ROOT_DIR        = BACKEND_DIR.parent
DEFAULT_TARGETS = ROOT_DIR / "marketplace_targets.json"
LOG_FILE        = ROOT_DIR / "ingestion_errors.log"

# ── Config from env ────────────────────────────────────────────────────────────
API_URL    = os.environ.get("DQ_API_URL",  "http://localhost:8000/api/ingesta-productos/")
API_KEY    = os.environ.get("DQ_API_KEY",  "dq-ingesta-dev-key-change-me-in-production")
GEMINI_KEY = os.environ.get("GEMINI_API_KEY", "")

# ── File error log (one structured line per failure) ───────────────────────────
logging.basicConfig(
    filename=str(LOG_FILE),
    filemode="a",
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    level=logging.WARNING,
)
error_log = logging.getLogger("dq.mass_ingestion")

# ── Thread-safe progress counter ───────────────────────────────────────────────
_lock    = threading.Lock()
_counter = 0


def _next() -> int:
    global _counter
    with _lock:
        _counter += 1
        return _counter


# ─────────────────────────────────────────────────────────────────────────────
# Gemini prompt — much stricter than the standalone scraper
# Forces master-line aggregation with examples + counter-examples
# ─────────────────────────────────────────────────────────────────────────────
_SYSTEM_INSTRUCTION = (
    "You are a dental supply catalog normalisation expert. "
    "Your only job is to collapse individual product variants into canonical MASTER LINES. "
    "A master line is the most general, commercially meaningful name for a product family — "
    "omitting presentation format, size, colour, shade, tray count, concentration, flavour, etc."
)


def _build_strict_prompt(html_chunk: str, provider_name: str, base_url: str, categoria: str) -> str:
    return f"""CONTEXT
Supplier : {provider_name}
Category : {categoria}
Base URL : {base_url}

TASK
Extract products from the HTML below and return a JSON array of MASTER LINE objects.

MASTER LINE RULES — follow exactly or the output will be rejected:

1. "linea_producto" = GENERIC FAMILY NAME only.
   ✅ CORRECT  →  "Composite Filtek Z250"   |  "Guantes de Nitrilo"  |  "Implante Bone Level"
   ❌ WRONG    →  "Composite Filtek Z250 Jeringa A2 4g Box/20"  |  "Guantes Nitrilo Azul Talla M"

2. Strip from names: shade codes, sizes, weights, box quantities, colours, concentrations, flavours,
   application methods, expiry info, "pack de N", "caja de N", etc.

3. Deduplicate: if you see 6 shade variants of the same composite, output ONE entry, not 6.

4. "marca" = brand name (e.g. "3M", "GC", "Straumann"). Empty string if unknown.

5. "url_compra_especifica" = most specific product page URL found.
   If relative, prepend {base_url}. If none exists, use "{base_url}".

OUTPUT FORMAT — CRITICAL:
  • Return ONLY a raw JSON array — no markdown, no code fences, no explanations, no trailing text.
  • Minimum 5 items, maximum 20 items.
  • Deduplicated master lines only.

EXAMPLE:
[
  {{"linea_producto": "Composite Filtek Z250", "marca": "3M", "url_compra_especifica": "https://tienda.es/filtek"}},
  {{"linea_producto": "Adhesivo Single Bond Universal", "marca": "3M", "url_compra_especifica": "https://tienda.es/singlebond"}},
  {{"linea_producto": "Guantes de Nitrilo", "marca": "Medigloves", "url_compra_especifica": "https://tienda.es/guantes"}}
]

HTML TO PARSE:
{html_chunk}"""


# ─────────────────────────────────────────────────────────────────────────────
# Single-provider pipeline  (never raises, never calls sys.exit)
# ─────────────────────────────────────────────────────────────────────────────
def scrape_one(target: dict, dry_run: bool = False) -> dict:
    """
    Complete pipeline for one provider: fetch → DOM extract → Gemini → POST.

    Returns a result dict:
      {id, name, status, created, updated, errors: [str]}

    Status values:  ok | dry_run | fetch_error | empty_page |
                    gemini_error | gemini_json_error | empty_payload | api_error
    """
    tid  = target["id"]
    name = target["name"]
    base = target["base_url"]
    url  = target["scrape_url"]
    cat  = target.get("categoria", "Depósitos y Aparatología")
    sel  = target.get("selectors", {}).get("product_item", "a[href]")

    result: dict = {"id": tid, "name": name, "status": "ok",
                    "created": 0, "updated": 0, "errors": []}

    # ── 1. Fetch HTML ─────────────────────────────────────────────────────────
    try:
        http_resp = requests.get(
            url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; DQ-MassIngestion/1.0)"},
            timeout=25,
            allow_redirects=True,
        )
        http_resp.raise_for_status()
        soup = BeautifulSoup(http_resp.text, "lxml")
    except Exception as exc:
        result["status"] = "fetch_error"
        result["errors"].append(str(exc))
        return result

    # ── 2. Extract DOM chunk ──────────────────────────────────────────────────
    items = soup.select(sel)
    if not items:                          # CSS selector matched nothing
        items = soup.select("a[href]")    # structural fallback
    items = items[:30]
    html_chunk = "\n".join(str(i) for i in items[:20])

    if not html_chunk.strip():             # still empty — try plain text
        html_chunk = soup.get_text(separator="\n", strip=True)[:7000]

    if not html_chunk.strip():
        result["status"] = "empty_page"
        result["errors"].append("No extractable content from page")
        return result

    # ── 3. Gemini extraction ──────────────────────────────────────────────────
    try:
        model  = genai.GenerativeModel(
            "models/gemini-flash-lite-latest",
            system_instruction=_SYSTEM_INSTRUCTION,
        )
        prompt  = _build_strict_prompt(html_chunk, name, base, cat)
        g_resp  = model.generate_content(prompt)
        raw     = g_resp.text.strip()

        # Strip any stray markdown fences even if we asked it not to add them
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        data = json.loads(raw)
        if not isinstance(data, list):
            raise ValueError("Gemini response is not a JSON array")

    except json.JSONDecodeError as exc:
        result["status"] = "gemini_json_error"
        result["errors"].append(f"JSON parse: {exc}")
        return result
    except Exception as exc:
        result["status"] = "gemini_error"
        result["errors"].append(str(exc))
        return result

    # ── 4. Build normalised payload ───────────────────────────────────────────
    seen_lines: set[str] = set()
    payload: list[dict]  = []

    for item in data:
        linea = (item.get("linea_producto") or "").strip()
        if not linea or len(linea) < 3:
            continue
        key = linea.lower()
        if key in seen_lines:              # deduplicate within the batch
            continue
        seen_lines.add(key)

        item_url = (item.get("url_compra_especifica") or base).strip()
        if item_url and not item_url.startswith("http"):
            item_url = base.rstrip("/") + "/" + item_url.lstrip("/")

        payload.append({
            "linea_producto":        linea,
            "marca":                 (item.get("marca") or "").strip(),
            "categoria_name":        cat,
            "proveedor_nombre":      name,
            "url_compra_especifica": item_url,
        })

    if not payload:
        result["status"] = "empty_payload"
        result["errors"].append("All Gemini items were filtered out (too short or missing linea_producto)")
        return result

    if dry_run:
        result["status"]  = "dry_run"
        result["created"] = len(payload)   # report what would have been submitted
        return result

    # ── 5. POST to ingestion API ──────────────────────────────────────────────
    try:
        api_resp = requests.post(
            API_URL,
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Api-Key":    API_KEY,
                "User-Agent":   "DQ-MassIngestion/1.0",
            },
            timeout=20,
        )
        if api_resp.status_code in (200, 207):
            body = api_resp.json()
            result["created"] = body.get("created", 0)
            result["updated"] = body.get("updated", 0)
            api_errors = body.get("errors", [])
            if api_errors:
                result["errors"].extend(str(e) for e in api_errors[:5])  # cap noise
        else:
            result["status"] = "api_error"
            result["errors"].append(f"HTTP {api_resp.status_code}: {api_resp.text[:200]}")
    except Exception as exc:
        result["status"] = "api_error"
        result["errors"].append(str(exc))

    return result


# ─────────────────────────────────────────────────────────────────────────────
# Terminal colour helpers (degrade gracefully on Windows without ANSI)
# ─────────────────────────────────────────────────────────────────────────────
def _supports_color() -> bool:
    return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()


if _supports_color():
    RST    = "\033[0m"
    GREEN  = "\033[92m"
    RED    = "\033[91m"
    YELLOW = "\033[93m"
    CYAN   = "\033[96m"
    BOLD   = "\033[1m"
else:
    RST = GREEN = RED = YELLOW = CYAN = BOLD = ""


def _fmt(n: int, total: int, result: dict) -> str:
    tag  = f"[{n:>2}/{total}]"
    name = result["name"]
    st   = result["status"]
    c, u = result["created"], result["updated"]

    if st == "ok":
        suffix = f"{GREEN}OK{RST}  +{c} nuevos  ~{u} actualizados"
    elif st == "dry_run":
        suffix = f"{CYAN}DRY-RUN{RST}  {c} productos listos"
    else:
        short = result["errors"][0][:90] if result["errors"] else st
        suffix = f"{RED}FALLO ({st}){RST}  {short}"

    return f"{BOLD}{tag}{RST} {name:<38} {suffix}"


# ─────────────────────────────────────────────────────────────────────────────
# Orchestration entry point
# ─────────────────────────────────────────────────────────────────────────────
def main() -> None:
    parser = argparse.ArgumentParser(
        description="DQ Mass Ingestion — procesa hasta 60 proveedores en paralelo",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--targets",  default=str(DEFAULT_TARGETS),
                        help="Ruta al marketplace_targets.json")
    parser.add_argument("--workers",  type=int, default=3,
                        help="Llamadas Gemini concurrentes (default 3, max recomendado 5)")
    parser.add_argument("--dry-run",  action="store_true",
                        help="Fetch + Gemini pero sin enviar al API")
    parser.add_argument("--only",     nargs="+",
                        help="Procesar solo estos IDs de proveedor")
    parser.add_argument("--skip",     nargs="+", default=[],
                        help="Omitir estos IDs de proveedor")
    parser.add_argument("--delay",    type=float, default=1.5,
                        help="Pausa en segundos entre batches (default 1.5)")
    args = parser.parse_args()

    # ── Pre-flight checks ─────────────────────────────────────────────────────
    if not GEMINI_KEY:
        print(f"{RED}ERROR:{RST} La variable GEMINI_API_KEY no está definida.", file=sys.stderr)
        print("       Ejecuta:  set GEMINI_API_KEY=tu-clave   (Windows)", file=sys.stderr)
        print("       O bien:   export GEMINI_API_KEY=tu-clave (Mac/Linux)", file=sys.stderr)
        sys.exit(1)

    genai.configure(api_key=GEMINI_KEY)

    targets_path = Path(args.targets)
    if not targets_path.exists():
        print(f"{RED}ERROR:{RST} No se encuentra el archivo de targets: {targets_path}", file=sys.stderr)
        sys.exit(1)

    with open(targets_path, encoding="utf-8") as fh:
        all_targets: list[dict] = json.load(fh)

    # ── Apply filters ─────────────────────────────────────────────────────────
    if args.only:
        targets = [t for t in all_targets if t["id"] in args.only]
        if not targets:
            print(f"{YELLOW}WARN:{RST} Ningún target coincide con --only {args.only}")
            sys.exit(0)
    else:
        targets = [t for t in all_targets if t["id"] not in args.skip]

    total   = len(targets)
    workers = min(args.workers, total, 5)   # hard cap at 5 to respect Gemini RPM

    # ── Header ────────────────────────────────────────────────────────────────
    border = "═" * 58
    print(f"\n{BOLD}╔{border}╗")
    print(f"║  DQ Mass Ingestion   {total} proveedores   {workers} workers{' (DRY-RUN)' if args.dry_run else ''}{''.ljust(58 - 35 - len(str(total)) - len(str(workers)) - (10 if args.dry_run else 0))}║")
    print(f"╚{border}╝{RST}\n")

    if args.dry_run:
        print(f"  {CYAN}[DRY-RUN] Los productos NO se enviarán al API.{RST}\n")

    ok_count  = 0
    err_count = 0
    global _counter
    _counter  = 0

    # ── Batch loop ────────────────────────────────────────────────────────────
    for batch_start in range(0, total, workers):
        batch = targets[batch_start: batch_start + workers]

        with ThreadPoolExecutor(max_workers=workers) as pool:
            future_map = {pool.submit(scrape_one, t, args.dry_run): t for t in batch}

            for fut in as_completed(future_map):
                n      = _next()
                result = fut.result()
                print(_fmt(n, total, result), flush=True)

                if result["status"] in ("ok", "dry_run"):
                    ok_count += 1
                else:
                    err_count += 1
                    error_log.warning(
                        "PROVIDER=%-30s  STATUS=%-20s  DETAIL=%s",
                        result["id"],
                        result["status"],
                        " | ".join(result["errors"]),
                    )

        # Pause between batches to avoid hitting Gemini rate limits
        if batch_start + workers < total:
            time.sleep(args.delay)

    # ── Summary footer ────────────────────────────────────────────────────────
    line = "─" * 60
    print(f"\n{BOLD}{line}{RST}")
    print(f"  {GREEN}✓ Completados : {ok_count}/{total}{RST}")
    if err_count:
        print(f"  {RED}✗ Fallidos    : {err_count}/{total}   →  {LOG_FILE}{RST}")
    print(f"{BOLD}{line}{RST}\n")

    sys.exit(0 if err_count == 0 else 1)


if __name__ == "__main__":
    main()
