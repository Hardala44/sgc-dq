"""
compras/services/live_search_manager.py
========================================
Thread-based session manager for live supplier scraping.

Architecture
------------
- Sessions are stored in a process-level dict (LIVE_SESSIONS).
- Each session runs dq_universal_scraper logic directly (not subprocess)
  to avoid Windows PATH issues and allow DB access.
- Correction #2: Results are "hydrated" with DQ pricing before returning to frontend.
- Sessions expire after SESSION_TTL_SECONDS to prevent memory leaks.

Lifecycle
---------
  start_session()  ->  starts thread, sets status = "pending"
  get_status()     ->  returns {status, results, providers_searched, error}
  cleanup_stale()  ->  removes expired sessions (called lazily)
"""

from __future__ import annotations

import json
import logging
import os
import threading
import time
import uuid
from dataclasses import dataclass, field
from typing import Any, Optional

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger("compras.ingestion")

# ─── In-process session store ─────────────────────────────────────────────────
LIVE_SESSIONS: dict[str, "LiveSession"] = {}
_LOCK = threading.Lock()
SESSION_TTL_SECONDS = 300  # 5 minutes

# Path to targets file (relative to Django manage.py)
_BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGETS_FILE = os.path.join(_BASE_DIR, "marketplace_targets.json")


# ─── Session dataclass ─────────────────────────────────────────────────────────

@dataclass
class LiveSession:
    session_id: str
    query: str
    scraper_terms: list[str]
    providers: list[str]
    status: str = "pending"          # pending | running | done | error | timeout
    results: list[dict] = field(default_factory=list)
    providers_searched: list[str] = field(default_factory=list)
    error: Optional[str] = None
    started_at: float = field(default_factory=time.time)
    finished_at: Optional[float] = None

    def is_expired(self) -> bool:
        return time.time() - self.started_at > SESSION_TTL_SECONDS

    def to_dict(self) -> dict:
        return {
            "session_id": self.session_id,
            "status": self.status,
            "results": self.results,
            "providers_searched": self.providers_searched,
            "error": self.error,
            "duration_s": round(self.finished_at - self.started_at, 1) if self.finished_at else None,
        }


# ─── Public API ───────────────────────────────────────────────────────────────

def start_session(
    query: str,
    scraper_terms: list[str],
    providers: list[str],
    session_id: Optional[str] = None,
) -> str:
    """
    Start a live scrape session in a background thread.

    Args:
        query: Original user search query
        scraper_terms: AI-generated search terms optimised for supplier sites
        providers: DQ provider names to target
        session_id: Optional custom ID (generated if absent)

    Returns:
        session_id (use to poll get_status())
    """
    cleanup_stale()

    sid = session_id or str(uuid.uuid4())[:12]
    session = LiveSession(
        session_id=sid,
        query=query,
        scraper_terms=scraper_terms,
        providers=providers,
    )

    with _LOCK:
        LIVE_SESSIONS[sid] = session

    thread = threading.Thread(
        target=_scrape_worker,
        args=(sid,),
        name=f"live-scrape-{sid}",
        daemon=True,
    )
    thread.start()
    logger.info("LiveSearch session %s started for query='%s' providers=%s", sid, query, providers)
    return sid


def get_status(session_id: str) -> dict:
    """
    Poll the status of a live scrape session.

    Returns:
        dict with keys: status, results, providers_searched, error, session_id
    """
    with _LOCK:
        session = LIVE_SESSIONS.get(session_id)

    if not session:
        return {"session_id": session_id, "status": "not_found", "results": [], "providers_searched": [], "error": "Session not found or expired"}

    return session.to_dict()


def cleanup_stale() -> int:
    """Remove expired sessions. Returns count removed."""
    with _LOCK:
        stale = [sid for sid, s in LIVE_SESSIONS.items() if s.is_expired()]
        for sid in stale:
            del LIVE_SESSIONS[sid]
    if stale:
        logger.debug("Cleaned up %d stale live-search sessions", len(stale))
    return len(stale)


# ─── Worker (runs in background thread) ───────────────────────────────────────

