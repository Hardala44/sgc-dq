"""
compras/services/marketplace_search_service.py
================================================
AI-powered search enrichment using Google Gemini Flash.

Responsibilities
----------------
1. Enrich a raw user query with:
   - Related dental technical terms (for DB search widening)
   - 3 "scraper search terms" optimised for supplier website search boxes
     (e.g. "babero" -> ["babero dental desechable", "servilleta proteccion paciente"])
   - The single best matching category from the REAL DB categories
   - Top 3 DQ supplier names likely to stock the product

2. Map AI-suggested categories strictly to DB categories (NEVER create new ones).

3. Fallback gracefully when GEMINI_API_KEY is absent or the API call fails.
"""

from __future__ import annotations

import json
import logging
import os
import unicodedata
from dataclasses import dataclass, field
from typing import Optional

from django.conf import settings

logger = logging.getLogger('compras.ingestion')

# ─── Real DB categories (hardcoded + dynamically refreshed at runtime) ─────────
# These are the ONLY valid category names.  The AI is constrained to pick from
# this exact list.  If it hallucates a different name, _resolve_to_db_category()
# will fuzzy-match it back to the nearest real one.
REAL_CATEGORIES: list[str] = [
    "Depósitos y Aparatología",
    "Financieras",
    "Gestión y marketing dental",
    "Gestoría y Seguros",
    "Implantología",
    "Laboratorio",
    "Ortodoncia",
    "Otros",
    "Radiología UTPR y Dosimetría",
    "Servicios",
    "Software y Ciberseguridad",
]

# Canonical default when no match is found
DEFAULT_CATEGORY = "Depósitos y Aparatología"


def _normalise(s: str) -> str:
    """Lowercase + strip accents for fuzzy comparison."""
    nfkd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).lower().strip()


def _get_real_categories() -> list[str]:
    """
    Returns the canonical category list.
    On first call it refreshes from the DB so we never go stale.
    Falls back to the hardcoded list if the DB is unavailable.
    """
    try:
        from compras.models import Categoria  # local import to avoid circular deps
        db_names = list(Categoria.objects.values_list("nombre", flat=True))
        if db_names:
            return db_names
    except Exception:
        pass
    return REAL_CATEGORIES


def _resolve_to_db_category(ai_suggestion: str) -> str:
    """
    Maps an AI-suggested category name to the closest real DB category.
    Strategy:
        1. Exact iexact match
        2. One name is a substring of the other (normalised)
        3. Shared significant word
        4. Default fallback
    Never creates a new category.
    """
    real_cats = _get_real_categories()

    if not ai_suggestion:
        return DEFAULT_CATEGORY

    norm_suggestion = _normalise(ai_suggestion)

    # 1. Exact (normalised)
    for cat in real_cats:
        if _normalise(cat) == norm_suggestion:
            return cat

    # 2. Substring containment
    for cat in real_cats:
        nc = _normalise(cat)
        if norm_suggestion in nc or nc in norm_suggestion:
            return cat

    # 3. Shared significant word (>3 chars)
    suggestion_words = {w for w in norm_suggestion.split() if len(w) > 3}
    best_cat = None
    best_score = 0
    for cat in real_cats:
        nc = _normalise(cat)
        cat_words = {w for w in nc.split() if len(w) > 3}
        shared = suggestion_words & cat_words
        if len(shared) > best_score:
            best_score = len(shared)
            best_cat = cat

    if best_cat:
        return best_cat

    # 4. Fallback to "Depósitos y Aparatología" (covers most consumables)
    return DEFAULT_CATEGORY


# ─── Result dataclass ──────────────────────────────────────────────────────────

@dataclass
class SearchEnrichment:
    """
    Structured result from the AI enrichment step.
    All fields are safe defaults if AI is unavailable.
    """
    # Original query
    query: str

    # Expanded terms for DB search (merged with query tokens)
    related_terms: list[str] = field(default_factory=list)

    # Scraper-optimised search strings for supplier website search boxes
    scraper_terms: list[str] = field(default_factory=list)

    # Resolved DB category name (guaranteed to exist in DB)
    categoria_nombre: str = DEFAULT_CATEGORY

    # Top 3 DQ provider names (for live scraper targeting)
    proveedores_sugeridos: list[str] = field(default_factory=list)

    # Whether AI enrichment succeeded
    ai_enriched: bool = False

    # Human-readable explanation for the UI
    ai_context: str = ""


# ─── Gemini prompt ────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """Eres un asistente experto en suministros dentales españoles para clínicas.
El usuario busca un producto en el marketplace de DentalQuality.

CATEGORÍAS DISPONIBLES (elige UNA exactamente como aparece aquí):
{categories_list}

