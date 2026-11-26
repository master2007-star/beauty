#!/usr/bin/env python3
"""
Automated Live Retailer Price Scraper for PriceWise AI Beauty.

1. Reads product definitions and retailer URLs from frontend/src/data/products.ts.
2. Resolves search URLs to direct product page URLs (Tira, Purplle, Amazon India).
3. Scrapes live selling price, MRP, and stock status using curl_cffi (impersonate="chrome124")
   and beautifulsoup4 via:
   - Schema.org application/ld+json
   - Myntra embedded window.__myx JSON
   - Amazon India HTML selectors (span.a-price-whole, span.a-text-price span.a-offscreen, #availability)
4. Preserves previously saved valid prices from frontend/public/data/live-prices.json if a store
   blocks or fails.
5. Writes the updated snapshot to frontend/public/data/live-prices.json.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from bs4 import BeautifulSoup

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("scrape_live_prices")

# Paths relative to repository root
REPO_ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_FILE = REPO_ROOT / "frontend" / "src" / "data" / "products.ts"
SNAPSHOT_FILE = REPO_ROOT / "frontend" / "public" / "data" / "live-prices.json"

# Import curl_cffi with graceful requests fallback
try:
    from curl_cffi import requests as cffi_requests
    HAS_CURL_CFFI = True
    logger.info("curl_cffi loaded successfully with Chrome impersonation support.")
except ImportError:
    import requests as cffi_requests  # type: ignore
    HAS_CURL_CFFI = False
    logger.warning("curl_cffi not available; falling back to standard requests.")


class ScraperClient:
    """HTTP Client wrapping curl_cffi with Chrome 124 impersonation and retry logic."""

    def __init__(self, timeout: int = 15):
        self.timeout = timeout
        if HAS_CURL_CFFI:
            self.session = cffi_requests.Session(impersonate="chrome124")
        else:
            self.session = cffi_requests.Session()
            self.session.headers.update({
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                ),
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            })

    def get(self, url: str, **kwargs) -> Optional[Any]:
        kwargs.setdefault("timeout", self.timeout)
        try:
            if HAS_CURL_CFFI:
                return self.session.get(url, impersonate="chrome124", **kwargs)
            return self.session.get(url, **kwargs)
        except Exception as e:
            logger.debug("Request failed for %s: %s", url, e)
            return None


def parse_numeric_price(val: Any) -> Optional[float]:
    """Parse numeric price safely from strings, ints, or floats."""
    if val is None:
        return None
    if isinstance(val, (int, float)):
        return round(float(val), 2)
    s = str(val).replace("\xa0", " ").strip()
    match = re.search(r"[\d,]+(?:\.\d+)?", s)
    if match:
        clean_num = match.group(0).replace(",", "")
        try:
            parsed = float(clean_num)
            return round(parsed, 2) if parsed > 0 else None
        except ValueError:
            return None
    return None


def extract_products_from_ts(file_path: Path) -> List[Dict[str, Any]]:
    """
    Parse frontend/src/data/products.ts to extract each product's id,
    name, brand, price, originalPrice, and storeOffers list.
    """
    if not file_path.exists():
        raise FileNotFoundError(f"products.ts not found at {file_path}")

    text = file_path.read_text(encoding="utf-8")
    products: List[Dict[str, Any]] = []

    # Split into product blocks matching '  {\n    id: 'prod-'
    chunks = text.split("\n  {\n    id: '")
    if len(chunks) <= 1:
        chunks = text.split('\n  {\n    id: "')

    for chunk in chunks[1:]:
        # Extract product ID
        id_match = re.match(r"^([a-zA-Z0-9_-]+)", chunk)
        if not id_match:
            continue
        prod_id = id_match.group(1)

        # Extract name & brand
        name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", chunk)
        brand_match = re.search(r"brand:\s*['\"]([^'\"]+)['\"]", chunk)
        price_match = re.search(r"price:\s*(\d+(?:\.\d+)?)", chunk)
        orig_match = re.search(r"originalPrice:\s*(\d+(?:\.\d+)?)", chunk)

        name = name_match.group(1) if name_match else prod_id
        brand = brand_match.group(1) if brand_match else ""
        baseline_price = float(price_match.group(1)) if price_match else None
        baseline_orig = float(orig_match.group(1)) if orig_match else None

        # Parse storeOffers array
        offers: List[Dict[str, Any]] = []
        so_match = re.search(r"storeOffers:\s*\[(.*?)\]\s*,?\n", chunk, re.DOTALL)
        if so_match:
            offers_block = so_match.group(1)
            offer_entries = re.findall(r"\{([^{}]+)\}", offers_block)
            for entry in offer_entries:
                sid_m = re.search(r"storeId:\s*['\"]([^'\"]+)['\"]", entry)
                url_m = re.search(r"purchaseUrl:\s*['\"]([^'\"]+)['\"]", entry)
                sname_m = re.search(r"storeName:\s*['\"]([^'\"]+)['\"]", entry)
                p_m = re.search(r"price:\s*(\d+(?:\.\d+)?)", entry)
                op_m = re.search(r"originalPrice:\s*(\d+(?:\.\d+)?)", entry)
                instock_m = re.search(r"inStock:\s*(true|false)", entry)

                if sid_m and url_m:
                    offers.append({
                        "storeId": sid_m.group(1),
                        "storeName": sname_m.group(1) if sname_m else sid_m.group(1).title(),
                        "purchaseUrl": url_m.group(1),
                        "price": float(p_m.group(1)) if p_m else None,
                        "originalPrice": float(op_m.group(1)) if op_m else None,
                        "inStock": instock_m.group(1) == "true" if instock_m else True,
                    })

        products.append({
            "id": prod_id,
            "name": name,
            "brand": brand,
            "price": baseline_price,
            "originalPrice": baseline_orig,
            "storeOffers": offers,
        })

    logger.info("Extracted %d products with %d total store offers from %s",
                len(products), sum(len(p["storeOffers"]) for p in products), file_path.name)
    return products


def is_search_url(url: str) -> bool:
    """Determine whether a given purchaseUrl is a search/catalog query."""
    return any(p in url for p in ["/search?", "/s?k=", "?q=", "/search/"])


def resolve_search_url(
    client: ScraperClient,
    store_id: str,
    search_url: str,
    product_name: str,
) -> Optional[str]:
    """
    Resolves search URLs (/search?, /s?k=, ?q=) to the first matching product page URL
    for Tira (tirabeauty.com), Purplle (purplle.com), and Amazon India (amazon.in).
    """
    resp = client.get(search_url)
    if not resp or resp.status_code != 200 or not resp.text:
        return None

    soup = BeautifulSoup(resp.text, "html.parser")

    # 1. Amazon India (amazon.in)
    if store_id == "amazon" or "amazon.in" in search_url:
        # Search cards
        selectors = [
            'div[data-component-type="s-search-result"] h2 a[href]',
            'a.a-link-normal.s-no-outline[href*="/dp/"]',
            'a[href*="/dp/"]',
        ]
        for sel in selectors:
            for link in soup.select(sel):
                href = link.get("href", "")
                if "/dp/" in href:
                    dp_match = re.search(r"(/dp/[A-Z0-9]{10})", href)
                    if dp_match:
                        return f"https://www.amazon.in{dp_match.group(1)}"
                    return urllib.parse.urljoin("https://www.amazon.in", href)

    # 2. Tira (tirabeauty.com)
    elif store_id == "tira" or "tirabeauty.com" in search_url:
        # Product cards on Tira
        for link in soup.select('a[href*="/product/"], a[href*="/p/"]'):
            href = link.get("href", "")
            if href and not href.startswith("#"):
                return urllib.parse.urljoin("https://www.tirabeauty.com", href)
        # Regex search inside HTML
        match = re.search(r'href=["\'](/product/[^"\']+)["\']', resp.text)
        if match:
            return urllib.parse.urljoin("https://www.tirabeauty.com", match.group(1))

    # 3. Purplle (purplle.com)
    elif store_id == "purplle" or "purplle.com" in search_url:
        for link in soup.select('a[href*="/product/"], a[href*="/p/"], a[href*="/pr/"]'):
            href = link.get("href", "")
            if href and not href.startswith("#"):
                return urllib.parse.urljoin("https://www.purplle.com", href)
        # Regex search inside HTML
        match = re.search(r'href=["\'](/(?:product|p|pr)/[^"\']+)["\']', resp.text)
        if match:
            return urllib.parse.urljoin("https://www.purplle.com", match.group(1))

    return None


def extract_schema_org_jsonld(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """
    Extract selling price, MRP/originalPrice, and stock status
    from Schema.org application/ld+json tags.
    """
    scripts = soup.find_all("script", type="application/ld+json")
    for script in scripts:
        if not script.string:
            continue
        try:
            data = json.loads(script.string)
        except Exception:
            continue

        candidates = []
        if isinstance(data, dict):
            if "@graph" in data and isinstance(data["@graph"], list):
                candidates.extend(data["@graph"])
            else:
                candidates.append(data)
        elif isinstance(data, list):
            candidates.extend(data)

        for item in candidates:
            if not isinstance(item, dict):
                continue
            itype = item.get("@type", "")
            types = itype if isinstance(itype, list) else [itype]
            if any(t in ["Product", "IndividualProduct"] for t in types):
                offers = item.get("offers")
                if not offers:
                    continue

                offer_list = (
                    offers if isinstance(offers, list)
                    else offers.get("offers", [offers]) if isinstance(offers, dict) and offers.get("@type") == "AggregateOffer"
                    else [offers] if isinstance(offers, dict)
                    else []
                )

                for off in offer_list:
                    if not isinstance(off, dict):
                        continue
                    price = parse_numeric_price(off.get("price") or off.get("lowPrice"))
                    orig_price = parse_numeric_price(
                        off.get("highPrice")
                        or off.get("originalPrice")
                        or (off.get("priceSpecification", {}).get("price") if isinstance(off.get("priceSpecification"), dict) else None)
                    )
                    avail = str(off.get("availability", "")).lower()

                    in_stock = True
                    stock_status = "In Stock"
                    if "outofstock" in avail or "discontinued" in avail:
                        in_stock = False
                        stock_status = "Out of Stock"
                    elif "instock" in avail:
                        in_stock = True
                        stock_status = "In Stock"

                    if price and price > 0:
                        return {
                            "price": price,
                            "originalPrice": orig_price if (orig_price and orig_price >= price) else None,
                            "inStock": in_stock,
                            "stockStatus": stock_status,
                        }
    return None


def extract_myntra_myx(html: str) -> Optional[Dict[str, Any]]:
    """
    Extract live price and stock status from Myntra's embedded window.__myx JSON.
    """
    idx = html.find("window.__myx = ")
    if idx == -1:
        match = re.search(r"window\.__myx\s*=\s*(\{.*?\});\s*(?:</script>|window\.)", html, re.DOTALL)
        if not match:
            return None
        json_str = match.group(1)
    else:
        end = html.find("</script>", idx)
        if end == -1:
            end = len(html)
        json_str = html[idx + len("window.__myx = "):end].strip().rstrip(";")

    try:
        data = json.loads(json_str)
    except Exception:
        return None

    # 1. Product Detail Page (pdpData)
    if "pdpData" in data and isinstance(data["pdpData"], dict):
        pdp = data["pdpData"]
        p_info = pdp.get("price", {})
        discounted = parse_numeric_price(p_info.get("discounted") or p_info.get("price"))
        mrp = parse_numeric_price(p_info.get("mrp"))

        sizes = pdp.get("sizes", [])
        in_stock = any(s.get("available") for s in sizes) if sizes else bool(pdp.get("inStock", True))
        stock_status = "In Stock" if in_stock else "Out of Stock"

        if discounted and discounted > 0:
            return {
                "price": discounted,
                "originalPrice": mrp if (mrp and mrp >= discounted) else None,
                "inStock": in_stock,
                "stockStatus": stock_status,
            }

    # 2. Search / List Page (searchData)
    if "searchData" in data and isinstance(data["searchData"], dict):
        results = data["searchData"].get("results", {})
        prods = results.get("products", [])
        if prods and isinstance(prods, list):
            first = prods[0]
            price = parse_numeric_price(first.get("price"))
            mrp = parse_numeric_price(first.get("mrp"))
            inv = first.get("inventoryInfo", [])
            in_stock = any(i.get("available") for i in inv) if inv else not first.get("outOfStock", False)
            stock_status = "In Stock" if in_stock else "Out of Stock"

            if price and price > 0:
                return {
                    "price": price,
                    "originalPrice": mrp if (mrp and mrp >= price) else None,
                    "inStock": bool(in_stock),
                    "stockStatus": stock_status,
                }

    return None


def extract_amazon_html(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """
    Extract live price and stock status using Amazon India HTML price selectors:
    - span.a-price-whole
    - span.a-text-price span.a-offscreen
    - #availability
    """
    price: Optional[float] = None
    orig_price: Optional[float] = None
    in_stock = True
    stock_status = "In Stock"

    # Selling Price: span.a-price-whole
    whole = soup.select_one("span.a-price-whole")
    if whole:
        price = parse_numeric_price(whole.get_text(strip=True).rstrip("."))

    if not price:
        offscreen = soup.select_one("span.a-price span.a-offscreen")
        if offscreen:
            price = parse_numeric_price(offscreen.get_text(strip=True))

    # MRP / Original Price: span.a-text-price span.a-offscreen
    orig_elem = soup.select_one("span.a-text-price span.a-offscreen, span.basisPrice span.a-offscreen")
    if orig_elem:
        orig_price = parse_numeric_price(orig_elem.get_text(strip=True))

    # Stock Status: #availability
    avail_elem = soup.select_one("#availability")
    if avail_elem:
        avail_text = avail_elem.get_text(strip=True).lower()
        if any(w in avail_text for w in ["currently unavailable", "out of stock", "cannot be delivered"]):
            in_stock = False
            stock_status = "Out of Stock"
        elif any(w in avail_text for w in ["in stock", "left in stock"]):
            in_stock = True
            stock_status = "In Stock"

    if price and price > 0:
        return {
            "price": price,
            "originalPrice": orig_price if (orig_price and orig_price >= price) else None,
            "inStock": in_stock,
            "stockStatus": stock_status,
        }
    return None


def scrape_offer_live(
    client: ScraperClient,
    store_id: str,
    target_url: str,
) -> Optional[Dict[str, Any]]:
    """Dispatch scraping logic for an offer URL across supported retailers."""
    resp = client.get(target_url)
    if not resp or resp.status_code != 200 or not resp.text:
        return None

    html = resp.text
    soup = BeautifulSoup(html, "html.parser")

    # 1. Myntra window.__myx
    if store_id == "myntra" or "myntra.com" in target_url:
        data = extract_myntra_myx(html)
        if data:
            return data

    # 2. Amazon HTML Selectors
    if store_id == "amazon" or "amazon.in" in target_url:
        data = extract_amazon_html(soup)
        if data:
            return data

    # 3. Schema.org application/ld+json (Universal)
    data = extract_schema_org_jsonld(soup)
    if data:
        return data

    return None


def load_previous_snapshot(snapshot_path: Path) -> Dict[str, Any]:
    """Load previously saved live-prices.json snapshot to preserve valid prices."""
    if snapshot_path.exists():
        try:
            with open(snapshot_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("Could not read previous snapshot: %s", e)
    return {}


def main() -> None:
    logger.info("=== Starting PriceWise AI Automated Live Price Scraper ===")

    # 1. Extract products and offers from products.ts
    products = extract_products_from_ts(PRODUCTS_FILE)

    # 2. Load existing snapshot for preservation
    prev_snapshot = load_previous_snapshot(SNAPSHOT_FILE)
    prev_products = prev_snapshot.get("products", {})

    client = ScraperClient(timeout=15)
    total_offers = sum(len(p["storeOffers"]) for p in products)
    scraped_success_count = 0
    preserved_count = 0
    fallback_count = 0

    results: Dict[str, Any] = {}
    now_utc = datetime.now(timezone.utc)
    updated_at_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    updated_label = now_utc.strftime("%d %b %Y, %H:%M UTC")

    for p_idx, prod in enumerate(products, start=1):
        pid = prod["id"]
        pname = prod["name"]
        prod_offers_map: Dict[str, Any] = {}
        prod_offers_list: List[Dict[str, Any]] = []

        logger.info("[%d/%d] Processing %s (%s)", p_idx, len(products), pid, pname)

        for offer in prod["storeOffers"]:
            store_id = offer["storeId"]
            store_name = offer.get("storeName", store_id.title())
            purchase_url = offer["purchaseUrl"]
            target_url = purchase_url
            resolved_url: Optional[str] = None

            # Look up previous valid price from snapshot if available
            prev_prod_data = prev_products.get(pid, {})
            prev_offer_data = prev_prod_data.get(store_id) or next(
                (o for o in prev_prod_data.get("offers", []) if o.get("storeId") == store_id),
                None
            )

            # Step 1: Resolve Search URLs if needed
            if is_search_url(purchase_url):
                logger.info("  Resolving search URL for %s: %s", store_id, purchase_url[:70])
                resolved = resolve_search_url(client, store_id, purchase_url, pname)
                if resolved:
                    resolved_url = resolved
                    target_url = resolved
                    logger.info("  Resolved to product URL: %s", resolved[:80])
                else:
                    logger.info("  Search resolution returned no product link; scraping search URL directly.")

            # Step 2: Scrape live price & stock status
            scraped = scrape_offer_live(client, store_id, target_url)

            if scraped and scraped.get("price") and scraped["price"] > 0:
                scraped_success_count += 1
                final_offer = {
                    "storeId": store_id,
                    "storeName": store_name,
                    "price": scraped["price"],
                    "originalPrice": scraped.get("originalPrice"),
                    "inStock": scraped.get("inStock", True),
                    "stockStatus": scraped.get("stockStatus", "In Stock"),
                    "purchaseUrl": purchase_url,
                    "resolvedUrl": resolved_url or (target_url if target_url != purchase_url else None),
                    "sourceType": "verified_live",
                    "lastChecked": updated_at_iso,
                    "status": "success",
                }
                logger.info("  ✓ [%s] Live: ₹%s (MRP: ₹%s) | %s",
                            store_id, final_offer["price"], final_offer["originalPrice"], final_offer["stockStatus"])

            elif prev_offer_data and prev_offer_data.get("price") and prev_offer_data["price"] > 0:
                # Step 3: Preserve previously saved valid price
                preserved_count += 1
                final_offer = dict(prev_offer_data)
                final_offer["sourceType"] = "cached"
                final_offer["status"] = "preserved"
                final_offer["preservedFrom"] = prev_offer_data.get("lastChecked", "previous_snapshot")
                logger.info("  ⟳ [%s] Preserved cached: ₹%s (MRP: ₹%s)",
                            store_id, final_offer["price"], final_offer.get("originalPrice"))

            else:
                # Step 4: Baseline fallback from products.ts catalogue
                fallback_count += 1
                final_offer = {
                    "storeId": store_id,
                    "storeName": store_name,
                    "price": offer.get("price") or prod.get("price"),
                    "originalPrice": offer.get("originalPrice") or prod.get("originalPrice"),
                    "inStock": offer.get("inStock", True),
                    "stockStatus": "In Stock" if offer.get("inStock", True) else "Out of Stock",
                    "purchaseUrl": purchase_url,
                    "resolvedUrl": resolved_url,
                    "sourceType": "demo",
                    "status": "baseline_fallback",
                    "lastChecked": updated_at_iso,
                }
                logger.info("  ⚠ [%s] Baseline fallback: ₹%s", store_id, final_offer["price"])

            prod_offers_map[store_id] = final_offer
            prod_offers_list.append(final_offer)

            # Polite delay between store requests
            time.sleep(0.3)

        results[pid] = {
            "productId": pid,
            "productName": pname,
            "brand": prod["brand"],
            "offers": prod_offers_list,
            **prod_offers_map,
        }

    # Prepare final JSON snapshot
    snapshot_output = {
        "updatedAt": updated_at_iso,
        "updatedLabel": updated_label,
        "totalProducts": len(products),
        "totalOffers": total_offers,
        "scrapedSuccessCount": scraped_success_count,
        "preservedCount": preserved_count,
        "fallbackCount": fallback_count,
        "products": results,
    }

    # Ensure destination directory exists and write atomically
    SNAPSHOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_file = SNAPSHOT_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(snapshot_output, f, indent=2, ensure_ascii=False)
    temp_file.replace(SNAPSHOT_FILE)

    logger.info("Snapshot written successfully to %s", SNAPSHOT_FILE)
    logger.info("Summary: %d total offers | %d live scraped | %d preserved from cache | %d baseline fallback",
                total_offers, scraped_success_count, preserved_count, fallback_count)
    logger.info("=== Live Price Scraper Completed ===")


if __name__ == "__main__":
    main()
