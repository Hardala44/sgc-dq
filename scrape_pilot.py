#!/usr/bin/env python3
"""
scrape_pilot.py — DentalQuality Marketplace Pilot Scraper
==========================================================

Simulates what n8n will do in production:
  1. Scrapes a product listing page from a dental supplier
  2. Extracts relevant fields (name, price, SKU, URL, image)
  3. Normalises the data into the DQ ingestion payload format
  4. POSTs the batch to /api/compras/ingesta-productos/

Target for pilot: Henry Schein ES catalogue (gloves category)
  URL: https://www.henryschein.es/es-es/dental/c/guantes

Usage:
    pip install requests beautifulsoup4 lxml
    python scrape_pilot.py

    # Dry-run (scrape only, no API call):
    python scrape_pilot.py --dry-run

    # Override API endpoint for local dev:
    python scrape_pilot.py --api-url http://127.0.0.1:8000/api/compras/ingesta-productos/

Environment variables:
    DQ_API_KEY   - overrides the hardcoded dev key
    DQ_API_URL   - overrides the default API endpoint
"""

import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass, asdict
from typing import Optional

import requests
from bs4 import BeautifulSoup

# ─── Configuration ──────────────────────────────────────────────────────────

DEFAULT_API_URL = os.environ.get(
    'DQ_API_URL',
    'http://127.0.0.1:8000/api/compras/ingesta-productos/'
)
API_KEY = os.environ.get(
    'DQ_API_KEY',
    'dq-ingesta-dev-key-change-me-in-production'
)

# Supplier mappings (add your real supplier page URLs here)
SUPPLIERS = [
    {
        'proveedor_nombre': 'Henry Schein',
        'categoria_name': 'Laboratorio',
        'scrape_url': 'https://www.henryschein.es/es-es/dental/c/guantes',
        'scraper_fn': 'scrape_henry_schein',
    },
    # Add more suppliers/categories here:
    # {
    #     'proveedor_nombre': 'Proclinic',
    #     'categoria_name': 'Laboratorio',
    #     'scrape_url': 'https://www.proclinic-products.com/es/...',
    #     'scraper_fn': 'scrape_proclinic',
    # },
]

USER_AGENT = (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    'AppleWebKit/537.36 (KHTML, like Gecko) '
    'Chrome/124.0.0.0 Safari/537.36'
)
REQUEST_DELAY_SECONDS = 1.5   # Be respectful to target servers

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s | %(message)s',
    datefmt='%H:%M:%S',
)
log = logging.getLogger('scrape_pilot')


# ─── Data Model ──────────────────────────────────────────────────────────────

@dataclass
class ScrapedProduct:
    nombre: str
    marca: str
    sku: str
    precio: str            # Decimal string e.g. "5.20"
    url_compra: str
    imagen_url: str
    descripcion: str
    proveedor_nombre: str
    categoria_name: str
    stock_status: str = 'unknown'


# ─── Scrapers ──────────────────────────────────────────────────────────────────

def fetch_page(url: str) -> Optional[BeautifulSoup]:
    """Fetches a URL and returns a BeautifulSoup object, or None on error."""
    try:
        log.info('Fetching: %s', url)
        resp = requests.get(
            url,
            headers={'User-Agent': USER_AGENT, 'Accept-Language': 'es-ES,es;q=0.9'},
            timeout=15,
        )
        resp.raise_for_status()
        return BeautifulSoup(resp.text, 'lxml')
    except requests.RequestException as e:
        log.error('Failed to fetch %s: %s', url, e)
        return None


def clean_price(raw: str) -> str:
    """Extracts a decimal price string from messy text like '  5,99 EUR  '."""
    if not raw:
        return '0.00'
    # Remove currency symbols and whitespace
    cleaned = re.sub(r'[^\d.,]', '', raw.strip())
    # European decimal: replace comma with dot (but only the last one)
    # e.g. "1.234,56" -> "1234.56"
    if ',' in cleaned and '.' in cleaned:
        cleaned = cleaned.replace('.', '').replace(',', '.')
    elif ',' in cleaned:
        cleaned = cleaned.replace(',', '.')
    try:
        return f'{float(cleaned):.2f}'
    except ValueError:
        return '0.00'