PROVEEDORES DISPONIBLES (elige máximo 3 de esta lista):
{providers_list}

Para la búsqueda "{query}", responde ÚNICAMENTE con un JSON válido con esta estructura exacta:
{{
  "related_terms": ["término técnico 1", "término técnico 2", "término técnico 3"],
  "scraper_terms": ["término scraper 1", "término scraper 2", "término scraper 3"],
  "categoria": "nombre exacto de una categoría de la lista",
  "proveedores": ["Proveedor1", "Proveedor2", "Proveedor3"],
  "contexto": "Una frase explicando por qué estos proveedores y categoría"
}}

REGLAS CRÍTICAS:
- "categoria" debe ser exactamente igual a uno de los valores de la lista de CATEGORÍAS
- "scraper_terms" son frases para buscar en la web del proveedor (más específicas que la query original)
- "related_terms" amplían la búsqueda en nuestra BD interna
- "proveedores" deben ser nombres de la lista de PROVEEDORES
- Responde SOLO el JSON, sin markdown, sin texto extra"""


def enrich_query(query: str, top_providers: int = 3) -> SearchEnrichment:
    """
    Main entry point.  Enriches a search query with AI metadata.

    Args:
        query: Raw user search string
        top_providers: How many providers to suggest (default 3)

    Returns:
        SearchEnrichment with AI data, or safe defaults if AI unavailable.
    """
    enrichment = SearchEnrichment(query=query)

    # ── Build default scraper terms (heuristic, no AI needed) ────────────────
    # Always set these as a fallback before trying AI
    enrichment.scraper_terms = _heuristic_scraper_terms(query)
    enrichment.related_terms = _heuristic_related_terms(query)

    # ── Check API key ─────────────────────────────────────────────────────────
    api_key = getattr(settings, "GEMINI_API_KEY", "") or os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        logger.info("GEMINI_API_KEY not set — using heuristic enrichment for query: %s", query)
        # Still resolve category heuristically
        enrichment.categoria_nombre = _heuristic_category(query)
        enrichment.proveedores_sugeridos = _heuristic_providers(query)
        return enrichment

    # ── Call Gemini ───────────────────────────────────────────────────────────
    try:
        from google import genai
        from google.genai import types as genai_types

        client = genai.Client(api_key=api_key)

        # Build category + provider context lists for the prompt
        real_cats = _get_real_categories()
        real_provs = _get_active_provider_names()

        prompt = _SYSTEM_PROMPT.format(
            categories_list="\n".join(f"- {c}" for c in real_cats),
            providers_list="\n".join(f"- {p}" for p in real_provs[:40]),  # cap at 40
            query=query,
        )

        response = client.models.generate_content(
            model="gemini-2.5-flash-lite",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                temperature=0.2,
                max_output_tokens=512,
                response_mime_type="application/json",
            ),
        )
        raw = response.text.strip()

        # Strip markdown code fences
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        raw = raw.strip()

        data = json.loads(raw)

        # ── Apply 4 corrections ───────────────────────────────────────────────

        # 1. Related terms (DB search widening)
        enrichment.related_terms = [
            str(t).strip() for t in data.get("related_terms", []) if str(t).strip()
        ][:5]

        # 2. Scraper terms (correction #3: semantic expansion for scraper)
        enrichment.scraper_terms = [
            str(t).strip() for t in data.get("scraper_terms", []) if str(t).strip()
        ][:3]
        if not enrichment.scraper_terms:
            enrichment.scraper_terms = _heuristic_scraper_terms(query)

        # 3. Category — strictly resolved to DB (correction #1)
        ai_cat = data.get("categoria", "")
        enrichment.categoria_nombre = _resolve_to_db_category(ai_cat)

        # 4. Providers — filter to only real DQ providers
        ai_provs = [str(p).strip() for p in data.get("proveedores", [])]
        enrichment.proveedores_sugeridos = _filter_real_providers(ai_provs, real_provs)[:top_providers]
        if not enrichment.proveedores_sugeridos:
            enrichment.proveedores_sugeridos = _heuristic_providers(query)

        # 5. Context for UI
        enrichment.ai_context = str(data.get("contexto", ""))[:200]
        enrichment.ai_enriched = True

        logger.info(
            "AI enrichment OK for '%s': cat=%s providers=%s terms=%s scraper=%s",
            query,
            enrichment.categoria_nombre,
            enrichment.proveedores_sugeridos,
            enrichment.related_terms,
            enrichment.scraper_terms,
        )

    except json.JSONDecodeError as e:
        logger.warning("AI returned invalid JSON for query '%s': %s", query, e)
    except Exception as e:
        logger.warning("AI enrichment failed for query '%s': %s", query, e)
        # Ensure heuristics are always there
        enrichment.categoria_nombre = _heuristic_category(query)
        enrichment.proveedores_sugeridos = _heuristic_providers(query)

    return enrichment


# ─── Heuristic fallbacks (no AI needed) ──────────────────────────────────────

def _heuristic_scraper_terms(query: str) -> list[str]:
    """
    Generate scraper-optimised search terms without AI.
    If the query looks like a prefix of a known dental term, use the full term.
    """
    q = query.strip().lower()
    # Canonical expansions for common prefixes (completed words for scraper)
    prefix_expansions: dict[str, str] = {
        "bab": "babero", "baber": "babero",
        "guan": "guante", "guant": "guante",
        "masc": "mascarilla", "masca": "mascarilla",
        "impl": "implante", "impla": "implante",
        "brac": "bracket", "brack": "bracket",
        "comp": "composite", "compo": "composite",
        "anes": "anestesia", "anest": "anestesia",
        "turb": "turbina",
        "eyer": "eyector", "eyec": "eyector",
        "esca": "escaler",
        "blan": "blanqueamiento", "blanq": "blanqueamiento",
    }
    expanded = prefix_expansions.get(q, q)
    terms = [
        f"{expanded} dental desechable",
        f"{expanded} clínica odontología",
        f"{expanded} uso clínico profesional",
    ]
    return terms[:3]


def _heuristic_related_terms(query: str) -> list[str]:
    """Minimal related terms from common dental synonyms.

    Matching strategy (in order):
    1. Exact substring: key is part of the query (e.g. "babero" in "baberos dentales")
    2. Prefix: query is a prefix of the key (e.g. "baber" is prefix of "babero")
       — handles partial/truncated user input
    3. Any query token matches key as substring or prefix
    """
    synonym_map: dict[str, list[str]] = {
        "babero": ["servilleta dental", "protector paciente", "bib dental", "babero"],
        "servilleta": ["babero dental", "protector paciente", "bib dental"],
        "bib": ["babero dental", "servilleta dental", "protector paciente"],
        "guante": ["nitrilo", "látex", "vinilo", "guantes desechables"],
        "mascarilla": ["FFP2", "quirúrgica", "protección respiratoria", "mascarilla dental"],
        "implante": ["titanio", "tornillo dental", "fixture", "implantología"],
        "bracket": ["bráket", "ortodoncia fija", "autoligado", "brackets metálicos"],
        "composite": ["resina", "obturación", "restauración", "composite dental"],
        "resina": ["composite", "obturación estética", "resina compuesta"],
        "anestesia": ["cartucho", "mepivacaína", "articaína", "lidocaína"],
        "turbina": ["pieza de mano", "alta velocidad", "handpiece", "turbina dental"],
        "jeringa": ["carpule", "aspiradora", "irrigación", "jeringa dental"],
        "fresa": ["bur", "diamante", "carburo", "fresa dental"],
        "eyector": ["cánula aspiración", "salivador", "aspirador saliva"],
        "vaso": ["vasito desechable", "vaso plástico", "vaso papel"],
        "algodón": ["rollo algodón", "torunda", "pellet algodón"],
        "gasa": ["apósito", "compresas", "gasa estéril"],
        "sutura": ["hilo sutura", "seda", "sutura reabsorbible"],
        "bisturí": ["hoja bisturí", "escalpelo", "mango bisturí"],
        "espejo": ["espejo dental", "espejo bucal", "espejito"],
        "explorador": ["sonda", "explorador dental", "sonda periodontal"],
        "cánula": ["cánula aspiración", "eyector", "cánula metálica"],
        "escaler": ["ultrasonidos", "detartraje", "puntas scaler"],
        "lámpara": ["led dental", "lámpara fotopolimerización", "unidad led"],
        "compresor": ["compresor dental", "compresor silencioso", "compresor aire"],
        "autoclave": ["esterilización", "esterilizador", "ciclo esterilización"],
        "rayos": ["radiología", "rx dental", "sensor digital"],
        "sensor": ["sensor rx", "sensor digital dental", "radiografía digital"],
        "cbct": ["tomografía dental", "cone beam", "3d dental"],
        "ortopan": ["ortopantomografía", "panorámica dental", "rx panorámica"],
        "adhesivo": ["bonding", "adhesivo dental", "sistema adhesivo"],
        "cemento": ["cemento dental", "cementación", "cemento ionómero"],
        "ionómero": ["ionómero vidrio", "cemento vidrio ionómero", "ionómero"],
        "endodoncia": ["limas", "guta percha", "obturación conductos"],
        "lima": ["limas endodoncia", "limas rotatorias", "limas manuales"],
        "gutapercha": ["guta percha", "puntas gutapercha", "conos gutapercha"],
        "blanqueamiento": ["blanqueador dental", "peróxido", "whitening"],
        "ortodoncia": ["brackets", "alambres", "alineadores", "ortodoncia fija"],
        "alineador": ["invisalign", "clear aligner", "férula ortodoncia"],
        "prótesis": ["corona", "puente dental", "prótesis dental"],
        "corona": ["corona cerámica", "corona zirconio", "corona porcelana"],
        "zirconio": ["zirconia", "corona zirconio", "bloque cad cam"],
        "implantología": ["implante dental", "pilar implante", "cirugía implante"],
    }

    q = query.strip().lower()
    q_norm = _normalise(q)
    results: list[str] = []

    for key, syns in synonym_map.items():
        key_norm = _normalise(key)
        # 1. Exact or substring: key is contained in q ("babero" in "baberos dentales")
        if key_norm in q_norm:
            results = syns[:]
            break
        # 2. Prefix: q is a prefix of key ("baber" is prefix of "babero")
        if key_norm.startswith(q_norm) and len(q_norm) >= 3:
            # Also add the full canonical word so DB substring search finds it
            results = [key] + [s for s in syns if s != key]
            break

    if not results:
        # 3. Token-level matching: any query word matches a key
        for word in q_norm.split():
            if len(word) < 3:
                continue
            for key, syns in synonym_map.items():
                key_norm = _normalise(key)
                if key_norm.startswith(word) or word in key_norm:
                    results = [key] + [s for s in syns if s != key]
                    break
            if results:
                break

    return results


def _heuristic_category(query: str) -> str:
    """
    Map query keywords to a real DB category without AI.
    Correction #1: Only returns names from REAL_CATEGORIES.
    """
    q = query.strip().lower()
    real_cats = _get_real_categories()

    keyword_map: list[tuple[list[str], str]] = [
        (["implante", "pilar", "cirugía", "sutura", "hueso", "membrana"], "Implantología"),
        (["bracket", "aligner", "alineador", "arco", "retención", "ortodoncia"], "Ortodoncia"),
        (["software", "ia", "inteligencia artificial", "app", "digital", "crm"], "Software y Ciberseguridad"),
        (["seguro", "financi", "gestoría", "leasing", "renting"], "Gestoría y Seguros"),
        (["marketing", "seo", "redes", "web", "reputación"], "Gestión y marketing dental"),
        (["radiología", "cbct", "sensor", "rayos x", "rvg", "ortopantomografía"], "Radiología UTPR y Dosimetría"),
        (["laboratorio", "cad cam", "fresado", "prótesis", "articulador"], "Laboratorio"),
    ]

    for keywords, cat_name in keyword_map:
        if any(kw in q for kw in keywords):
            # Resolve to real DB name (handles accent differences)
            return _resolve_to_db_category(cat_name)

    # Default: consumables category
    return _resolve_to_db_category("Depósitos y Aparatología")


def _heuristic_providers(query: str) -> list[str]:
    """Return top general-purpose DQ providers as defaults."""
    real_provs = _get_active_provider_names()
    # Prioritise well-known deposit generalists
    priority = ["Henry Schein", "Proclinic", "Axis Dental", "Infomed", "DVD Dental"]
    result = [p for p in priority if p in real_provs]
    # Pad with others if needed
    if len(result) < 3:
        result += [p for p in real_provs if p not in result][: 3 - len(result)]
    return result[:3]


def _get_active_provider_names() -> list[str]:
    """Fetch active provider names from DB."""
    try:
        from compras.models import Proveedor
        return list(
            Proveedor.objects.filter(activo=True).values_list("nombre", flat=True).order_by("nombre")
        )
    except Exception:
        return ["Henry Schein", "Proclinic", "Axis Dental"]


def _filter_real_providers(ai_suggestions: list[str], real_provs: list[str]) -> list[str]:
    """
    Filter AI-suggested provider names to only those that actually exist in DQ.
    Uses normalised fuzzy matching.
    """
    norm_real = {_normalise(p): p for p in real_provs}
    result = []
    for suggestion in ai_suggestions:
        ns = _normalise(suggestion)
        # Exact match
        if ns in norm_real:
            result.append(norm_real[ns])
            continue
        # Substring match
        for norm_key, real_name in norm_real.items():
            if ns in norm_key or norm_key in ns:
                result.append(real_name)
                break
    # Deduplicate preserving order
    seen: set[str] = set()
    deduped = []
    for p in result:
        if p not in seen:
            seen.add(p)
            deduped.append(p)
    return deduped