def _scrape_worker(session_id: str) -> None:
    """
    Background worker that:
    1. Loads marketplace targets
    2. Fetches HTML from matched supplier URLs
    3. Uses Gemini to extract products from HTML
    4. Hydrates results with DQ pricing (correction #2)
    5. Stores results in session
    """
    with _LOCK:
        session = LIVE_SESSIONS.get(session_id)
    if not session:
        return

    session.status = "running"
    all_results: list[dict] = []
    providers_searched: list[str] = []

    try:
        targets = _load_targets()
        if not targets:
            session.status = "done"
            session.results = []
            session.error = "No marketplace_targets.json found — no live search possible."
            session.finished_at = time.time()
            return

        # Match targets to our suggested providers
        matched_targets = _match_targets_to_providers(targets, session.providers)
        if not matched_targets:
            # Fallback: take first 2 targets regardless
            matched_targets = targets[:2]

        # Use the best scraper term (first AI-generated one, or original query)
        primary_search_term = (
            session.scraper_terms[0] if session.scraper_terms else session.query
        )

        # Gemini API key
        from django.conf import settings as django_settings
        api_key = getattr(django_settings, "GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")

        for target in matched_targets[:3]:  # Cap at 3 providers
            provider_name = target.get("name", "Unknown")
            try:
                products = _scrape_target(
                    target=target,
                    search_term=primary_search_term,
                    all_search_terms=session.scraper_terms,
                    gemini_api_key=api_key,
                )
                if products:
                    # Correction #2: hydrate prices
                    hydrated = _hydrate_products(products, provider_name)
                    all_results.extend(hydrated)
                    providers_searched.append(provider_name)
                    logger.info("LiveSearch %s: %d products from %s", session_id, len(products), provider_name)

            except Exception as exc:
                logger.warning("LiveSearch %s: error scraping %s: %s", session_id, provider_name, exc)

    except Exception as exc:
        logger.exception("LiveSearch %s: worker crashed: %s", session_id, exc)
        session.error = str(exc)
        session.status = "error"
        session.finished_at = time.time()
        return

    session.results = all_results
    session.providers_searched = providers_searched
    session.status = "done"
    session.finished_at = time.time()
    logger.info(
        "LiveSearch %s DONE: %d results from %d providers in %.1fs",
        session_id,
        len(all_results),
        len(providers_searched),
        session.finished_at - session.started_at,
    )


def _load_targets() -> list[dict]:
    """Load marketplace_targets.json. Returns empty list if missing."""
    if not os.path.exists(TARGETS_FILE):
        logger.warning("marketplace_targets.json not found at %s", TARGETS_FILE)
        return []
    try:
        with open(TARGETS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error("Failed to load targets: %s", e)
        return []


def _match_targets_to_providers(targets: list[dict], providers: list[str]) -> list[dict]:
    """
    Match suggested provider names to entries in marketplace_targets.json.
    Uses substring normalised matching.
    """
    import unicodedata

    def norm(s: str) -> str:
        nfkd = unicodedata.normalize("NFKD", s)
        return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()

    matched = []
    norm_providers = [norm(p) for p in providers]

    for target in targets:
        tn = norm(target.get("name", ""))
        for np in norm_providers:
            if np in tn or tn in np:
                matched.append(target)
                break

    return matched


def _scrape_target(
    target: dict,
    search_term: str,
    all_search_terms: list[str],
    gemini_api_key: str,
) -> list[dict]:
    """
    Fetch and parse one supplier target.
    Returns list of raw product dicts: {linea_producto, marca, url_compra, proveedor_nombre, categoria_name}
    """
    name = target.get("name", "Unknown")
    base_url = target.get("base_url", "")
    scrape_url = target.get("scrape_url", base_url)
    categoria = target.get("categoria", "Depósitos y Aparatología")
    selector = target.get("selectors", {}).get("product_item", "a")

    # Attempt to modify URL with search term if a search_url_template is provided
    search_url_template = target.get("search_url_template", "")
    if search_url_template:
        import urllib.parse
        scrape_url = search_url_template.format(
            term=urllib.parse.quote_plus(search_term)
        )

    try:
        resp = requests.get(
            scrape_url,
            headers={"User-Agent": "Mozilla/5.0 (compatible; DQ-SmartSearch/1.0)"},
            timeout=15,
            allow_redirects=True,
        )
        resp.raise_for_status()
    except Exception as e:
        logger.warning("Fetch failed for %s (%s): %s", name, scrape_url, e)
        return []

    soup = BeautifulSoup(resp.text, "lxml")
    items = soup.select(selector) or soup.select("a[href]")
    items = items[:30]
    html_chunk = "\n".join(str(i) for i in items[:20])

    if not html_chunk.strip():
        html_chunk = soup.get_text(separator="\n", strip=True)[:5000]

    if not html_chunk.strip():
        return []

    if not gemini_api_key:
        # No AI: return a placeholder result indicating the product might be there
        return [{
            "linea_producto": search_term.title(),
            "marca": "",
            "url_compra": scrape_url,
            "proveedor_nombre": name,
            "categoria_name": categoria,
            "precio_web": None,
            "is_live": True,
        }]

    # Use Gemini to extract products
    try:
        from google import genai
        from google.genai import types as genai_types

        client = genai.Client(api_key=gemini_api_key)

        prompt = f"""Eres un extractor de datos de catálogos dentales.
Analiza este HTML del proveedor {name} buscando productos relacionados con: "{search_term}".

Extrae SOLO productos relevantes a "{search_term}" (y sinónimos: {', '.join(all_search_terms)}).
Devuelve ÚNICAMENTE JSON array:
[{{"linea_producto": "nombre normalizado", "marca": "marca o vacío", "url_compra": "URL directa o {base_url}", "precio_web": null}}]

Máximo 10 productos. Si no hay productos relevantes devuelve [].

HTML:
{html_chunk[:4000]}"""

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=1024,
            ),
        )
        raw = response.text.strip()

        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        if not raw or raw == "[]":
            return []

        data = json.loads(raw)
        results = []
        for item in data:
            linea = str(item.get("linea_producto", "")).strip()
            if not linea or len(linea) < 3:
                continue
            url = str(item.get("url_compra", base_url)).strip()
            if url and not url.startswith("http"):
                url = base_url.rstrip("/") + "/" + url.lstrip("/")

            results.append({
                "linea_producto": linea,
                "marca": str(item.get("marca", "")).strip(),
                "url_compra": url,
                "proveedor_nombre": name,
                "categoria_name": categoria,
                "precio_web": item.get("precio_web"),
                "is_live": True,
            })
        return results

    except Exception as e:
        logger.warning("Gemini extraction failed for %s: %s", name, e)
        return []