def generate_sku(proveedor: str, nombre: str, idx: int) -> str:
    """Generates a deterministic SKU from supplier + product name."""
    prefix = ''.join(c for c in proveedor.upper()[:3] if c.isalpha())
    slug = re.sub(r'[^A-Z0-9]', '-', nombre.upper()[:30]).strip('-')
    return f'{prefix}-{slug}-{idx:04d}'


def scrape_henry_schein(config: dict) -> list[ScrapedProduct]:
    """
    Scrapes the Henry Schein ES gloves catalogue page.
    This is a BEST-EFFORT scraper — real pages change frequently.
    If CSS selectors fail, falls back to demo stub data.
    """
    soup = fetch_page(config['scrape_url'])
    products = []

    if soup:
        # Henry Schein ES uses product cards with class 'product-item'
        # NOTE: Real selectors may change — inspect DevTools to confirm.
        cards = soup.select('.product-item, .product-tile, [data-product-id]')
        log.info('Found %d product cards on page.', len(cards))

        for idx, card in enumerate(cards[:20]):   # Limit to 20 per run
            try:
                # Name
                name_el = card.select_one('.product-name, .product-title, h2, h3')
                nombre = name_el.get_text(strip=True) if name_el else None
                if not nombre:
                    continue

                # Price
                price_el = card.select_one('.price, .product-price, [class*="price"]')
                precio = clean_price(price_el.get_text() if price_el else '')

                # Product URL
                link_el = card.select_one('a[href]')
                href = link_el['href'] if link_el else ''
                url_compra = href if href.startswith('http') else f'https://www.henryschein.es{href}'

                # Image
                img_el = card.select_one('img[src], img[data-src]')
                imagen_url = ''
                if img_el:
                    imagen_url = img_el.get('src') or img_el.get('data-src') or ''
                    if imagen_url and not imagen_url.startswith('http'):
                        imagen_url = f'https://www.henryschein.es{imagen_url}'

                # SKU (from data attribute or auto-generated)
                sku = (
                    card.get('data-product-id')
                    or card.get('data-sku')
                    or generate_sku('HS', nombre, idx)
                )

                # Marca — try to extract; default to 'Generico'
                marca_el = card.select_one('.brand, .manufacturer, [class*="brand"]')
                marca = marca_el.get_text(strip=True) if marca_el else 'Generico'

                products.append(ScrapedProduct(
                    nombre=nombre[:300],
                    marca=marca[:200],
                    sku=str(sku)[:200],
                    precio=precio,
                    url_compra=url_compra,
                    imagen_url=imagen_url,
                    descripcion='',
                    proveedor_nombre=config['proveedor_nombre'],
                    categoria_name=config['categoria_name'],
                    stock_status='unknown',
                ))

                time.sleep(0)   # No delay between cards (same page)

            except Exception as e:
                log.warning('Error parsing card %d: %s', idx, e)

    # If scraper got 0 results (page structure changed / JS-rendered), use stubs
    if not products:
        log.warning('No products scraped from live page. Using STUB data for demo.')
        products = _build_stub_products(config)

    log.info('Scraper collected %d products from %s.', len(products), config['proveedor_nombre'])
    return products


def _build_stub_products(config: dict) -> list[ScrapedProduct]:
    """
    Returns realistic stub data when the live scraper yields nothing.
    These products use plausible SKUs and image URLs from Unsplash.
    Useful for local dev & CI without hitting real supplier servers.
    """
    stubs = [
        ('Guante Nitrilo Azul Sin Polvo Caja 100u T.M', 'Medicaline', 'HS-GNT-NITm-BL-100', '5.20',
         'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&q=80&w=800'),
        ('Guante Nitrilo Negro Sin Polvo Caja 100u T.L', 'Aurelia', 'HS-GNT-NITl-BLK-100', '6.80',
         'https://images.unsplash.com/photo-1584362917165-526a968579e8?auto=format&fit=crop&q=80&w=800'),
        ('Guante Latex Natural Caja 100u T.M', 'Sempercare', 'HS-GNT-LAT-M-100', '4.50',
         'https://images.unsplash.com/photo-1606811841689-23dfddce3e95?auto=format&fit=crop&q=80&w=800'),
        ('Guante Vinilo Sin Polvo Caja 100u T.L', 'Safe Touch', 'HS-GNT-VIN-L-100', '3.90',
         'https://images.unsplash.com/photo-1628177142898-93e46e48d5f5?auto=format&fit=crop&q=80&w=800'),
        ('Mascarilla Quirurgica Tipo IIR Caja 50u', 'Hartmann', 'HS-MASK-IIR-50', '9.90',
         'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?auto=format&fit=crop&q=80&w=800'),
    ]
    return [
        ScrapedProduct(
            nombre=name, marca=marca, sku=sku, precio=price,
            url_compra=f'https://www.henryschein.es/search?q={sku}',
            imagen_url=img,
            descripcion='Producto de consumo general.',
            proveedor_nombre=config['proveedor_nombre'],
            categoria_name=config['categoria_name'],
            stock_status='in_stock',
        )
        for name, marca, sku, price, img in stubs
    ]


