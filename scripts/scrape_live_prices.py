#!/usr/bin/env python3
"""
Automated Live Retailer Price Scraper for PriceWise AI Beauty.

1. Reads product catalogue from frontend/src/data/products.ts.
2. Resolves direct canonical product URLs and scrapes live prices for Indian retailers:
   - Nykaa: Fast API / Preloaded State / Schema.org with Playwright headless Chromium fallback
     (waiting for span.css-1jczs19, [data-testid="pdp-price"], etc.).
   - Amazon India: Fast parsing with Playwright Chromium fallback on search results, extracting
     first non-sponsored [data-component-type="s-search-result"]:not(.AdHolder) with canonical
     https://www.amazon.in/dp/<ASIN> and .a-price-whole price.
   - Purplle & Tira: Fast catalog API/HTML with Playwright Chromium fallback, resolving direct
     /product/... canonical URLs and live prices.
   - Myntra: Fast window.__myx parsing with Playwright Chromium fallback, resolving canonical
     /buy URLs and discounted prices.
   - Canonical search engine fallback (DDG) for when any retailer endpoint is blocked.
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

# Import Playwright with graceful fallback
try:
    from playwright.sync_api import sync_playwright, Browser, BrowserContext, Page, TimeoutError as PlaywrightTimeoutError
    HAS_PLAYWRIGHT = True
    logger.info("Playwright sync_api available for headless Chromium browser scraping.")
except ImportError:
    HAS_PLAYWRIGHT = False
    logger.info("Playwright not installed; headless browser mode disabled (HTTP mode only).")


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
            logger.debug("HTTP request failed for %s: %s", url[:80], e)
            return None


class PlaywrightBrowserManager:
    """Manages headless Chromium browser instance with Indian locale & timezone."""

    def __init__(self):
        self._pw = None
        self._browser = None
        self._context = None

    def get_context(self) -> Optional[BrowserContext]:
        if not HAS_PLAYWRIGHT:
            return None
        if self._context is None:
            try:
                self._pw = sync_playwright().start()
                self._browser = self._pw.chromium.launch(
                    headless=True,
                    args=[
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-dev-shm-usage",
                        "--disable-blink-features=AutomationControlled",
                    ],
                )
                self._context = self._browser.new_context(
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                    ),
                    locale="en-IN",
                    timezone_id="Asia/Kolkata",
                    viewport={"width": 1366, "height": 768},
                    geolocation={"latitude": 19.0760, "longitude": 72.8777},  # Mumbai, India
                    permissions=["geolocation"],
                )
                # Block tracking / analytics to speed up page loads
                def handle_route(route):
                    req = route.request
                    if req.resource_type in ["image", "media", "font"] and "google" in req.url:
                        route.abort()
                    elif any(trk in req.url for trk in ["google-analytics", "doubleclick", "criteo", "hotjar"]):
                        route.abort()
                    else:
                        route.continue_()
                self._context.route("**/*", handle_route)
            except Exception as e:
                logger.warning("Could not launch Playwright Chromium: %s", e)
                return None
        return self._context

    def new_page(self) -> Optional[Page]:
        ctx = self.get_context()
        if ctx:
            try:
                return ctx.new_page()
            except Exception as e:
                logger.warning("Could not create Playwright page: %s", e)
        return None

    def close(self):
        try:
            if self._context:
                self._context.close()
            if self._browser:
                self._browser.close()
            if self._pw:
                self._pw.stop()
        except Exception:
            pass


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


def resolve_via_search_engine(
    client: ScraperClient,
    domain: str,
    brand: str,
    product_name: str,
    canonical_marker: str,
) -> Optional[str]:
    """Search-engine fallback to resolve canonical direct product URL."""
    clean_b = re.sub(r"[^a-zA-Z0-9\s]", " ", brand).strip()
    clean_p = re.sub(r"[^a-zA-Z0-9\s]", " ", product_name).strip()
    query_str = f"site:{domain} {clean_b} {clean_p}"
    ddg_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(query_str)}"

    resp = client.get(ddg_url)
    if not resp or resp.status_code != 200 or not resp.text:
        return None

    soup = BeautifulSoup(resp.text, "html.parser")
    for link in soup.find_all("a", href=True):
        href = link["href"]
        m = re.search(r"uddg=([^&]+)", href)
        target = urllib.parse.unquote(m.group(1)) if m else href

        if domain in target and canonical_marker in target:
            if domain == "amazon.in":
                asin_m = re.search(r"(/dp/[A-Z0-9]{10})", target)
                if asin_m:
                    return f"https://www.amazon.in{asin_m.group(1)}"
            elif domain == "nykaa.com":
                p_m = re.search(r"(https://www\.nykaa\.com/[^?#]*/p/\d+)", target)
                if p_m:
                    return p_m.group(1)
            elif domain == "purplle.com":
                p_m = re.search(r"(https://www\.purplle\.com/product/[^?#]+)", target)
                if p_m:
                    return p_m.group(1)
            elif domain == "myntra.com":
                p_m = re.search(r"(https://www\.myntra\.com/[^?#]*/buy)", target)
                if p_m:
                    return p_m.group(1)
            return target.split("?")[0]

    return None


# ==============================================================================
# Retailer-Specific Scrapers with Playwright Headless Chromium Fallback
# ==============================================================================

def scrape_nykaa(
    client: ScraperClient,
    browser_mgr: PlaywrightBrowserManager,
    purchase_url: str,
    product_name: str = "",
    brand: str = "",
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url = purchase_url
    prod_id_match = re.search(r"productId=(\d+)", purchase_url) or re.search(r"/p/(\d+)", purchase_url)

    if is_search_url(purchase_url) or "/p/" not in purchase_url:
        resolved = resolve_via_search_engine(client, "nykaa.com", brand, product_name, "/p/")
        if resolved:
            direct_url = resolved
            prod_id_match = re.search(r"productId=(\d+)", direct_url) or re.search(r"/p/(\d+)", direct_url)

    # 1. Fast App API check
    if prod_id_match:
        nykaa_id = prod_id_match.group(1)
        api_url = f"https://www.nykaa.com/app-api/index.php/products/details?product_id={nykaa_id}"
        api_headers = {
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
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

    # 2. Fast HTTP HTML parsing
    resp = client.get(direct_url)
    if resp and resp.status_code == 200 and resp.text:
        soup = BeautifulSoup(resp.text, "html.parser")
        ld_data = extract_schema_org_jsonld(soup)
        if ld_data and ld_data.get("price"):
            return ld_data, direct_url

    # 3. Playwright Headless Chromium Fallback
    page = browser_mgr.new_page()
    if page:
        try:
            page.goto(direct_url, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(1000)

            # Check DOM price selectors
            eval_result = page.evaluate("""() => {
                const priceEl = document.querySelector('span.css-1jczs19, [data-testid="pdp-price"], .post-discount-price, span[class*="price"]');
                const mrpEl = document.querySelector('span.css-u05rr, span.css-175whwo, .cross-price, span[class*="mrp"]');
                const priceText = priceEl ? priceEl.innerText : null;
                const mrpText = mrpEl ? mrpEl.innerText : null;
                const inStock = !document.body.innerText.includes('OUT OF STOCK');
                return { priceText, mrpText, inStock };
            }""")

            if eval_result and eval_result.get("priceText"):
                p = parse_numeric_price(eval_result["priceText"])
                m = parse_numeric_price(eval_result.get("mrpText"))
                if p and p > 0:
                    return {
                        "price": p,
                        "originalPrice": m if (m and m >= p) else None,
                        "inStock": eval_result.get("inStock", True),
                        "stockStatus": "In Stock" if eval_result.get("inStock", True) else "Out of Stock",
                    }, direct_url
        except Exception as e:
            logger.debug("Playwright Nykaa error: %s", e)
        finally:
            page.close()

    return None, direct_url


def scrape_amazon(
    client: ScraperClient,
    browser_mgr: PlaywrightBrowserManager,
    purchase_url: str,
    product_name: str = "",
    brand: str = "",
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url: Optional[str] = None

    # 1. Fast HTTP search cards extraction
    if is_search_url(purchase_url):
        resp = client.get(purchase_url, headers={"Accept-Language": "en-IN,en;q=0.9"})
        if resp and resp.status_code == 200 and resp.text:
            soup = BeautifulSoup(resp.text, "html.parser")
            search_cards = soup.select('div[data-component-type="s-search-result"]')
            for card in search_cards:
                classes = " ".join(card.get("class", []))
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

    # 2. Playwright Headless Chromium for Amazon Search & Card Resolution
    page = browser_mgr.new_page()
    if page:
        try:
            page.goto(purchase_url, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(1000)

            # Find first non-sponsored search result card
            eval_result = page.evaluate(r"""() => {
                const cards = Array.from(document.querySelectorAll('div[data-component-type="s-search-result"]'));
                for (const card of cards) {
                    if (card.classList.contains('AdHolder')) continue;
                    if (card.querySelector('.s-sponsored-label-info-icon, .puis-sponsored-label-text')) continue;
                    const asin = card.getAttribute('data-asin') || '';
                    const link = card.querySelector('a.a-link-normal.s-no-outline[href*="/dp/"], h2 a[href*="/dp/"]');
                    const href = link ? link.getAttribute('href') : '';
                    const whole = card.querySelector('span.a-price-whole');
                    const orig = card.querySelector('span.a-text-price span.a-offscreen');
                    let directUrl = null;
                    if (asin && asin.length === 10) {
                        directUrl = 'https://www.amazon.in/dp/' + asin;
                    } else if (href) {
                        const m = href.match(/\/dp\/[A-Z0-9]{10}/);
                        directUrl = m ? 'https://www.amazon.in' + m[0] : href;
                    }
                    return {
                        directUrl,
                        priceText: whole ? whole.innerText : null,
                        mrpText: orig ? orig.innerText : null
                    };
                }
                return null;
            }""")

            if eval_result:
                if eval_result.get("directUrl"):
                    direct_url = eval_result["directUrl"]
                if eval_result.get("priceText"):
                    p = parse_numeric_price(eval_result["priceText"])
                    m = parse_numeric_price(eval_result.get("mrpText"))
                    if p and p > 0:
                        return {
                            "price": p,
                            "originalPrice": m if (m and m >= p) else None,
                            "inStock": True,
                            "stockStatus": "In Stock",
                        }, direct_url

        except Exception as e:
            logger.debug("Playwright Amazon error: %s", e)
        finally:
            page.close()

    # 3. Canonical Search-Engine Fallback
    if not direct_url and (is_search_url(purchase_url) or "/dp/" not in purchase_url):
        direct_url = resolve_via_search_engine(client, "amazon.in", brand, product_name, "/dp/")

    return None, direct_url


def scrape_tira(
    client: ScraperClient,
    browser_mgr: PlaywrightBrowserManager,
    purchase_url: str,
    product_name: str,
    brand: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url: Optional[str] = None
    query = ""
    parsed = urllib.parse.urlparse(purchase_url)
    qs = urllib.parse.parse_qs(parsed.query)
    if "q" in qs and qs["q"]:
        query = qs["q"][0]
    elif product_name:
        query = f"{brand} {product_name}".strip()

    # 1. Fast Tira Catalog API
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

    # 2. Playwright Headless Chromium Fallback
    page = browser_mgr.new_page()
    if page:
        try:
            page.goto(purchase_url, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(1500)

            eval_result = page.evaluate("""() => {
                const links = Array.from(document.querySelectorAll('a[href*="/product/"], a[href*="/p/"]'));
                let resolved = null;
                for (const link of links) {
                    const href = link.getAttribute('href');
                    if (href && !href.startsWith('#')) {
                        resolved = href.startsWith('http') ? href : 'https://www.tirabeauty.com' + href;
                        break;
                    }
                }
                const priceEl = document.querySelector('.selling-price, span[class*="sellingPrice"], span[class*="final-price"]');
                const mrpEl = document.querySelector('.mrp, span[class*="mrp"], span[class*="originalPrice"]');
                return {
                    resolvedUrl: resolved,
                    priceText: priceEl ? priceEl.innerText : null,
                    mrpText: mrpEl ? mrpEl.innerText : null
                };
            }""")

            if eval_result:
                if eval_result.get("resolvedUrl"):
                    direct_url = eval_result["resolvedUrl"]
                if eval_result.get("priceText"):
                    p = parse_numeric_price(eval_result["priceText"])
                    m = parse_numeric_price(eval_result.get("mrpText"))
                    if p and p > 0:
                        return {
                            "price": p,
                            "originalPrice": m if (m and m >= p) else None,
                            "inStock": True,
                            "stockStatus": "In Stock",
                        }, direct_url
        except Exception as e:
            logger.debug("Playwright Tira error: %s", e)
        finally:
            page.close()

    return None, direct_url


def scrape_purplle(
    client: ScraperClient,
    browser_mgr: PlaywrightBrowserManager,
    purchase_url: str,
    product_name: str,
    brand: str,
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url: Optional[str] = None

    # 1. Fast HTTP parsing
    if is_search_url(purchase_url):
        resp = client.get(purchase_url)
        if resp and resp.status_code == 200 and resp.text:
            soup = BeautifulSoup(resp.text, "html.parser")
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

    # 2. Playwright Headless Chromium Fallback
    page = browser_mgr.new_page()
    if page:
        try:
            target = direct_url or purchase_url
            page.goto(target, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(1500)

            eval_result = page.evaluate("""() => {
                let resolved = null;
                const links = Array.from(document.querySelectorAll('a[href*="/product/"], a[href*="/p/"]'));
                for (const a of links) {
                    const href = a.getAttribute('href');
                    if (href && !href.includes('google') && !href.startsWith('#')) {
                        resolved = href.startsWith('http') ? href : 'https://www.purplle.com' + href;
                        break;
                    }
                }
                const priceEl = document.querySelector('.pd-price, .actual-price, span[class*="price"]');
                const mrpEl = document.querySelector('.pd-mrp, .cut-price, span[class*="mrp"]');
                return {
                    resolvedUrl: resolved,
                    priceText: priceEl ? priceEl.innerText : null,
                    mrpText: mrpEl ? mrpEl.innerText : null
                };
            }""")

            if eval_result:
                if eval_result.get("resolvedUrl") and not direct_url:
                    direct_url = eval_result["resolvedUrl"]
                if eval_result.get("priceText"):
                    p = parse_numeric_price(eval_result["priceText"])
                    m = parse_numeric_price(eval_result.get("mrpText"))
                    if p and p > 0:
                        return {
                            "price": p,
                            "originalPrice": m if (m and m >= p) else None,
                            "inStock": True,
                            "stockStatus": "In Stock",
                        }, direct_url
        except Exception as e:
            logger.debug("Playwright Purplle error: %s", e)
        finally:
            page.close()

    # 3. Search Engine Fallback
    if not direct_url and (is_search_url(purchase_url) or "/product/" not in purchase_url):
        direct_url = resolve_via_search_engine(client, "purplle.com", brand, product_name, "/product/")

    return None, direct_url


def scrape_myntra(
    client: ScraperClient,
    browser_mgr: PlaywrightBrowserManager,
    purchase_url: str,
    product_name: str = "",
    brand: str = "",
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url: Optional[str] = None
    target_url = purchase_url

    # 1. Fast HTTP Myntra window.__myx check
    resp = client.get(target_url)
    if resp and resp.status_code == 200 and resp.text:
        html = resp.text
        idx = html.find("window.__myx = ")
        json_str = None
        if idx != -1:
            end = html.find("</script>", idx)
            if end != -1:
                json_str = html[idx + len("window.__myx = "):end].strip().rstrip(";")
        if json_str:
            try:
                data = json.loads(json_str)
                if "pdpData" in data and isinstance(data["pdpData"], dict):
                    pdp = data["pdpData"]
                    direct_url = target_url
                    p_info = pdp.get("price", {})
                    discounted = parse_numeric_price(p_info.get("discounted") or p_info.get("price"))
                    mrp = parse_numeric_price(p_info.get("mrp"))
                    sizes = pdp.get("sizes", [])
                    in_stock = any(s.get("available") for s in sizes) if sizes else bool(pdp.get("inStock", True))

                    if discounted and discounted > 0:
                        return {
                            "price": discounted,
                            "originalPrice": mrp if (mrp and mrp >= discounted) else None,
                            "inStock": in_stock,
                            "stockStatus": "In Stock" if in_stock else "Out of Stock",
                        }, direct_url

                if "searchData" in data and isinstance(data["searchData"], dict):
                    results = data["searchData"].get("results", {})
                    prods = results.get("products", [])
                    if prods and isinstance(prods, list):
                        first = prods[0]
                        landing = first.get("landingPageUrl")
                        if landing:
                            direct_url = f"https://www.myntra.com/{landing.lstrip('/')}"
                        price = parse_numeric_price(first.get("price"))
                        mrp = parse_numeric_price(first.get("mrp"))
                        inv = first.get("inventoryInfo", [])
                        in_stock = any(i.get("available") for i in inv) if inv else not first.get("outOfStock", False)

                        if price and price > 0:
                            return {
                                "price": price,
                                "originalPrice": mrp if (mrp and mrp >= price) else None,
                                "inStock": in_stock,
                                "stockStatus": "In Stock" if in_stock else "Out of Stock",
                            }, direct_url
            except Exception:
                pass

    # 2. Playwright Headless Chromium Fallback
    page = browser_mgr.new_page()
    if page:
        try:
            page.goto(target_url, wait_until="domcontentloaded", timeout=20000)
            page.wait_for_timeout(1000)

            eval_result = page.evaluate("""() => {
                if (window.__myx && window.__myx.pdpData) {
                    const p = window.__myx.pdpData.price || {};
                    return {
                        price: p.discounted || p.price,
                        mrp: p.mrp,
                        directUrl: window.location.href
                    };
                }
                const priceEl = document.querySelector('.pdp-price strong, .product-discountedPrice');
                const mrpEl = document.querySelector('.pdp-mrp s, .product-strike');
                return {
                    price: priceEl ? priceEl.innerText : null,
                    mrp: mrpEl ? mrpEl.innerText : null,
                    directUrl: window.location.href
                };
            }""")

            if eval_result:
                if eval_result.get("directUrl") and not is_search_url(eval_result["directUrl"]):
                    direct_url = eval_result["directUrl"]
                if eval_result.get("price"):
                    p = parse_numeric_price(eval_result["price"])
                    m = parse_numeric_price(eval_result.get("mrp"))
                    if p and p > 0:
                        return {
                            "price": p,
                            "originalPrice": m if (m and m >= p) else None,
                            "inStock": True,
                            "stockStatus": "In Stock",
                        }, direct_url
        except Exception as e:
            logger.debug("Playwright Myntra error: %s", e)
        finally:
            page.close()

    # 3. Canonical Search Engine Fallback
    if not direct_url and "/buy" not in purchase_url:
        direct_url = resolve_via_search_engine(client, "myntra.com", brand, product_name, "/buy")

    return None, direct_url


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
    browser_mgr = PlaywrightBrowserManager()

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

    try:
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

                if store_id not in store_stats:
                    store_stats[store_id] = {"total": 0, "direct_resolved": 0, "live_scraped": 0, "preserved_cached": 0, "fallback_demo": 0}
                store_stats[store_id]["total"] += 1

                prev_prod_data = prev_products.get(pid, {})
                prev_offer_data = prev_prod_data.get(store_id) or next(
                    (o for o in prev_prod_data.get("offers", []) if o.get("storeId") == store_id),
                    None
                )

                scraped_data: Optional[Dict[str, Any]] = None
                direct_url: Optional[str] = None

                # Dispatch retailer-specific scraper with Playwright fallback
                if store_id == "nykaa":
                    scraped_data, direct_url = scrape_nykaa(client, browser_mgr, purchase_url, pname, pbrand)
                elif store_id == "tira":
                    scraped_data, direct_url = scrape_tira(client, browser_mgr, purchase_url, pname, pbrand)
                elif store_id == "purplle":
                    scraped_data, direct_url = scrape_purplle(client, browser_mgr, purchase_url, pname, pbrand)
                elif store_id == "amazon":
                    scraped_data, direct_url = scrape_amazon(client, browser_mgr, purchase_url, pname, pbrand)
                elif store_id == "myntra":
                    scraped_data, direct_url = scrape_myntra(client, browser_mgr, purchase_url, pname, pbrand)
                else:
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
                time.sleep(0.1)

            results[pid] = {
                "productId": pid,
                "productName": pname,
                "brand": pbrand,
                "offers": prod_offers_list,
                **prod_offers_map,
            }
    finally:
        browser_mgr.close()

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

    SNAPSHOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_file = SNAPSHOT_FILE.with_suffix(".tmp")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(snapshot_output, f, indent=2, ensure_ascii=False)
    temp_file.replace(SNAPSHOT_FILE)

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
