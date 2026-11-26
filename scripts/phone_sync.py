#!/usr/bin/env python3
"""
PriceWise AI - Lightweight Mobile Indian-IP Price Synchronizer.

Designed to run directly on an Android device (Termux) over local Indian mobile data or Wi-Fi.
Uses ThreadPoolExecutor(max_workers=5) with curl_cffi / requests (Chrome 124 TLS) and beautifulsoup4.
Scrapes live prices, resolves canonical product URLs, and writes updated snapshots to
frontend/public/data/live-prices.json with real-time terminal progress and a summary table.

Preserves previously verified live prices (sourceType == 'live') when a store is temporarily
throttled or returns no data, ensuring live prices are never wiped out.
"""

from __future__ import annotations

import json
import os
import re
import sys
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from bs4 import BeautifulSoup
import requests as std_requests

REPO_ROOT = Path(__file__).resolve().parent.parent
PRODUCTS_FILE = REPO_ROOT / "frontend" / "src" / "data" / "products.ts"
SNAPSHOT_FILE = REPO_ROOT / "frontend" / "public" / "data" / "live-prices.json"

IST = timezone(timedelta(hours=5, minutes=30))

# Import curl_cffi with transparent requests fallback for Termux/Android
try:
    from curl_cffi import requests as cffi_requests
    HAS_CURL_CFFI = True
except (ImportError, Exception):
    import requests as cffi_requests  # type: ignore
    HAS_CURL_CFFI = False


class HttpClient:
    """Session wrapper providing Chrome 124 impersonation and Indian locale."""

    def __init__(self, timeout: int = 12):
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
        except Exception:
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
    """Format datetime in clean Indian Standard Time, e.g. 26 Nov 2026, 07:15 PM IST."""
    return dt.astimezone(IST).strftime("%d %b %Y, %I:%M %p IST")


def is_search_url(url: str) -> bool:
    """Check if URL is a search or catalog listing URL."""
    return any(p in url for p in ["/search?", "/s?k=", "?q=", "/search/"])


def extract_schema_org_jsonld(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """Universal Schema.org application/ld+json extractor."""
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
                    orig = parse_numeric_price(
                        off.get("highPrice")
                        or off.get("originalPrice")
                        or (off.get("priceSpecification", {}).get("price") if isinstance(off.get("priceSpecification"), dict) else None)
                    )
                    avail = str(off.get("availability", "")).lower()
                    in_stock = not any(w in avail for w in ["outofstock", "discontinued"])
                    if price and price > 0:
                        return {
                            "price": price,
                            "originalPrice": orig if (orig and orig >= price) else None,
                            "inStock": in_stock,
                            "stockStatus": "In Stock" if in_stock else "Out of Stock",
                        }
    return None


def resolve_via_search_engine(
    client: HttpClient,
    domain: str,
    brand: str,
    product_name: str,
    canonical_marker: str,
) -> Optional[str]:
    """Search engine resolver using standard requests for Yahoo search with DuckDuckGo fallback."""
    clean_b = re.sub(r"\s+", " ", re.sub(r"[^a-zA-Z0-9]", " ", brand)).strip()
    clean_p = re.sub(r"\s+", " ", re.sub(r"[^a-zA-Z0-9]", " ", product_name)).strip()
    words = clean_p.split()[:4]
    query_str = f"site:{domain} {clean_b} {' '.join(words)}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-IN,en;q=0.9",
    }

    # 1. Try Yahoo Search using standard requests
    try:
        y_url = f"https://search.yahoo.com/search?p={urllib.parse.quote_plus(query_str)}"
        r = std_requests.get(y_url, headers=headers, timeout=6)
        if r.status_code == 200 and r.text:
            soup = BeautifulSoup(r.text, "html.parser")
            for a in soup.find_all("a", href=True):
                h = a["href"]
                ru_m = re.search(r"/RU=([^/]+)", h)
                target = urllib.parse.unquote(ru_m.group(1)) if ru_m else urllib.parse.unquote(h)
                if domain in target and canonical_marker in target:
                    if domain == "amazon.in":
                        asin_m = re.search(r"(/dp/[A-Z0-9]{10})", target)
                        if asin_m:
                            return f"https://www.amazon.in{asin_m.group(1)}"
                    elif domain == "nykaa.com":
                        p_m = re.search(r"(https://www\.nykaa\.com/[^?#&]*/p/\d+)", target)
                        if p_m:
                            return p_m.group(1)
                    elif domain == "purplle.com":
                        p_m = re.search(r"(https://www\.purplle\.com/product/[^?#&/]+)", target)
                        if p_m:
                            return p_m.group(1)
                    elif domain == "tirabeauty.com":
                        p_m = re.search(r"(https://www\.tirabeauty\.com/product/[^?#&/]+)", target)
                        if p_m:
                            return p_m.group(1)
                    elif domain == "myntra.com":
                        p_m = re.search(r"(https://www\.myntra\.com/[^?#&]*/buy)", target)
                        if p_m:
                            return p_m.group(1)
                    return target.split("?")[0].split("&")[0].split("/RK=")[0]
    except Exception:
        pass

    # 2. Try DuckDuckGo HTML as fallback
    try:
        ddg_url = f"https://html.duckduckgo.com/html/?q={urllib.parse.quote_plus(query_str)}"
        r = std_requests.get(ddg_url, headers=headers, timeout=6)
        if r.status_code == 200 and r.text:
            soup = BeautifulSoup(r.text, "html.parser")
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
                        p_m = re.search(r"(https://www\.nykaa\.com/[^?#&]*/p/\d+)", target)
                        if p_m:
                            return p_m.group(1)
                    elif domain == "purplle.com":
                        p_m = re.search(r"(https://www\.purplle\.com/product/[^?#&/]+)", target)
                        if p_m:
                            return p_m.group(1)
                    elif domain == "tirabeauty.com":
                        p_m = re.search(r"(https://www\.tirabeauty\.com/product/[^?#&/]+)", target)
                        if p_m:
                            return p_m.group(1)
                    elif domain == "myntra.com":
                        p_m = re.search(r"(https://www\.myntra\.com/[^?#&]*/buy)", target)
                        if p_m:
                            return p_m.group(1)
                    return target.split("?")[0]
    except Exception:
        pass

    return None