# ─── Dispatcher ──────────────────────────────────────────────────────────────

SCRAPER_REGISTRY = {
    'scrape_henry_schein': scrape_henry_schein,
    # 'scrape_proclinic': scrape_proclinic,  # Add more here as you build them
}

def run_all_scrapers() -> list[ScrapedProduct]:
    all_products = []
    for supplier_config in SUPPLIERS:
        fn_name = supplier_config.get('scraper_fn', '')
        scraper_fn = SCRAPER_REGISTRY.get(fn_name)
        if not scraper_fn:
            log.warning('No scraper registered for fn_name="%s". Skipping.', fn_name)
            continue
        products = scraper_fn(supplier_config)
        all_products.extend(products)
        time.sleep(REQUEST_DELAY_SECONDS)
    return all_products


# ─── API Submission ───────────────────────────────────────────────────────────

def submit_to_api(products: list[ScrapedProduct], api_url: str, api_key: str) -> dict:
    """Sends the scraped product batch to the DQ ingestion endpoint."""
    payload = [asdict(p) for p in products]

    log.info('Submitting %d products to %s ...', len(payload), api_url)

    try:
        resp = requests.post(
            api_url,
            json=payload,
            headers={
                'Content-Type': 'application/json',
                'X-Api-Key': api_key,
                'User-Agent': 'DQ-Pilot-Scraper/1.0',
            },
            timeout=30,
        )

        result = resp.json()
        if resp.status_code in (200, 207):
            log.info(
                'API response %s: created=%s updated=%s errors=%s',
                resp.status_code,
                result.get('created', '?'),
                result.get('updated', '?'),
                len(result.get('errors', [])),
            )
            if result.get('errors'):
                log.warning('Partial errors: %s', json.dumps(result['errors'], indent=2))
        else:
            log.error('API error %s: %s', resp.status_code, resp.text[:500])

        return result

    except requests.RequestException as e:
        log.error('Failed to submit to API: %s', e)
        return {'error': str(e)}


# ─── CLI Entry Point ──────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='DentalQuality Pilot Scraper')
    parser.add_argument('--dry-run', action='store_true',
                        help='Scrape only — do not submit to API. Prints payload instead.')
    parser.add_argument('--api-url', default=DEFAULT_API_URL,
                        help=f'API endpoint URL (default: {DEFAULT_API_URL})')
    parser.add_argument('--api-key', default=API_KEY,
                        help='API key for X-Api-Key header')
    parser.add_argument('--output', default=None,
                        help='Save payload JSON to a file (useful for debugging n8n)')
    args = parser.parse_args()

    log.info('=== DQ Pilot Scraper starting ===')
    products = run_all_scrapers()

    if not products:
        log.warning('No products collected. Nothing to submit.')
        sys.exit(0)

    payload = [asdict(p) for p in products]
    log.info('Total products collected: %d', len(payload))

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        log.info('Payload saved to %s', args.output)

    if args.dry_run:
        log.info('DRY RUN — printing payload (first 3 items):')
        print(json.dumps(payload[:3], ensure_ascii=False, indent=2))
        log.info('=== DRY RUN complete. No API call made. ===')
    else:
        result = submit_to_api(products, args.api_url, args.api_key)
        log.info('=== Pilot Scraper complete ===')
        print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
