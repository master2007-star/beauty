#!/usr/bin/env python3
"""
Automated Live Retailer Price Scraper for PriceWise AI Beauty.

1. Reads product catalogue from frontend/src/data/products.ts.
2. Resolves search URLs and scrapes direct product pages with live prices for:
   - Nykaa: Product Details API (app-api/index.php/products/details?product_id=...) & Schema.org JSON-LD.
   - Purplle: Search resolution to organic product URLs & live prices via Schema.org / HTML selectors.
   - Tira: Catalog search API (ext/search/application/api/v1.0/products?q=...) for direct slugs & prices.
   - Amazon India: Chrome 124 TLS impersonation with en-IN locale, non-sponsored result extraction & /dp/<ASIN> resolution.
   - Myntra: Direct product URLs & embedded window.__myx pdpData / searchData extraction.
3. Formats updatedLabel in clean Indian Standard Time (IST).
4. Strictly marks sourceType='live' ONLY when a real numeric price was actually extracted from the retailer.
5. Preserves valid cached prices from frontend/public/data/live-prices.json if a retailer temporarily blocks.
6. Writes updated snapshot to frontend/public/data/live-prices.json and prints a per-store summary table.
"""

from __future__ import annotations

import json
import logging
import os
import re
import sys
import time
import urllib.parse
from datetime import datetime, timezone, timedelta
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

# IST timezone (UTC + 05:30)
IST = timezone(timedelta(hours=5, minutes=30))

# Import curl_cffi with graceful requests fallback
try:
    from curl_cffi import requests as cffi_requests
    HAS_CURL_CFFI = True
    logger.info("curl_cffi loaded with Chrome 124 TLS impersonation support.")
except ImportError:
    import requests as cffi_requests  # type: ignore
    HAS_CURL_CFFI = False
    logger.warning("curl_cffi unavailable; falling back to standard requests.")


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
                "Accept-Language": "en-IN,en;q=0.9",
            })

    def get(self, url: str, headers: Optional[Dict[str, str]] = None, **kwargs) -> Optional[Any]:
        kwargs.setdefault("timeout", self.timeout)
        req_headers = {"Accept-Language": "en-IN,en;q=0.9"}
        if headers:
            req_headers.update(headers)
        try:
            if HAS_CURL_CFFI:
                return self.session.get(url, headers=req_headers, impersonate="chrome124", **kwargs)
            return self.session.get(url, headers=req_headers, **kwargs)
        except Exception as e:
            logger.debug("Request failed for %s: %s", url[:80], e)
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


def format_ist_label(dt: datetime) -> str:
    """Format datetime in clean Indian Standard Time, e.g. 26 Nov 2026, 06:25 PM IST."""
    dt_ist = dt.astimezone(IST)
    return dt_ist.strftime("%d %b %Y, %I:%M %p IST")


def extract_products_from_ts(file_path: Path) -> List[Dict[str, Any]]:
    """Parse frontend/src/data/products.ts to extract products and storeOffers."""
    if not file_path.exists():
        raise FileNotFoundError(f"products.ts not found at {file_path}")

    text = file_path.read_text(encoding="utf-8")
    products: List[Dict[str, Any]] = []

    chunks = text.split("\n  {\n    id: '")
    if len(chunks) <= 1:
        chunks = text.split('\n  {\n    id: "')

    for chunk in chunks[1:]:
        id_match = re.match(r"^([a-zA-Z0-9_-]+)", chunk)
        if not id_match:
            continue
        prod_id = id_match.group(1)

        name_match = re.search(r"name:\s*['\"]([^'\"]+)['\"]", chunk)
        brand_match = re.search(r"brand:\s*['\"]([^'\"]+)['\"]", chunk)
        price_match = re.search(r"price:\s*(\d+(?:\.\d+)?)", chunk)
        orig_match = re.search(r"originalPrice:\s*(\d+(?:\.\d+)?)", chunk)

        name = name_match.group(1) if name_match else prod_id
        brand = brand_match.group(1) if brand_match else ""
        baseline_price = float(price_match.group(1)) if price_match else None
        baseline_orig = float(orig_match.group(1)) if orig_match else None

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
    """Check if URL is a search or catalog listing URL."""
    return any(p in url for p in ["/search?", "/s?k=", "?q=", "/search/"])


# ==============================================================================
# Retailer-Specific Scrapers & Resolvers
# ==============================================================================