# ==============================================================================
# Store Handlers
# ==============================================================================

def extract_nykaa_product_id(url: str) -> Optional[str]:
    """Extract numeric Nykaa product ID from URL query params or path."""
    m = re.search(r"productId=(\d+)", url)
    if m:
        return m.group(1)
    m = re.search(r"/p/(?:[^/?#]+/)?(\d+)", url)
    if m:
        return m.group(1)
    if "/p/" in url:
        p_part = url.split("/p/")[-1].split("?")[0].split("#")[0].strip("/")
        tokens = p_part.split("/")
        for token in reversed(tokens):
            if token.isdigit() and len(token) >= 4:
                return token
    return None


def scrape_nykaa(client: HttpClient, url: str, name: str, brand: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url = url
    prod_id = extract_nykaa_product_id(url)

    if not prod_id and (is_search_url(url) or "/p/" not in url):
        resolved = resolve_via_search_engine(client, "nykaa.com", brand, name, "/p/")
        if resolved:
            direct_url = resolved
            prod_id = extract_nykaa_product_id(direct_url)

    # 1. Nykaa public product details API (Mobile & Chrome headers)
    if prod_id:
        api_url = f"https://www.nykaa.com/app-api/index.php/products/details?product_id={prod_id}"
        header_candidates = [
            {
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
                "Accept-Language": "en-IN,en;q=0.9",
                "Origin": "https://www.nykaa.com",
                "Referer": "https://www.nykaa.com/",
            },
            {
                "Accept": "application/json, text/plain, */*",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
                "Accept-Language": "en-IN,en;q=0.9",
                "Origin": "https://www.nykaa.com",
                "Referer": "https://www.nykaa.com/",
            }
        ]
        for hdrs in header_candidates:
            resp = client.get(api_url, headers=hdrs)
            if resp and resp.status_code == 200:
                try:
                    data = resp.json()
                    resp_obj = data.get("response", {})
                    p_info = resp_obj.get("product") if isinstance(resp_obj.get("product"), dict) else resp_obj
                    if isinstance(p_info, dict) and p_info:
                        price = parse_numeric_price(
                            p_info.get("final_price")
                            or p_info.get("offer_price")
                            or p_info.get("discounted_price")
                            or p_info.get("price")
                        )
                        orig = parse_numeric_price(p_info.get("mrp") or p_info.get("price"))
                        in_stock = bool(p_info.get("is_saleable", True)) and bool(p_info.get("gludo_stock", True))
                        if p_info.get("in_stock") is not None:
                            in_stock = bool(p_info.get("in_stock"))
                        slug = p_info.get("slug")
                        if slug:
                            direct_url = f"https://www.nykaa.com/{slug.lstrip('/')}"
                        if price and price > 0:
                            return {
                                "price": price,
                                "originalPrice": orig if (orig and orig >= price) else None,
                                "inStock": in_stock,
                                "stockStatus": "In Stock" if in_stock else "Out of Stock",
                            }, direct_url
                except Exception:
                    pass

    # 2. HTML Fallback: window.__PRELOADED_STATE__ & Schema.org JSON-LD
    target_url = direct_url or url
    resp = client.get(target_url)
    if resp and resp.status_code == 200 and resp.text:
        html = resp.text
        if "__PRELOADED_STATE__" in html:
            m = re.search(r"window\.__PRELOADED_STATE__\s*=\s*(\{.*?\});?\s*</script>", html, re.DOTALL)
            if m:
                try:
                    st_data = json.loads(m.group(1))
                    pdp = st_data.get("product", {}) or st_data.get("pdp", {})
                    p = parse_numeric_price(pdp.get("offerPrice") or pdp.get("finalPrice") or pdp.get("price"))
                    mrp = parse_numeric_price(pdp.get("mrp") or pdp.get("price"))
                    if p and p > 0:
                        return {"price": p, "originalPrice": mrp if (mrp and mrp >= p) else None, "inStock": True, "stockStatus": "In Stock"}, direct_url
                except Exception:
                    pass
            off_m = re.search(r'["\'](?:offerPrice|finalPrice|discountedPrice)["\']\s*:\s*(\d+(?:\.\d+)?)', html)
            mrp_m = re.search(r'["\'](?:mrp|price)["\']\s*:\s*(\d+(?:\.\d+)?)', html)
            if off_m:
                p = parse_numeric_price(off_m.group(1))
                m = parse_numeric_price(mrp_m.group(1)) if mrp_m else None
                if p and p > 0:
                    return {"price": p, "originalPrice": m if (m and m >= p) else None, "inStock": True, "stockStatus": "In Stock"}, direct_url

        soup = BeautifulSoup(html, "html.parser")
        ld = extract_schema_org_jsonld(soup)
        if ld and ld.get("price"):
            return ld, direct_url

        css_price = soup.select_one("span.css-1jczs19, [data-testid='pdp-price'], .post-card__price-offer")
        css_mrp = soup.select_one("span.css-u05rr, [data-testid='mrp']")
        p = parse_numeric_price(css_price.get_text(strip=True)) if css_price else None
        m = parse_numeric_price(css_mrp.get_text(strip=True)) if css_mrp else None
        if p and p > 0:
            return {"price": p, "originalPrice": m if (m and m >= p) else None, "inStock": True, "stockStatus": "In Stock"}, direct_url

    return None, direct_url


def scrape_amazon(client: HttpClient, url: str, name: str, brand: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url: Optional[str] = None
    asin_match = re.search(r"/(?:dp|gp/product)/([A-Z0-9]{10})", url)
    if asin_match:
        direct_url = f"https://www.amazon.in/dp/{asin_match.group(1)}"

    # If it is a search URL, first parse search results for first organic card & price
    if is_search_url(url):
        headers = {
            "Accept-Language": "en-IN,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        }
        resp = client.get(url, headers=headers)
        if resp and resp.status_code == 200 and resp.text:
            soup = BeautifulSoup(resp.text, "html.parser")
            for card in soup.select('div[data-component-type="s-search-result"]'):
                if "AdHolder" in card.get("class", []):
                    continue
                if card.select_one(".s-sponsored-label-info-icon, .puis-sponsored-label-text, .s-sponsored-label"):
                    continue
                asin = card.get("data-asin", "").strip()
                if asin and len(asin) == 10:
                    direct_url = f"https://www.amazon.in/dp/{asin}"
                else:
                    link = card.select_one('a.a-link-normal.s-no-outline[href*="/dp/"], h2 a[href*="/dp/"]')
                    if link:
                        m = re.search(r"(/dp/[A-Z0-9]{10})", link.get("href", ""))
                        if m:
                            direct_url = f"https://www.amazon.in{m.group(1)}"
                whole = card.select_one("span.a-price-whole")
                orig = card.select_one("span.a-text-price span.a-offscreen")
                p = parse_numeric_price(whole.get_text(strip=True).rstrip(".")) if whole else None
                m = parse_numeric_price(orig.get_text(strip=True)) if orig else None
                if p and p > 0:
                    return {
                        "price": p,
                        "originalPrice": m if (m and m >= p) else None,
                        "inStock": True,
                        "stockStatus": "In Stock"
                    }, direct_url
                break

    # If direct url not resolved yet, use search engine fallback
    if not direct_url and (is_search_url(url) or "/dp/" not in url):
        direct_url = resolve_via_search_engine(client, "amazon.in", brand, name, "/dp/")

    target_url = direct_url or (url if not is_search_url(url) else None)
    if target_url:
        headers = {
            "Accept-Language": "en-IN,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        }
        resp = client.get(target_url, headers=headers)
        if resp and resp.status_code == 200 and resp.text:
            soup = BeautifulSoup(resp.text, "html.parser")
            whole = soup.select_one("span.a-price-whole")
            orig = soup.select_one("span.a-text-price span.a-offscreen, span.basisPrice span.a-offscreen")
            p = parse_numeric_price(whole.get_text(strip=True).rstrip(".")) if whole else None
            m = parse_numeric_price(orig.get_text(strip=True)) if orig else None
            if not p:
                ld = extract_schema_org_jsonld(soup)
                if ld and ld.get("price"):
                    return ld, direct_url or target_url

            avail_elem = soup.select_one("#availability")
            in_stock = True
            if avail_elem and any(w in avail_elem.get_text().lower() for w in ["currently unavailable", "out of stock"]):
                in_stock = False
            if p and p > 0:
                return {
                    "price": p,
                    "originalPrice": m if (m and m >= p) else None,
                    "inStock": in_stock,
                    "stockStatus": "In Stock" if in_stock else "Out of Stock"
                }, direct_url or target_url

    return None, direct_url


def scrape_tira(client: HttpClient, url: str, name: str, brand: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url: Optional[str] = None
    slug_match = re.search(r"/product/([^/?#]+)", url)
    if slug_match:
        direct_url = f"https://www.tirabeauty.com/product/{slug_match.group(1)}"

    # Build search query
    query = ""
    parsed = urllib.parse.urlparse(url)
    qs = urllib.parse.parse_qs(parsed.query)
    if "q" in qs and qs["q"]:
        query = qs["q"][0]
    elif slug_match:
        query = slug_match.group(1).replace("-", " ")
    elif name:
        query = f"{brand} {name}".strip()

    if query:
        api_url = f"https://www.tirabeauty.com/ext/search/application/api/v1.0/products?q={urllib.parse.quote(query)}&page_size=5"
        headers = {
            "Accept": "application/json, text/plain, */*",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-IN,en;q=0.9",
            "Origin": "https://www.tirabeauty.com",
            "Referer": "https://www.tirabeauty.com/",
            "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
            "Sec-Ch-Ua-Mobile": "?0",
            "Sec-Ch-Ua-Platform": '"Windows"',
            "Sec-Fetch-Dest": "empty",
            "Sec-Fetch-Mode": "cors",
            "Sec-Fetch-Site": "same-origin",
        }
        resp = client.get(api_url, headers=headers)
        if resp and resp.status_code == 200:
            try:
                data = resp.json()
                items = data.get("items", []) or data.get("products", [])
                if items and isinstance(items, list):
                    matched_item = items[0]
                    brand_lower = brand.lower()
                    for it in items:
                        it_brand = str(it.get("brand", {}).get("name", "") if isinstance(it.get("brand"), dict) else it.get("brand", "")).lower()
                        it_name = str(it.get("name", "")).lower()
                        if brand_lower and (brand_lower in it_brand or brand_lower in it_name):
                            matched_item = it
                            break

                    slug = matched_item.get("slug")
                    if slug:
                        direct_url = f"https://www.tirabeauty.com/product/{slug}"

                    price_obj = matched_item.get("price", {})
                    eff = price_obj.get("effective", {}) if isinstance(price_obj, dict) else {}
                    marked = price_obj.get("marked", {}) if isinstance(price_obj, dict) else {}
                    p = parse_numeric_price(eff.get("min") or eff.get("max") if isinstance(eff, dict) else eff)
                    m = parse_numeric_price(marked.get("min") or marked.get("max") if isinstance(marked, dict) else marked)
                    in_stock = bool(matched_item.get("sellable", matched_item.get("is_in_stock", True)))
                    if p and p > 0:
                        return {
                            "price": p,
                            "originalPrice": m if (m and m >= p) else None,
                            "inStock": in_stock,
                            "stockStatus": "In Stock" if in_stock else "Out of Stock"
                        }, direct_url
            except Exception:
                pass

    if not direct_url and (is_search_url(url) or "/product/" not in url):
        direct_url = resolve_via_search_engine(client, "tirabeauty.com", brand, name, "/product/")

    target_url = direct_url or url
    resp = client.get(target_url)
    if resp and resp.status_code == 200 and resp.text:
        soup = BeautifulSoup(resp.text, "html.parser")
        ld = extract_schema_org_jsonld(soup)
        if ld and ld.get("price"):
            return ld, direct_url

    return None, direct_url


def scrape_purplle(client: HttpClient, url: str, name: str, brand: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url: Optional[str] = None
    slug_match = re.search(r"/product/([^/?#]+)", url)
    if slug_match:
        direct_url = f"https://www.purplle.com/product/{slug_match.group(1)}"

    # If it is a search URL, first parse search results for first organic card & price
    if is_search_url(url):
        headers = {
            "Accept-Language": "en-IN,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        }
        resp = client.get(url, headers=headers)
        if resp and resp.status_code == 200 and resp.text:
            soup = BeautifulSoup(resp.text, "html.parser")
            for a in soup.select('a[href*="/product/"], a[href*="/p/"], a[href*="/pr/"]'):
                href = a.get("href", "")
                classes = " ".join(a.get("class", []))
                if any(k in classes.lower() for k in ["ad", "sponsor", "promot"]):
                    continue
                if href and not href.startswith("#"):
                    direct_url = urllib.parse.urljoin("https://www.purplle.com", href)
                    break

    # If direct_url not resolved yet, use search engine fallback
    if not direct_url and (is_search_url(url) or "/product/" not in url):
        direct_url = resolve_via_search_engine(client, "purplle.com", brand, name, "/product/")

    target_url = direct_url or (url if not is_search_url(url) else None)
    if target_url:
        headers = {
            "Accept-Language": "en-IN,en;q=0.9",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        }
        resp = client.get(target_url, headers=headers)
        if resp and resp.status_code == 200 and resp.text:
            soup = BeautifulSoup(resp.text, "html.parser")
            ld = extract_schema_org_jsonld(soup)
            if ld and ld.get("price"):
                return ld, direct_url or target_url

            p_el = soup.select_one(".pd-price, .actual-price, span[class*='price'], span[data-price]")
            m_el = soup.select_one(".pd-mrp, .cut-price, span[class*='mrp']")
            p = parse_numeric_price(p_el.get_text(strip=True)) if p_el else None
            m = parse_numeric_price(m_el.get_text(strip=True)) if m_el else None
            if p and p > 0:
                in_stock = not any(w in soup.get_text().lower() for w in ["out of stock", "sold out", "currently unavailable"])
                return {
                    "price": p,
                    "originalPrice": m if (m and m >= p) else None,
                    "inStock": in_stock,
                    "stockStatus": "In Stock" if in_stock else "Out of Stock"
                }, direct_url or target_url

    return None, direct_url


def scrape_myntra(client: HttpClient, url: str, name: str, brand: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    direct_url: Optional[str] = None
    target_url = url

    if "/buy" not in url:
        resolved = resolve_via_search_engine(client, "myntra.com", brand, name, "/buy")
        if resolved:
            direct_url = resolved
            target_url = resolved

    headers = {
        "Accept-Language": "en-IN,en;q=0.9",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    }
    resp = client.get(target_url, headers=headers)
    if resp and resp.status_code == 200 and resp.text:
        html = resp.text
        idx = html.find("window.__myx = ")
        json_str = None
        if idx != -1:
            end = html.find("</script>", idx)
            if end != -1:
                json_str = html[idx + len("window.__myx = "):end].strip().rstrip(";")
        else:
            m = re.search(r"window\.__myx\s*=\s*(\{.*?\});\s*(?:</script>|window\.)", html, re.DOTALL)
            if m:
                json_str = m.group(1)

        if json_str:
            try:
                data = json.loads(json_str)
                if "pdpData" in data and isinstance(data["pdpData"], dict):
                    pdp = data["pdpData"]
                    direct_url = target_url
                    p_info = pdp.get("price", {})
                    p = parse_numeric_price(p_info.get("discounted") or p_info.get("price"))
                    m = parse_numeric_price(p_info.get("mrp"))
                    sizes = pdp.get("sizes", [])
                    in_stock = any(s.get("available") for s in sizes) if sizes else bool(pdp.get("inStock", True))
                    if p and p > 0:
                        return {
                            "price": p,
                            "originalPrice": m if (m and m >= p) else None,
                            "inStock": in_stock,
                            "stockStatus": "In Stock" if in_stock else "Out of Stock"
                        }, direct_url

                if "searchData" in data and isinstance(data["searchData"], dict):
                    prods = data["searchData"].get("results", {}).get("products", [])
                    if prods and isinstance(prods, list):
                        first = prods[0]
                        landing = first.get("landingPageUrl")
                        if landing:
                            direct_url = f"https://www.myntra.com/{landing.lstrip('/')}"
                        p = parse_numeric_price(first.get("price"))
                        m = parse_numeric_price(first.get("mrp"))
                        inv = first.get("inventoryInfo", [])
                        in_stock = any(i.get("available") for i in inv) if inv else not first.get("outOfStock", False)
                        if p and p > 0:
                            return {
                                "price": p,
                                "originalPrice": m if (m and m >= p) else None,
                                "inStock": in_stock,
                                "stockStatus": "In Stock" if in_stock else "Out of Stock"
                            }, direct_url
            except Exception:
                pass

    return None, direct_url


# ==============================================================================
# Worker Task & Main Orchestration
# ==============================================================================

def scrape_single_offer(item: Dict[str, Any], client: HttpClient) -> Dict[str, Any]:
    store_id = item["storeId"]
    url = item["purchaseUrl"]
    pname = item["productName"]
    pbrand = item["brand"]

    scraped: Optional[Dict[str, Any]] = None
    direct: Optional[str] = None

    if store_id == "nykaa":
        scraped, direct = scrape_nykaa(client, url, pname, pbrand)
    elif store_id == "amazon":
        scraped, direct = scrape_amazon(client, url, pname, pbrand)
    elif store_id == "tira":
        scraped, direct = scrape_tira(client, url, pname, pbrand)
    elif store_id == "purplle":
        scraped, direct = scrape_purplle(client, url, pname, pbrand)
    elif store_id == "myntra":
        scraped, direct = scrape_myntra(client, url, pname, pbrand)

    return {
        "productId": item["productId"],
        "storeId": store_id,
        "storeName": item["storeName"],
        "originalUrl": url,
        "directUrl": direct,
        "scrapedData": scraped,
        "baselinePrice": item["baselinePrice"],
        "baselineOrig": item["baselineOrig"],
        "baselineInStock": item["baselineInStock"],
    }


def render_progress_bar(completed: int, total: int, live_counts: Dict[str, int], pres_counts: Dict[str, int]) -> None:
    bar_len = 20
    frac = completed / total if total > 0 else 1.0
    filled = int(frac * bar_len)
    bar = "█" * filled + "░" * (bar_len - filled)
    pct = int(frac * 100)
    counts_str = (
        f"N:{live_counts.get('nykaa',0)}+{pres_counts.get('nykaa',0)} "
        f"A:{live_counts.get('amazon',0)}+{pres_counts.get('amazon',0)} "
        f"T:{live_counts.get('tira',0)}+{pres_counts.get('tira',0)} "
        f"P:{live_counts.get('purplle',0)}+{pres_counts.get('purplle',0)} "
        f"M:{live_counts.get('myntra',0)}+{pres_counts.get('myntra',0)}"
    )
    sys.stdout.write(f"\r[{bar}] {completed}/{total} ({pct}%) | Live+Preserved: {counts_str}")
    sys.stdout.flush()


def parse_products_catalogue(file_path: Path) -> List[Dict[str, Any]]:
    text = file_path.read_text(encoding="utf-8")
    products: List[Dict[str, Any]] = []
    chunks = text.split("\n  {\n    id: '")
    if len(chunks) <= 1:
        chunks = text.split('\n  {\n    id: "')

    for chunk in chunks[1:]:
        id_m = re.match(r"^([a-zA-Z0-9_-]+)", chunk)
        if not id_m:
            continue
        pid = id_m.group(1)
        name_m = re.search(r"name:\s*['\"]([^'\"]+)['\"]", chunk)
        brand_m = re.search(r"brand:\s*['\"]([^'\"]+)['\"]", chunk)
        price_m = re.search(r"price:\s*(\d+(?:\.\d+)?)", chunk)
        orig_m = re.search(r"originalPrice:\s*(\d+(?:\.\d+)?)", chunk)

        offers: List[Dict[str, Any]] = []
        so_m = re.search(r"storeOffers:\s*\[(.*?)\]\s*,?\n", chunk, re.DOTALL)
        if so_m:
            for entry in re.findall(r"\{([^{}]+)\}", so_m.group(1)):
                sid_m = re.search(r"storeId:\s*['\"]([^'\"]+)['\"]", entry)
                url_m = re.search(r"purchaseUrl:\s*['\"]([^'\"]+)['\"]", entry)
                sname_m = re.search(r"storeName:\s*['\"]([^'\"]+)['\"]", entry)
                p_m = re.search(r"price:\s*(\d+(?:\.\d+)?)", entry)
                op_m = re.search(r"originalPrice:\s*(\d+(?:\.\d+)?)", entry)
                ins_m = re.search(r"inStock:\s*(true|false)", entry)
                if sid_m and url_m:
                    offers.append({
                        "storeId": sid_m.group(1),
                        "storeName": sname_m.group(1) if sname_m else sid_m.group(1).title(),
                        "purchaseUrl": url_m.group(1),
                        "price": float(p_m.group(1)) if p_m else None,
                        "originalPrice": float(op_m.group(1)) if op_m else None,
                        "inStock": ins_m.group(1) == "true" if ins_m else True,
                    })

        products.append({
            "id": pid,
            "name": name_m.group(1) if name_m else pid,
            "brand": brand_m.group(1) if brand_m else "",
            "price": float(price_m.group(1)) if price_m else None,
            "originalPrice": float(orig_m.group(1)) if orig_m else None,
            "storeOffers": offers,
        })
    return products


def main() -> None:
    now_utc = datetime.now(timezone.utc)
    updated_at_iso = now_utc.strftime("%Y-%m-%dT%H:%M:%S.%fZ")
    updated_label_ist = format_ist_label(now_utc)

    print("\n" + "=" * 85)
    print(" PriceWise AI - Mobile Indian-IP Price Synchronizer (Termux/Mobile)")
    print(f" Timestamp : {updated_label_ist}")
    print(f" HTTP Mode : {'curl_cffi (Chrome 124 TLS)' if HAS_CURL_CFFI else 'requests (Chrome 124 User-Agent)'}")
    print(" Concurrency: ThreadPoolExecutor(max_workers=5)")
    print("=" * 85 + "\n")

    products = parse_products_catalogue(PRODUCTS_FILE)
    prev_snapshot: Dict[str, Any] = {}
    if SNAPSHOT_FILE.exists():
        try:
            with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
                prev_snapshot = json.load(f)
        except Exception:
            pass
    prev_products = prev_snapshot.get("products", {})

    # Flatten offers for thread pool
    tasks: List[Dict[str, Any]] = []
    for p in products:
        for off in p["storeOffers"]:
            tasks.append({
                "productId": p["id"],
                "productName": p["name"],
                "brand": p["brand"],
                "storeId": off["storeId"],
                "storeName": off["storeName"],
                "purchaseUrl": off["purchaseUrl"],
                "baselinePrice": off.get("price") or p.get("price"),
                "baselineOrig": off.get("originalPrice") or p.get("originalPrice"),
                "baselineInStock": off.get("inStock", True),
            })

    total_tasks = len(tasks)
    completed_tasks = 0
    live_counts: Dict[str, int] = {"nykaa": 0, "amazon": 0, "tira": 0, "purplle": 0, "myntra": 0}
    pres_counts: Dict[str, int] = {"nykaa": 0, "amazon": 0, "tira": 0, "purplle": 0, "myntra": 0}

    store_stats: Dict[str, Dict[str, int]] = {
        "nykaa": {"total": 0, "direct": 0, "live": 0, "preserved": 0, "pending": 0},
        "amazon": {"total": 0, "direct": 0, "live": 0, "preserved": 0, "pending": 0},
        "tira": {"total": 0, "direct": 0, "live": 0, "preserved": 0, "pending": 0},
        "purplle": {"total": 0, "direct": 0, "live": 0, "preserved": 0, "pending": 0},
        "myntra": {"total": 0, "direct": 0, "live": 0, "preserved": 0, "pending": 0},
    }

    # Group results by productId
    results_by_prod: Dict[str, Dict[str, Any]] = {
        p["id"]: {"productId": p["id"], "productName": p["name"], "brand": p["brand"], "offers": []}
        for p in products
    }

    client = HttpClient(timeout=12)

    with ThreadPoolExecutor(max_workers=5) as executor:
        future_map = {executor.submit(scrape_single_offer, t, client): t for t in tasks}
        for future in as_completed(future_map):
            completed_tasks += 1
            res = future.result()
            sid = res["storeId"]
            pid = res["productId"]
            direct_url = res["directUrl"]
            scraped = res["scrapedData"]

            if sid not in store_stats:
                store_stats[sid] = {"total": 0, "direct": 0, "live": 0, "preserved": 0, "pending": 0}
            store_stats[sid]["total"] += 1

            if direct_url and not is_search_url(direct_url):
                store_stats[sid]["direct"] += 1

            prev_prod_data = prev_products.get(pid, {})
            prev_offer_data = prev_prod_data.get(sid) or next(
                (o for o in prev_prod_data.get("offers", []) if str(o.get("storeId", "")).lower() == sid.lower()),
                None
            )

            # Check if previous offer was a verified live price
            prev_price = parse_numeric_price(prev_offer_data.get("price")) if prev_offer_data else None
            is_prev_valid_live = bool(
                prev_offer_data
                and prev_price
                and prev_price > 0
                and (
                    prev_offer_data.get("sourceType") in ["live", "cached", "verified_live"]
                    or prev_offer_data.get("status") in ["success", "preserved_from_previous"]
                )
            )

            # 1. Scrape Succeeded on this run
            if scraped and scraped.get("price") and scraped["price"] > 0:
                store_stats[sid]["live"] += 1
                live_counts[sid] = live_counts.get(sid, 0) + 1
                final_offer = {
                    "storeId": sid,
                    "storeName": res["storeName"],
                    "price": scraped["price"],
                    "originalPrice": scraped.get("originalPrice"),
                    "inStock": scraped.get("inStock", True),
                    "stockStatus": scraped.get("stockStatus", "In Stock"),
                    "purchaseUrl": direct_url or res["originalUrl"],
                    "resolvedUrl": direct_url,
                    "sourceType": "live",
                    "lastUpdated": updated_label_ist,
                    "lastChecked": updated_label_ist,
                    "status": "success",
                }

            # 2. Scrape failed/None, but valid live entry exists from previous run
            # NEVER overwrite a valid sourceType == 'live' entry with empty/fallback data!
            elif is_prev_valid_live and prev_offer_data:
                store_stats[sid]["preserved"] += 1
                pres_counts[sid] = pres_counts.get(sid, 0) + 1
                preserved_url = direct_url or prev_offer_data.get("resolvedUrl") or prev_offer_data.get("purchaseUrl") or res["originalUrl"]
                final_offer = {
                    "storeId": sid,
                    "storeName": res["storeName"],
                    "price": prev_offer_data["price"],
                    "originalPrice": prev_offer_data.get("originalPrice"),
                    "inStock": prev_offer_data.get("inStock", True),
                    "stockStatus": prev_offer_data.get("stockStatus", "In Stock"),
                    "purchaseUrl": preserved_url,
                    "resolvedUrl": direct_url or prev_offer_data.get("resolvedUrl"),
                    "sourceType": "live",
                    "lastUpdated": prev_offer_data.get("lastUpdated") or prev_offer_data.get("lastChecked") or updated_label_ist,
                    "lastChecked": updated_label_ist,
                    "status": "preserved_from_previous",
                    "preservedFrom": prev_offer_data.get("lastChecked") or prev_offer_data.get("lastUpdated") or updated_label_ist,
                }

            # 3. No live data and no previous live data -> Catalog baseline / Pending
            else:
                store_stats[sid]["pending"] += 1
                final_offer = {
                    "storeId": sid,
                    "storeName": res["storeName"],
                    "price": res["baselinePrice"],
                    "originalPrice": res["baselineOrig"],
                    "inStock": res["baselineInStock"],
                    "stockStatus": "In Stock" if res["baselineInStock"] else "Out of Stock",
                    "purchaseUrl": direct_url or res["originalUrl"],
                    "resolvedUrl": direct_url,
                    "sourceType": "demo",
                    "status": "pending_scrape",
                    "lastChecked": updated_label_ist,
                }

            results_by_prod[pid]["offers"].append(final_offer)
            results_by_prod[pid][sid] = final_offer

            render_progress_bar(completed_tasks, total_tasks, live_counts, pres_counts)

    print("\n\n" + "=" * 85)
    print(f" FINAL RETAILER LIVE PRICE SYNC SUMMARY ({updated_label_ist})")
    print("=" * 85)
    print(f" {'Retailer':<16} {'Offers':<10} {'Direct URLs':<14} {'Live Scraped':<14} {'Preserved':<12} {'Pending':<10}")
    print("-" * 85)

    display_names = {
        "nykaa": "Nykaa",
        "amazon": "Amazon India",
        "tira": "Tira Beauty",
        "purplle": "Purplle",
        "myntra": "Myntra",
    }
    tot_offers = sum(s["total"] for s in store_stats.values())
    tot_direct = sum(s["direct"] for s in store_stats.values())
    tot_live = sum(s["live"] for s in store_stats.values())
    tot_preserved = sum(s["preserved"] for s in store_stats.values())
    tot_pending = sum(s["pending"] for s in store_stats.values())

    for sid, label in display_names.items():
        st = store_stats.get(sid, {"total": 0, "direct": 0, "live": 0, "preserved": 0, "pending": 0})
        print(f" {label:<16} {st['total']:<10} {st['direct']:<14} {st['live']:<14} {st['preserved']:<12} {st['pending']:<10}")

    print("-" * 85)
    print(f" {'TOTAL':<16} {tot_offers:<10} {tot_direct:<14} {tot_live:<14} {tot_preserved:<12} {tot_pending:<10}")
    print("=" * 85 + "\n")

    snapshot_output = {
        "updatedAt": updated_at_iso,
        "updatedLabel": updated_label_ist,
        "totalProducts": len(products),
        "totalOffers": tot_offers,
        "scrapedSuccessCount": tot_live,
        "preservedCount": tot_preserved,
        "pendingCount": tot_pending,
        "products": results_by_prod,
    }

    SNAPSHOT_FILE.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = SNAPSHOT_FILE.with_suffix(".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(snapshot_output, f, indent=2, ensure_ascii=False)
    tmp_path.replace(SNAPSHOT_FILE)
    print(f"✓ Updated snapshot written to {SNAPSHOT_FILE.relative_to(REPO_ROOT)}\n")


if __name__ == "__main__":
    main()
