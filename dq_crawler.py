#!/usr/bin/env python3
"""
dq_crawler.py
=============
Production-grade multi-supplier crawler for DentalQuality.
Handles price cleaning, anti-blocking, and noise filtering.
"""

import json
import logging
import random
import re
import time
import argparse
import sys
import requests
from bs4 import BeautifulSoup
from dataclasses import dataclass, asdict

# --- Configuration ---
USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
]

NOISE_KEYWORDS = ["TOTAL", "TTOAL", "SUMA", "GENERAL"]

logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s | %(message)s',
    datefmt='%H:%M:%S',
)
log = logging.getLogger('dq_crawler')


@dataclass
class Product:
    nombre: str
    marca: str
    sku: str
    precio: str
    url_compra: str
    imagen_url: str
    proveedor_nombre: str
    categoria_name: str
    stock_status: str = 'unknown'


def clean_price(raw: str) -> str:
    """
    Handles European formats ("5,20 EUR", "1.200,50€", etc.)
    Returns a clean "1200.50" string.
    """
    if not raw:
        return "0.00"
    
    # Remove currency symbols and spaces
    cleaned = re.sub(r'[^\d.,]', '', raw.strip())
    
    # European format: 1.234,56
    if '.' in cleaned and ',' in cleaned:
        # Check if dot is thousands separator
        if cleaned.find('.') < cleaned.find(','):
            cleaned = cleaned.replace('.', '').replace(',', '.')
    elif ',' in cleaned:
        cleaned = cleaned.replace(',', '.')
        
    try:
        # Return as two-decimal string
        return f"{float(cleaned):.2f}"
    except (ValueError, TypeError):
        return "0.00"


def generate_sku(proveedor_id: str, nombre: str, index: int) -> str:
    """
    Provides a stable, deterministic SKU if the scraper fails to find one.
    """
    prefix = proveedor_id.upper()[:3]
    # Clean name for slug
    safe_name = re.sub(r'[^A-Za-z0-9]', '', nombre).upper()[:20]
    return f"DQ-{prefix}-{safe_name}-{index:04d}"


def is_noise(text: str) -> bool:
    """Checks if the text contains any noise keywords."""
    if not text:
        return True
    upper_text = text.upper()
    for kw in NOISE_KEYWORDS:
        if kw in upper_text:
            return True
    return False


def scrape_site(target: dict, max_products=20):
    products = []
    headers = {
        'User-Agent': random.choice(USER_AGENTS),
        'Accept-Language': 'es-ES,es;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    }

    try:
        log.info(f"Targeting: {target['name']} -> {target['scrape_url']}")
        response = requests.get(target['scrape_url'], headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')

        selectors = target['selectors']
        items = soup.select(selectors['product_item'])
        log.info(f"Found {len(items)} items.")

        for i, item in enumerate(items[:max_products]):
            try:
                # Name
                name_el = item.select_one(selectors['name'])
                nombre = name_el.get_text(strip=True) if name_el else None
                
                if not nombre or is_noise(nombre):
                    continue

                # Price
                price_el = item.select_one(selectors['price'])
                precio = clean_price(price_el.get_text() if price_el else "")

                # SKU
                sku = None
                sku_selector = selectors.get('sku')
                if sku_selector:
                    # Check attributes first
                    sku_el = item.select_one(sku_selector)
                    if sku_el:
                        # Try common attributes
                        for attr in ['data-product-id', 'data-sku', 'data-ref']:
                            if sku_el.has_attr(attr):
                                sku = sku_el[attr]
                                break
                        if not sku:
                            sku = sku_el.get_text(strip=True)
                
                if not sku:
                    sku = generate_sku(target['id'], nombre, i)

                # Brand
                marca = "Generic"
                brand_el = item.select_one(selectors.get('brand', ''))
                if brand_el:
                    marca = brand_el.get_text(strip=True)

                # URL
                url_compra = target['base_url']
                link_el = item.select_one(selectors.get('link', 'a'))
                if link_el and link_el.has_attr('href'):
                    href = link_el['href']
                    if href.startswith('http'):
                        url_compra = href
                    else:
                        url_compra = target['base_url'] + ('' if href.startswith('/') else '/') + href

                # Image
                img_url = ""
                img_el = item.select_one(selectors.get('image', 'img'))
                if img_el:
                    img_url = img_el.get('src') or img_el.get('data-src') or img_el.get('data-lazy') or ""
                    if img_url and not img_url.startswith('http'):
                        img_url = target['base_url'] + ('' if img_url.startswith('/') else '/') + img_url

                products.append(Product(
                    nombre=nombre,
                    marca=marca,
                    sku=sku,
                    precio=precio,
                    url_compra=url_compra,
                    imagen_url=img_url,
                    proveedor_nombre=target['name'],
                    categoria_name=target['categoria']
                ))

            except Exception as e:
                log.warning(f"Error parsing item {i}: {e}")

    except Exception as e:
        log.error(f"Failed to scrape {target['name']}: {e}")

    return products


def main():
    parser = argparse.ArgumentParser(description='DQ Marketplace Crawler')
    parser.add_argument('--targets', default='marketplace_targets.json', help='JSON file with targets')
    parser.add_argument('--dry-run', action='store_true', help='Scrape only, no API submission')
    parser.add_argument('--limit', type=int, default=10, help='Limit per site')
    parser.add_argument('--api-url', default='http://127.0.0.1:8000/api/ingesta-productos/', help='Ingestion URL')
    parser.add_argument('--api-key', default='dq-ingesta-dev-key-change-me-in-production', help='X-Api-Key')
    args = parser.parse_args()

    try:
        with open(args.targets, 'r', encoding='utf-8') as f:
            targets = json.load(f)
    except Exception as e:
        log.error(f"Failed to load targets: {e}")
        sys.exit(1)

    all_scraped = []
    
    for target in targets:
        log.info(f"--- Starting {target['name']} ---")
        scraped = scrape_site(target, max_products=args.limit)
        all_scraped.extend(scraped)
        
        # Anti-blocking delay
        log.info("Sleeping 5s...")
        time.sleep(5)

    if args.dry_run:
        log.info(f"DRY RUN: Scraped {len(all_scraped)} products.")
        for p in all_scraped[:5]:
            print(json.dumps(asdict(p), indent=2))
        return

    if not all_scraped:
        log.warning("No products scraped. Exiting.")
        return

    # Submit to API
    payload = [asdict(p) for p in all_scraped]
    log.info(f"Submitting {len(payload)} products to {args.api_url}...")
    
    try:
        resp = requests.post(
            args.api_url,
            json=payload,
            headers={'X-Api-Key': args.api_key},
            timeout=30
        )
        if resp.status_code in [200, 201, 207]:
            log.info(f"Success! Status: {resp.status_code}")
            log.info(resp.text)
        else:
            log.error(f"API Error {resp.status_code}: {resp.text}")
    except Exception as e:
        log.error(f"Submission failed: {e}")

if __name__ == "__main__":
    main()
