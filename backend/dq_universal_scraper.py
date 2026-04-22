#!/usr/bin/env python3
"""
dq_universal_scraper.py
=======================
Universal Scraper: fetches supplier catalog HTML and uses Google Gemini
to semantically extract 'linea_producto', 'marca', and 'url_compra_especifica'.
Then POSTs normalized products to the DQ ingestion API.

Usage:
  python3 dq_universal_scraper.py --target henry-schein --targets-file /app/backend/marketplace_targets.json
"""

import os
import sys
import json
import argparse
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai

# ── Config from environment vars ─────────────────────────────────────────────
API_URL  = os.environ.get('DQ_API_URL',  'http://host.docker.internal:8000/api/ingesta-productos/')
API_KEY  = os.environ.get('DQ_API_KEY',  'dq-ingesta-dev-key-change-me-in-production')
GEMINI_KEY = os.environ.get('GEMINI_API_KEY', '')

# ── Suppress FutureWarning spam ───────────────────────────────────────────────
import warnings
warnings.filterwarnings("ignore", category=FutureWarning)


def load_targets(filepath: str):
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_prompt(html_chunk: str, provider_name: str, base_url: str, categoria: str) -> str:
    return f"""You are an expert dental supply data extractor.
I will give you HTML extracted from a dental supplier's catalog page ({provider_name}, category: {categoria}).

Your task: Extract ALL products found and normalize each to a "Master Line".
- "linea_producto": Normalized master name (e.g. "Guantes de Nitrilo" — NOT "Guantes Nitrilo Azul Talla M")
- "marca": Brand name (empty string if not found)
- "url_compra_especifica": Direct product URL. If relative, prepend {base_url}

Rules:
- Group variants into a single master line
- Return ONLY a raw JSON array — NO markdown, NO extra text
- Minimum 5 products, maximum 25 products

HTML to parse:
{html_chunk}"""


def submit_to_api(payload: list, provider_name: str):
    try:
        resp = requests.post(
            API_URL,
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'X-Api-Key': API_KEY,
                'User-Agent': 'DQ-Universal-Scraper/2.0',
            },
            timeout=15,
        )
        if resp.status_code in (200, 207):
            result = resp.json()
            print(f"[OK] API response for {provider_name}: created={result.get('created', 0)}, updated={result.get('updated', 0)}, errors={len(result.get('errors', []))}")
        else:
            print(f"[ERROR] API returned {resp.status_code}: {resp.text[:300]}")
    except Exception as e:
        print(f"[ERROR] Connection to DQ API failed: {e}")


def run_scraper(target_id: str, targets_file: str):
    targets = load_targets(targets_file)
    target = next((t for t in targets if t['id'] == target_id), None)

    if not target:
        print(f"[ERROR] Target '{target_id}' not found in {targets_file}")
        sys.exit(1)

    name       = target['name']
    base_url   = target['base_url']
    scrape_url = target['scrape_url']
    categoria  = target.get('categoria', 'Laboratorio')
    selector   = target.get('selectors', {}).get('product_item', 'a')

    print(f"[START] {name} | {categoria} | {scrape_url}")

    # ── 1. Fetch HTML ─────────────────────────────────────────────────────────
    try:
        resp = requests.get(
            scrape_url,
            headers={'User-Agent': 'Mozilla/5.0 (compatible; DQ-Scraper/2.0)'},
            timeout=20,
            allow_redirects=True,
        )
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'lxml')
        print(f"[FETCH] {len(resp.text)} bytes retrieved from {name}")
    except Exception as e:
        print(f"[ERROR] Fetch failed for {scrape_url}: {e}")
        sys.exit(1)

    # ── 2. Extract relevant DOM chunk ─────────────────────────────────────────
    items = soup.select(selector)
    if not items:
        print(f"[WARN] Selector '{selector}' found 0 items. Trying fallback: a[href]")
        items = soup.select('a[href]')

    items = items[:30]
    html_chunk = "\n".join(str(i) for i in items[:20])

    if not html_chunk.strip():
        # Last resort: grab body text to let Gemini figure it out
        html_chunk = soup.get_text(separator='\n', strip=True)[:6000]

    if not html_chunk.strip():
        print(f"[ERROR] Could not extract any content from {scrape_url}")
        sys.exit(1)

    print(f"[PARSE] {len(items)} DOM items extracted, sending {len(html_chunk)} chars to Gemini")

    # ── 3. Gemini Extraction ──────────────────────────────────────────────────
    if not GEMINI_KEY:
        print("[ERROR] GEMINI_API_KEY environment variable is not set.")
        sys.exit(1)

    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel('models/gemini-flash-lite-latest')
    prompt = build_prompt(html_chunk, name, base_url, categoria)

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        # Strip markdown code fences if AI adds them despite instructions
        if text.startswith('```'):
            text = text.split('\n', 1)[1] if '\n' in text else text[3:]
        if text.endswith('```'):
            text = text[:-3]
        text = text.strip()

        data = json.loads(text)
        print(f"[GEMINI] Extracted {len(data)} normalized products from {name}")
    except json.JSONDecodeError as e:
        print(f"[ERROR] Gemini returned invalid JSON for {name}: {e}")
        print(f"[DEBUG] Raw Gemini response: {response.text[:500]}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Gemini call failed for {name}: {e}")
        sys.exit(1)

    # ── 4. Build and submit payload ───────────────────────────────────────────
    payload = []
    for item in data:
        linea = (item.get('linea_producto') or '').strip()
        if not linea or len(linea) < 3:
            continue
        url = item.get('url_compra_especifica') or base_url
        if url and not url.startswith('http'):
            url = base_url.rstrip('/') + '/' + url.lstrip('/')

        print(f"  [PRODUCTO] {item.get('marca', '')} - {linea}")
        payload.append({
            "linea_producto":        linea,
            "marca":                 (item.get('marca') or '').strip(),
            "categoria_name":        categoria,
            "proveedor_nombre":      name,
            "url_compra_especifica": url,
        })

    if not payload:
        print(f"[WARN] Payload empty after filtering for {name}. No products submitted.")
        sys.exit(0)

    print(f"[SUBMIT] Sending {len(payload)} products to API...")
    submit_to_api(payload, name)
    print(f"[DONE] {name} processed successfully.")


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='DQ Universal Dental Supplier Scraper')
    parser.add_argument('--target',       required=True, help='Supplier ID from marketplace_targets.json')
    parser.add_argument('--targets-file', default='/app/backend/marketplace_targets.json', help='Path to targets JSON file')
    args = parser.parse_args()
    run_scraper(args.target, args.targets_file)