def scrape_nykaa(
    client: ScraperClient,
    purchase_url: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Nykaa:
    1. If productId=<id> or /p/<id> is present, queries public product details API:
       https://www.nykaa.com/app-api/index.php/products/details?product_id=<id>
    2. Falls back to HTML Schema.org application/ld+json.
    """
    direct_url = purchase_url
    prod_id_match = re.search(r"productId=(\d+)", purchase_url) or re.search(r"/p/(\d+)", purchase_url)

    if prod_id_match:
        nykaa_id = prod_id_match.group(1)
        api_url = f"https://www.nykaa.com/app-api/index.php/products/details?product_id={nykaa_id}"
        api_headers = {
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
        }
        resp = client.get(api_url, headers=api_headers)
        if resp and resp.status_code == 200:
            try:
                data = resp.json()
                product_info = data.get("response", {}).get("product", {}) if isinstance(data.get("response"), dict) else {}
                if product_info:
                    price = parse_numeric_price(
                        product_info.get("offer_price")
                        or product_info.get("final_price")
                        or product_info.get("price")
                    )
                    mrp = parse_numeric_price(product_info.get("mrp") or product_info.get("price"))
                    in_stock = bool(product_info.get("in_stock", True))

                    if price and price > 0:
                        return {
                            "price": price,
                            "originalPrice": mrp if (mrp and mrp >= price) else None,
                            "inStock": in_stock,
                            "stockStatus": "In Stock" if in_stock else "Out of Stock",
                        }, direct_url
            except Exception:
                pass

    # HTML fallback
    resp = client.get(purchase_url)
    if resp and resp.status_code == 200 and resp.text:
        soup = BeautifulSoup(resp.text, "html.parser")
        ld_data = extract_schema_org_jsonld(soup)
        if ld_data and ld_data.get("price"):
            return ld_data, direct_url

    return None, direct_url


def scrape_tira(
    client: ScraperClient,
    purchase_url: str,
    product_name: str,
    brand: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Tira:
    1. For search URLs (tirabeauty.com/search?q=...), queries catalog search API:
       https://www.tirabeauty.com/ext/search/application/api/v1.0/products?q=...&page_size=5
       Extracts direct product slug (https://www.tirabeauty.com/product/<slug>),
       price.effective.min, and price.marked.min.
    2. Falls back to HTML scraping & Schema.org.
    """
    direct_url: Optional[str] = None
    query = ""
    parsed = urllib.parse.urlparse(purchase_url)
    qs = urllib.parse.parse_qs(parsed.query)
    if "q" in qs and qs["q"]:
        query = qs["q"][0]
    elif product_name:
        query = f"{brand} {product_name}".strip()

    if query:
        api_url = f"https://www.tirabeauty.com/ext/search/application/api/v1.0/products?q={urllib.parse.quote(query)}&page_size=5"
        api_headers = {
            "Accept": "application/json, text/plain, */*",
            "Origin": "https://www.tirabeauty.com",
            "Referer": purchase_url,
        }
        resp = client.get(api_url, headers=api_headers)
        if resp and resp.status_code == 200:
            try:
                data = resp.json()
                items = data.get("items", []) or data.get("products", [])
                if items and isinstance(items, list):
                    item = items[0]
                    slug = item.get("slug")
                    if slug:
                        direct_url = f"https://www.tirabeauty.com/product/{slug}"

                    price_obj = item.get("price", {})
                    eff = price_obj.get("effective", {})
                    marked = price_obj.get("marked", {})

                    eff_price = parse_numeric_price(eff.get("min") or eff.get("max") if isinstance(eff, dict) else eff)
                    marked_price = parse_numeric_price(marked.get("min") or marked.get("max") if isinstance(marked, dict) else marked)

                    in_stock = bool(item.get("is_in_stock", True))
                    if eff_price and eff_price > 0:
                        return {
                            "price": eff_price,
                            "originalPrice": marked_price if (marked_price and marked_price >= eff_price) else None,
                            "inStock": in_stock,
                            "stockStatus": "In Stock" if in_stock else "Out of Stock",
                        }, direct_url
            except Exception:
                pass

    # HTML fallback (either direct page or search result)
    target_url = direct_url or purchase_url
    resp = client.get(target_url)
    if resp and resp.status_code == 200 and resp.text:
        soup = BeautifulSoup(resp.text, "html.parser")
        if not direct_url and is_search_url(target_url):
            for link in soup.select('a[href*="/product/"], a[href*="/p/"]'):
                href = link.get("href", "")
                if href and not href.startswith("#"):
                    direct_url = urllib.parse.urljoin("https://www.tirabeauty.com", href)
                    break
        ld_data = extract_schema_org_jsonld(soup)
        if ld_data and ld_data.get("price"):
            return ld_data, direct_url

    return None, direct_url


def scrape_purplle(
    client: ScraperClient,
    purchase_url: str,
    product_name: str,
    brand: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Purplle:
    1. For search URLs (purplle.com/search?q=...), queries search HTML / API for non-sponsored
       organic product links matching brand/product, skipping ad cards.
    2. Resolves to direct https://www.purplle.com/product/... URL.
    3. Scrapes live price and MRP via Schema.org application/ld+json and HTML classes.
    """
    direct_url: Optional[str] = None

    if is_search_url(purchase_url):
        resp = client.get(purchase_url)
        if resp and resp.status_code == 200 and resp.text:
            soup = BeautifulSoup(resp.text, "html.parser")
            # Filter non-sponsored organic links
            links = soup.select('a[href*="/product/"], a[href*="/p/"], a[href*="/pr/"]')
            for link in links:
                href = link.get("href", "")
                classes = " ".join(link.get("class", []))
                parent = link.parent
                parent_classes = " ".join(parent.get("class", [])) if parent else ""

                if any(ad_kw in (classes + parent_classes).lower() for ad_kw in ["ad", "sponsor", "promot"]):
                    continue

                if href and not href.startswith("#"):
                    direct_url = urllib.parse.urljoin("https://www.purplle.com", href)
                    break

            if not direct_url:
                match = re.search(r'href=["\'](/(?:product|p|pr)/[^"\']+)["\']', resp.text)
                if match:
                    direct_url = urllib.parse.urljoin("https://www.purplle.com", match.group(1))

    else:
        direct_url = purchase_url

    # Scrape the direct product page if resolved
    target_url = direct_url or purchase_url
    resp = client.get(target_url)
    if resp and resp.status_code == 200 and resp.text:
        soup = BeautifulSoup(resp.text, "html.parser")
        ld_data = extract_schema_org_jsonld(soup)
        if ld_data and ld_data.get("price"):
            return ld_data, direct_url

        # HTML class fallback for Purplle
        price_elem = soup.select_one(".pd-price, .actual-price, span[class*='price']")
        mrp_elem = soup.select_one(".pd-mrp, .cut-price, span[class*='mrp']")
        price = parse_numeric_price(price_elem.get_text(strip=True)) if price_elem else None
        mrp = parse_numeric_price(mrp_elem.get_text(strip=True)) if mrp_elem else None
        if price and price > 0:
            return {
                "price": price,
                "originalPrice": mrp if (mrp and mrp >= price) else None,
                "inStock": True,
                "stockStatus": "In Stock",
            }, direct_url

    return None, direct_url


def scrape_amazon(
    client: ScraperClient,
    purchase_url: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Amazon India:
    1. Fetches with Chrome 124 TLS impersonation & Accept-Language: en-IN,en;q=0.9.
    2. Finds first non-sponsored div[data-component-type="s-search-result"] (excluding .AdHolder).
    3. Extracts /dp/<ASIN> direct URL and .a-price-whole / .a-text-price price.
    """
    direct_url: Optional[str] = None
    resp = client.get(purchase_url, headers={"Accept-Language": "en-IN,en;q=0.9"})
    if not resp or resp.status_code != 200 or not resp.text:
        return None, None

    soup = BeautifulSoup(resp.text, "html.parser")

    if is_search_url(purchase_url):
        search_cards = soup.select('div[data-component-type="s-search-result"]')
        for card in search_cards:
            classes = " ".join(card.get("class", []))
            # Skip AdHolder or sponsored markers
            if "AdHolder" in classes or card.select_one(".s-sponsored-label-info-icon, .puis-sponsored-label-text"):
                continue

            asin = card.get("data-asin", "").strip()
            if asin and len(asin) == 10:
                direct_url = f"https://www.amazon.in/dp/{asin}"
            else:
                link = card.select_one('a.a-link-normal.s-no-outline[href*="/dp/"], h2 a[href*="/dp/"]')
                if link:
                    href = link.get("href", "")
                    dp_m = re.search(r"(/dp/[A-Z0-9]{10})", href)
                    if dp_m:
                        direct_url = f"https://www.amazon.in{dp_m.group(1)}"
                    else:
                        direct_url = urllib.parse.urljoin("https://www.amazon.in", href)

            # Extract price directly from search card
            whole = card.select_one("span.a-price-whole")
            orig_elem = card.select_one("span.a-text-price span.a-offscreen")
            price = parse_numeric_price(whole.get_text(strip=True).rstrip(".")) if whole else None
            mrp = parse_numeric_price(orig_elem.get_text(strip=True)) if orig_elem else None

            if price and price > 0:
                return {
                    "price": price,
                    "originalPrice": mrp if (mrp and mrp >= price) else None,
                    "inStock": True,
                    "stockStatus": "In Stock",
                }, direct_url
            break

    # If direct product page or card price was not found, fetch direct page
    target_url = direct_url or purchase_url
    if not is_search_url(target_url):
        prod_resp = client.get(target_url, headers={"Accept-Language": "en-IN,en;q=0.9"})
        if prod_resp and prod_resp.status_code == 200 and prod_resp.text:
            prod_soup = BeautifulSoup(prod_resp.text, "html.parser")
            data = extract_amazon_html(prod_soup)
            if data and data.get("price"):
                return data, direct_url

    return None, direct_url


def scrape_myntra(
    client: ScraperClient,
    purchase_url: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Myntra:
    Extracts direct product URLs and window.__myx pdpData / searchData prices.
    """
    direct_url: Optional[str] = None
    resp = client.get(purchase_url)
    if not resp or resp.status_code != 200 or not resp.text:
        return None, None

    html = resp.text
    idx = html.find("window.__myx = ")
    if idx == -1:
        match = re.search(r"window\.__myx\s*=\s*(\{.*?\});\s*(?:</script>|window\.)", html, re.DOTALL)
        if not match:
            return None, None
        json_str = match.group(1)
    else:
        end = html.find("</script>", idx)
        if end == -1:
            end = len(html)
        json_str = html[idx + len("window.__myx = "):end].strip().rstrip(";")

    try:
        data = json.loads(json_str)
    except Exception:
        return None, None

    # 1. Product Detail Page (pdpData)
    if "pdpData" in data and isinstance(data["pdpData"], dict):
        pdp = data["pdpData"]
        direct_url = purchase_url
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
            }, direct_url

    # 2. Search / List Page (searchData)
    if "searchData" in data and isinstance(data["searchData"], dict):
        results = data["searchData"].get("results", {})
        prods = results.get("products", [])
        if prods and isinstance(prods, list):
            first = prods[0]
            landing_url = first.get("landingPageUrl")
            if landing_url:
                direct_url = f"https://www.myntra.com/{landing_url.lstrip('/')}"
            else:
                direct_url = purchase_url

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
                }, direct_url

    return None, direct_url


# ==============================================================================
# Universal Helpers
# ==============================================================================

def extract_schema_org_jsonld(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """Extract price, MRP, and stock status from Schema.org application/ld+json."""
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


def extract_amazon_html(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """Extract price and availability from Amazon product detail HTML."""
    price: Optional[float] = None
    orig_price: Optional[float] = None
    in_stock = True
    stock_status = "In Stock"

    whole = soup.select_one("span.a-price-whole")
    if whole:
        price = parse_numeric_price(whole.get_text(strip=True).rstrip("."))

    if not price:
        offscreen = soup.select_one("span.a-price span.a-offscreen")
        if offscreen:
            price = parse_numeric_price(offscreen.get_text(strip=True))

    orig_elem = soup.select_one("span.a-text-price span.a-offscreen, span.basisPrice span.a-offscreen")
    if orig_elem:
        orig_price = parse_numeric_price(orig_elem.get_text(strip=True))

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


def load_previous_snapshot(snapshot_path: Path) -> Dict[str, Any]:
    """Load previous snapshot to preserve valid prices during temporary network blocks."""
    if snapshot_path.exists():
        try:
            with open(snapshot_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("Could not read previous snapshot: %s", e)
    return {}


# ==============================================================================
# Main Orchestration Loop
# ==============================================================================

def main() -> None:
    logger.info("=== Starting PriceWise AI Automated Live Price Scraper ===")

    # 1. Load products and baseline catalogue
    products = extract_products_from_ts(PRODUCTS_FILE)
    prev_snapshot = load_previous_snapshot(SNAPSHOT_FILE)
    prev_products = prev_snapshot.get("products", {})

    client = ScraperClient(timeout=15)
    now_utc = datetime.now(timezone.utc)
    updated_at_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    updated_label_ist = format_ist_label(now_utc)
    logger.info("Snapshot timestamp: %s (UTC) | %s (IST)", updated_at_iso, updated_label_ist)

    # Per-store statistics tracker
    store_stats: Dict[str, Dict[str, int]] = {
        "nykaa": {"total": 0, "direct_resolved": 0, "live_scraped": 0, "preserved_cached": 0, "fallback_demo": 0},
        "amazon": {"total": 0, "direct_resolved": 0, "live_scraped": 0, "preserved_cached": 0, "fallback_demo": 0},
        "tira": {"total": 0, "direct_resolved": 0, "live_scraped": 0, "preserved_cached": 0, "fallback_demo": 0},
        "purplle": {"total": 0, "direct_resolved": 0, "live_scraped": 0, "preserved_cached": 0, "fallback_demo": 0},
        "myntra": {"total": 0, "direct_resolved": 0, "live_scraped": 0, "preserved_cached": 0, "fallback_demo": 0},
    }

    results: Dict[str, Any] = {}
    total_offers = sum(len(p["storeOffers"]) for p in products)
    total_live_scraped = 0
    total_preserved = 0
    total_fallback = 0

    for p_idx, prod in enumerate(products, start=1):
        pid = prod["id"]
        pname = prod["name"]
        pbrand = prod["brand"]
        prod_offers_map: Dict[str, Any] = {}
        prod_offers_list: List[Dict[str, Any]] = []

        logger.info("[%d/%d] %s (%s)", p_idx, len(products), pid, pname[:50])

        for offer in prod["storeOffers"]:
            store_id = offer["storeId"]
            store_name = offer.get("storeName", store_id.title())
            purchase_url = offer["purchaseUrl"]

            # Initialize stats bucket if needed
            if store_id not in store_stats:
                store_stats[store_id] = {"total": 0, "direct_resolved": 0, "live_scraped": 0, "preserved_cached": 0, "fallback_demo": 0}
            store_stats[store_id]["total"] += 1

            # Fetch cached offer data from previous snapshot if available
            prev_prod_data = prev_products.get(pid, {})
            prev_offer_data = prev_prod_data.get(store_id) or next(
                (o for o in prev_prod_data.get("offers", []) if o.get("storeId") == store_id),
                None
            )

            scraped_data: Optional[Dict[str, Any]] = None
            direct_url: Optional[str] = None

            # Dispatch retailer-specific scraper
            if store_id == "nykaa":
                scraped_data, direct_url = scrape_nykaa(client, purchase_url)
            elif store_id == "tira":
                scraped_data, direct_url = scrape_tira(client, purchase_url, pname, pbrand)
            elif store_id == "purplle":
                scraped_data, direct_url = scrape_purplle(client, purchase_url, pname, pbrand)
            elif store_id == "amazon":
                scraped_data, direct_url = scrape_amazon(client, purchase_url)
            elif store_id == "myntra":
                scraped_data, direct_url = scrape_myntra(client, purchase_url)
            else:
                # Universal fallback
                resp = client.get(purchase_url)
                if resp and resp.status_code == 200 and resp.text:
                    soup = BeautifulSoup(resp.text, "html.parser")
                    scraped_data = extract_schema_org_jsonld(soup)
                    direct_url = purchase_url

            if direct_url and not is_search_url(direct_url):
                store_stats[store_id]["direct_resolved"] += 1

            # Strict validation: ONLY mark sourceType='live' if a real numeric price > 0 was scraped
            if scraped_data and scraped_data.get("price") and scraped_data["price"] > 0:
                total_live_scraped += 1
                store_stats[store_id]["live_scraped"] += 1
                final_offer = {
                    "storeId": store_id,
                    "storeName": store_name,
                    "price": scraped_data["price"],
                    "originalPrice": scraped_data.get("originalPrice"),
                    "inStock": scraped_data.get("inStock", True),
                    "stockStatus": scraped_data.get("stockStatus", "In Stock"),
                    "purchaseUrl": direct_url or purchase_url,
                    "resolvedUrl": direct_url,
                    "sourceType": "live",
                    "lastChecked": updated_label_ist,
                    "status": "success",
                }
                logger.info("  ✓ [%s] Live: ₹%s (MRP: ₹%s) | Direct: %s",
                            store_id, final_offer["price"], final_offer["originalPrice"], (direct_url or purchase_url)[:60])

            elif prev_offer_data and prev_offer_data.get("price") and prev_offer_data["price"] > 0 and prev_offer_data.get("sourceType") == "live":
                # Preserve valid live price from previous snapshot
                total_preserved += 1
                store_stats[store_id]["preserved_cached"] += 1
                final_offer = dict(prev_offer_data)
                final_offer["sourceType"] = "cached"
                final_offer["status"] = "preserved_from_previous"
                final_offer["preservedFrom"] = prev_offer_data.get("lastChecked", updated_label_ist)
                if direct_url:
                    final_offer["resolvedUrl"] = direct_url
                    final_offer["purchaseUrl"] = direct_url
                logger.info("  ⟳ [%s] Preserved cached: ₹%s (from %s)",
                            store_id, final_offer["price"], final_offer.get("preservedFrom"))

            else:
                # Baseline fallback - NEVER tag as 'live', strictly 'demo'
                total_fallback += 1
                store_stats[store_id]["fallback_demo"] += 1
                final_offer = {
                    "storeId": store_id,
                    "storeName": store_name,
                    "price": offer.get("price") or prod.get("price"),
                    "originalPrice": offer.get("originalPrice") or prod.get("originalPrice"),
                    "inStock": offer.get("inStock", True),
                    "stockStatus": "In Stock" if offer.get("inStock", True) else "Out of Stock",
                    "purchaseUrl": direct_url or purchase_url,
                    "resolvedUrl": direct_url,
                    "sourceType": "demo",
                    "status": "catalog_baseline",
                    "lastChecked": updated_label_ist,
                }
                logger.info("  ⚠ [%s] Catalog baseline: ₹%s", store_id, final_offer["price"])

            prod_offers_map[store_id] = final_offer
            prod_offers_list.append(final_offer)
            time.sleep(0.2)

        results[pid] = {
            "productId": pid,
            "productName": pname,
            "brand": pbrand,
            "offers": prod_offers_list,
            **prod_offers_map,
        }

    # Snapshot output payload
    snapshot_output = {
        "updatedAt": updated_at_iso,
        "updatedLabel": updated_label_ist,
        "totalProducts": len(products),
        "totalOffers": total_offers,
        "scrapedSuccessCount": total_live_scraped,
        "preservedCount": total_preserved,
        "fallbackCount": total_fallback,
        "products": results,
    }

    # Atomic write to file
    SNAPSHOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_file = SNAPSHOT_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(snapshot_output, f, indent=2, ensure_ascii=False)
    temp_file.replace(SNAPSHOT_FILE)

    # Pretty per-store summary table
    print("\n" + "=" * 90)
    print(f" RETAILER LIVE PRICE & DIRECT URL RESOLUTION SUMMARY ({updated_label_ist})")
    print("=" * 90)
    print(f" {'Retailer':<16} {'Total Offers':<14} {'Direct URLs':<14} {'Live Scraped':<14} {'Cached':<12} {'Fallback':<10}")
    print("-" * 90)

    store_display_names = {
        "nykaa": "Nykaa",
        "amazon": "Amazon India",
        "tira": "Tira Beauty",
        "purplle": "Purplle",
        "myntra": "Myntra",
    }

    for sid, sname in store_display_names.items():
        st = store_stats.get(sid, {"total": 0, "direct_resolved": 0, "live_scraped": 0, "preserved_cached": 0, "fallback_demo": 0})
        print(f" {sname:<16} {st['total']:<14} {st['direct_resolved']:<14} {st['live_scraped']:<14} {st['preserved_cached']:<12} {st['fallback_demo']:<10}")

    print("-" * 90)
    print(f" {'TOTAL':<16} {total_offers:<14} {sum(s['direct_resolved'] for s in store_stats.values()):<14} {total_live_scraped:<14} {total_preserved:<12} {total_fallback:<10}")
    print("=" * 90 + "\n")

    logger.info("Snapshot written to %s", SNAPSHOT_FILE)
    logger.info("=== Live Price Scraper Completed ===")


if __name__ == "__main__":
    main()