# ─── Correction #2: Price Hydration ───────────────────────────────────────────

def _hydrate_products(raw_products: list[dict], provider_name: str) -> list[dict]:
    """
    Enrich raw scraper results with DQ pricing data.

    Formula:  precio_dq = precio_web * (1 - ahorro_estimado)
    If precio_web is None, we show the ahorro_estimado % as savings potential.

    Also resolves the categoria_name to a real DB category.
    """
    from compras.services.marketplace_search_service import _resolve_to_db_category

    # Fetch provider's ahorro_estimado from DB
    ahorro = _get_provider_ahorro(provider_name)
    ahorro_pct = float(ahorro) if ahorro else 0.0

    hydrated = []
    for product in raw_products:
        p = dict(product)  # copy

        # Resolve categoria to real DB name (correction #1)
        raw_cat = p.get("categoria_name", "")
        p["categoria_name"] = _resolve_to_db_category(raw_cat)

        # Price hydration (correction #2)
        precio_web = p.get("precio_web")
        if precio_web is not None:
            try:
                precio_web_f = float(precio_web)
                p["precio_dq"] = round(precio_web_f * (1 - ahorro_pct), 2)
                p["ahorro_euros"] = round(precio_web_f * ahorro_pct, 2)
            except (ValueError, TypeError):
                p["precio_dq"] = None
                p["ahorro_euros"] = None
        else:
            p["precio_dq"] = None
            p["ahorro_euros"] = None

        p["ahorro_pct"] = round(ahorro_pct * 100, 1)  # e.g. 12.0
        p["proveedor_nombre"] = provider_name
        hydrated.append(p)

    return hydrated


def _get_provider_ahorro(provider_name: str) -> Optional[float]:
    """Fetch ahorro_estimado from DB for a given provider name."""
    try:
        from compras.models import Proveedor

        prov = Proveedor.objects.filter(nombre__iexact=provider_name, activo=True).first()
        if not prov:
            # Try partial match
            prov = Proveedor.objects.filter(
                nombre__icontains=provider_name.split()[0] if provider_name else "",
                activo=True
            ).first()
        if prov and prov.ahorro_estimado is not None:
            return float(prov.ahorro_estimado)
    except Exception as e:
        logger.warning("Could not fetch ahorro for provider %s: %s", provider_name, e)
    return None
