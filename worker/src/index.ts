/**
 * PriceWise Beauty - Cloudflare Worker Edge Search & Live Price Comparison API
 *
 * Provides GET /compare?q=<query> with CORS enabled.
 * Concurrently queries live product matches and INR (₹) prices across:
 * - Tira Beauty (Reliance Beauty Luxe)
 * - Nykaa (Beauty & Cosmetics)
 * - Amazon India (Beauty Store)
 * - Purplle (Budget & K-Beauty)
 * - Myntra (Fashion & Beauty)
 *
 * Merges live web results with the GitHub live-prices.json snapshot fallback to guarantee zero empty states.
 * Returns normalized, lowest-price-first JSON.
 */

export interface RetailerCompareResult {
  retailer: string;
  title: string;
  productTitle?: string; // backwards compatibility alias
  imageUrl: string | null;
  price: number;
  mrp: number | null;
  discountPercent: number;
  inStock: boolean;
  url: string;
  productUrl?: string; // backwards compatibility alias
  source: 'live' | 'snapshot';
  updatedAt: string;
}

export interface CompareApiResponse {
  query: string;
  updatedAt: string;
  bestPrice: number | null;
  results: RetailerCompareResult[];
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const COMMON_BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'en-IN,en;q=0.9',
  'Accept':
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,application/json,*/*;q=0.8',
};

/**
 * Universal price string cleaner & parser (e.g. "₹599", "Rs. 1,499.00", "599")
 */
function parsePrice(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isFinite(val) && val > 0 ? Math.round(val) : null;
  }
  const str = String(val).replace(/\xa0/g, ' ').replace(/,/g, '').trim();
  const match = str.match(/(?:₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)/i);
  if (match) {
    const num = parseFloat(match[1]);
    return !isNaN(num) && num > 0 ? Math.round(num) : null;
  }
  return null;
}

/**
 * Extract price and MRP from freeform search snippet text
 */
function extractPricesFromText(text: string): { price: number | null; mrp: number | null } {
  let mrp: number | null = null;
  let price: number | null = null;

  // Search for explicit MRP patterns first
  const mrpMatch = text.match(/(?:m\.?r\.?p\.?|original price|was|list price)[\s:₹rs\.]*([\d,]+)/i);
  if (mrpMatch) {
    mrp = parsePrice(mrpMatch[1]);
  }

  // Find all currency occurrences
  const matches = [...text.matchAll(/(?:₹|rs\.?|inr)\s*([\d,]+)/gi)];
  for (const m of matches) {
    const val = parsePrice(m[1]);
    if (val && val !== mrp) {
      price = val;
      break;
    }
  }

  if (!price && matches.length > 0) {
    price = parsePrice(matches[0][1]);
  }

  if (price && mrp && mrp < price) {
    // Swap if inverted
    const temp = price;
    price = mrp;
    mrp = temp;
  }

  return { price, mrp };
}

/**
 * Multi-layer web search snippet extraction: DuckDuckGo -> Yahoo Search -> Bing RSS
 */
async function fetchWebSnippets(
  query: string
): Promise<Array<{ url: string; title: string; snippet: string }>> {
  const results: Array<{ url: string; title: string; snippet: string }> = [];

  // 1. DuckDuckGo HTML with 4.5s timeout
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const resp = await fetch(ddgUrl, {
      headers: COMMON_BROWSER_HEADERS,
      signal: AbortSignal.timeout(4500),
      cf: { cacheTtl: 900, cacheEverything: true },
    } as any);
    if (resp.ok) {
      const html = await resp.text();
      const regex =
        /<h2[^>]*class="[^"]*result__title[^"]*"[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(html)) !== null) {
        const rawUrl = match[1];
        const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
        const url = uddgMatch ? decodeURIComponent(uddgMatch[1]) : rawUrl;
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const snippet = match[3].replace(/<[^>]+>/g, '').trim();
        if (url.startsWith('http')) {
          results.push({ url, title, snippet });
        }
      }
    }
  } catch {
    // Fallback to Yahoo
  }

  // 2. Yahoo Search Fallback if DDG returned no results
  if (results.length === 0) {
    try {
      const yahooUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
      const resp = await fetch(yahooUrl, {
        headers: COMMON_BROWSER_HEADERS,
        signal: AbortSignal.timeout(4500),
        cf: { cacheTtl: 900, cacheEverything: true },
      } as any);
      if (resp.ok) {
        const html = await resp.text();
        const regex =
          /<h3[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<div[^>]*class="[^"]*compText[^"]*"[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/gi;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(html)) !== null) {
          const rawUrl = match[1];
          const ruMatch = rawUrl.match(/\/RU=([^/]+)/);
          const url = ruMatch ? decodeURIComponent(ruMatch[1]) : rawUrl;
          const title = match[2].replace(/<[^>]+>/g, '').trim();
          const snippet = match[3].replace(/<[^>]+>/g, '').trim();
          if (url.startsWith('http')) {
            results.push({ url, title, snippet });
          }
        }
      }
    } catch {
      // Fallback to Bing RSS
    }
  }

  // 3. Bing RSS Fallback
  if (results.length === 0) {
    try {
      const bingRss = `https://www.bing.com/search?q=${encodeURIComponent(query)}&format=rss`;
      const resp = await fetch(bingRss, {
        headers: COMMON_BROWSER_HEADERS,
        signal: AbortSignal.timeout(4500),
        cf: { cacheTtl: 900, cacheEverything: true },
      } as any);
      if (resp.ok) {
        const xml = await resp.text();
        const itemRegex =
          /<item>[\s\S]*?<title>([\s\S]*?)<\/title>[\s\S]*?<link>([\s\S]*?)<\/link>[\s\S]*?<description>([\s\S]*?)<\/description>[\s\S]*?<\/item>/gi;
        let m: RegExpExecArray | null;
        while ((m = itemRegex.exec(xml)) !== null) {
          const title = m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
          const url = m[2].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
          const snippet = m[3].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
          if (url.startsWith('http')) {
            results.push({ url, title, snippet });
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return results;
}

/**
 * Fetch verified snapshot prices from GitHub raw live-prices.json
 */
async function fetchCatalogMatches(query: string): Promise<RetailerCompareResult[]> {
  try {
    const rawUrl =
      'https://raw.githubusercontent.com/master2007-star/beauty/main/frontend/public/data/live-prices.json';
    const resp = await fetch(rawUrl, {
      signal: AbortSignal.timeout(4500),
      cf: { cacheTtl: 600, cacheEverything: true },
    } as any);
    if (!resp.ok) return [];

    const data = (await resp.json()) as any;
    const products = Object.values(data.products || {}) as any[];
    const tokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 1);
    if (tokens.length === 0) return [];

    let bestProduct: any = null;
    let bestScore = 0;

    for (const prod of products) {
      const hay = `${prod.brand || ''} ${prod.productName || ''}`.toLowerCase();
      let matched = 0;
      for (const tok of tokens) {
        if (hay.includes(tok)) matched++;
      }
      const score = matched / tokens.length;
      if (matched > 0 && score >= 0.4 && score > bestScore) {
        bestScore = score;
        bestProduct = prod;
      }
    }

    if (!bestProduct || !Array.isArray(bestProduct.offers)) return [];

    const out: RetailerCompareResult[] = [];
    for (const offer of bestProduct.offers) {
      const price = parsePrice(offer.price);
      if (!price) continue;
      const mrp = parsePrice(offer.originalPrice);
      const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;

      const storeMap: Record<string, string> = {
        nykaa: 'Nykaa',
        tira: 'Tira Beauty',
        amazon: 'Amazon India',
        purplle: 'Purplle',
        myntra: 'Myntra',
      };
      const retailer =
        storeMap[String(offer.storeId || '').toLowerCase()] || offer.storeName || 'Store';
      const cleanTitle = `${bestProduct.brand ? bestProduct.brand + ' ' : ''}${
        bestProduct.productName || query
      }`.trim();
      const directUrl = offer.purchaseUrl || offer.resolvedUrl || '';

      out.push({
        retailer,
        title: cleanTitle,
        productTitle: cleanTitle,
        imageUrl: offer.imageUrl || bestProduct.imageUrl || null,
        price,
        mrp,
        discountPercent,
        url: directUrl,
        productUrl: directUrl,
        inStock: offer.inStock !== false,
        source: 'snapshot',
        updatedAt: offer.lastUpdated || offer.lastChecked || data.updatedAt || new Date().toISOString(),
      });
    }
    return out;
  } catch {
    return [];
  }
}

// ==============================================================================
// Store Handlers
// ==============================================================================

/**
 * 1. Tira Beauty: Search API with HTML snippet fallback
 */
async function fetchTira(query: string): Promise<RetailerCompareResult | null> {
  const directSearchUrl = `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}`;

  // 1. Tira Public JSON Search API with timeout
  try {
    const apiUrl = `https://www.tirabeauty.com/ext/search/application/api/v1.0/products?q=${encodeURIComponent(
      query
    )}&page_size=3`;
    const resp = await fetch(apiUrl, {
      headers: {
        ...COMMON_BROWSER_HEADERS,
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.tirabeauty.com',
        'Referer': 'https://www.tirabeauty.com/',
      },
      signal: AbortSignal.timeout(4500),
      cf: { cacheTtl: 900, cacheEverything: true },
    } as any);

    if (resp.ok) {
      const data = (await resp.json()) as any;
      const items = data.items || data.products || [];
      if (Array.isArray(items) && items.length > 0) {
        const item = items[0];
        const price = parsePrice(
          item.price?.effective?.min ??
            item.price?.effective?.max ??
            item.price?.effective ??
            item.price?.min
        );
        const mrp = parsePrice(
          item.price?.marked?.min ??
            item.price?.marked?.max ??
            item.price?.marked
        );
        const title = item.name || `${item.brand?.name || 'Tira'} ${query}`.trim();
        const slug = item.slug;
        const imageUrl =
          item.medias?.[0]?.url ||
          item.images?.[0] ||
          item.media?.[0]?.url ||
          null;
        const inStock = item.sellable ?? item.is_in_stock ?? true;

        if (price && price > 0) {
          const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
          const url = slug ? `https://www.tirabeauty.com/product/${slug}` : directSearchUrl;
          return {
            retailer: 'Tira Beauty',
            title,
            productTitle: title,
            imageUrl,
            price,
            mrp: mrp && mrp >= price ? mrp : null,
            discountPercent,
            url,
            productUrl: url,
            inStock,
            source: 'live',
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Fall back to snippets
  }

  // 2. Search snippet fallback for Tira
  try {
    const snippets = await fetchWebSnippets(`site:tirabeauty.com/product/ ${query}`);
    for (const s of snippets) {
      if (s.url.includes('tirabeauty.com/product/')) {
        const { price, mrp } = extractPricesFromText(`${s.title} ${s.snippet}`);
        const slugMatch = s.url.match(/tirabeauty\.com\/product\/([^/?#&]+)/);
        const cleanUrl = slugMatch
          ? `https://www.tirabeauty.com/product/${slugMatch[1]}`
          : s.url;
        const cleanTitle = s.title.replace(/[\-–|]\s*Tira.*$/i, '').trim();

        if (price && price > 0) {
          const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
          return {
            retailer: 'Tira Beauty',
            title: cleanTitle || query,
            productTitle: cleanTitle || query,
            imageUrl: null,
            price,
            mrp: mrp && mrp >= price ? mrp : null,
            discountPercent,
            url: cleanUrl,
            productUrl: cleanUrl,
            inStock: !s.snippet.toLowerCase().includes('out of stock'),
            source: 'live',
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * 2. Nykaa: Search API + Search snippets for /p/ links
 */
async function fetchNykaa(query: string): Promise<RetailerCompareResult | null> {
  const directSearchUrl = `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}`;

  // 1. Nykaa App API with timeout
  try {
    const apiUrl = `https://www.nykaa.com/app-api/index.php/products/search?q=${encodeURIComponent(
      query
    )}&page=1`;
    const resp = await fetch(apiUrl, {
      headers: {
        ...COMMON_BROWSER_HEADERS,
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1',
        'Origin': 'https://www.nykaa.com',
        'Referer': 'https://www.nykaa.com/',
      },
      signal: AbortSignal.timeout(4500),
      cf: { cacheTtl: 900, cacheEverything: true },
    } as any);

    if (resp.ok) {
      const data = (await resp.json()) as any;
      const respObj = data.response || {};
      const products = respObj.products || respObj.items || [];
      if (Array.isArray(products) && products.length > 0) {
        const p = products[0];
        const price = parsePrice(
          p.final_price || p.offer_price || p.discounted_price || p.price
        );
        const mrp = parsePrice(p.mrp || p.price);
        const title = p.title || p.name || query;
        const slug = p.slug || (p.id ? `p/${p.id}` : null);
        const imageUrl = p.imageUrl || p.media?.[0]?.url || null;
        const inStock = p.is_saleable ?? p.in_stock ?? true;

        if (price && price > 0) {
          const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
          const url = slug
            ? slug.startsWith('http')
              ? slug
              : `https://www.nykaa.com/${slug.replace(/^\//, '')}`
            : directSearchUrl;
          return {
            retailer: 'Nykaa',
            title,
            productTitle: title,
            imageUrl,
            price,
            mrp: mrp && mrp >= price ? mrp : null,
            discountPercent,
            url,
            productUrl: url,
            inStock,
            source: 'live',
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Fall back to snippets
  }

  // 2. Search snippet fallback for Nykaa /p/ products
  try {
    const snippets = await fetchWebSnippets(`site:nykaa.com/p/ ${query}`);
    for (const s of snippets) {
      if (s.url.includes('nykaa.com') && s.url.includes('/p/')) {
        const { price, mrp } = extractPricesFromText(`${s.title} ${s.snippet}`);
        const pMatch = s.url.match(/(https:\/\/www\.nykaa\.com\/[^?#&]*\/p\/\d+)/);
        const cleanUrl = pMatch ? pMatch[1] : s.url;
        const cleanTitle = s.title.replace(/[\-–|]\s*Nykaa.*$/i, '').trim();

        if (price && price > 0) {
          const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
          return {
            retailer: 'Nykaa',
            title: cleanTitle || query,
            productTitle: cleanTitle || query,
            imageUrl: null,
            price,
            mrp: mrp && mrp >= price ? mrp : null,
            discountPercent,
            url: cleanUrl,
            productUrl: cleanUrl,
            inStock: !s.snippet.toLowerCase().includes('out of stock'),
            source: 'live',
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * 3. Amazon India: Search snippets for /dp/ ASIN links
 */
async function fetchAmazon(query: string): Promise<RetailerCompareResult | null> {
  try {
    const snippets = await fetchWebSnippets(`site:amazon.in/dp/ ${query}`);
    for (const s of snippets) {
      const asinMatch = s.url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
      if (asinMatch) {
        const asin = asinMatch[1].toUpperCase();
        const { price, mrp } = extractPricesFromText(`${s.title} ${s.snippet}`);
        const cleanTitle = s.title
          .replace(/[\-–|]\s*Amazon(\.in)?.*$/i, '')
          .replace(/Amazon\.in\s*:\s*/i, '')
          .trim();

        if (price && price > 0) {
          const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
          const url = `https://www.amazon.in/dp/${asin}`;
          return {
            retailer: 'Amazon India',
            title: cleanTitle || query,
            productTitle: cleanTitle || query,
            imageUrl: null,
            price,
            mrp: mrp && mrp >= price ? mrp : null,
            discountPercent,
            url,
            productUrl: url,
            inStock: !s.snippet.toLowerCase().includes('currently unavailable'),
            source: 'live',
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * 4. Purplle: Search API / Search snippets for /product/ links
 */
async function fetchPurplle(query: string): Promise<RetailerCompareResult | null> {
  // 1. Purplle Search API with timeout
  try {
    const apiUrl = `https://www.purplle.com/api/v1/search?query=${encodeURIComponent(query)}`;
    const resp = await fetch(apiUrl, {
      headers: COMMON_BROWSER_HEADERS,
      signal: AbortSignal.timeout(4500),
      cf: { cacheTtl: 900, cacheEverything: true },
    } as any);

    if (resp.ok) {
      const data = (await resp.json()) as any;
      const products = data.products || data.data?.products || [];
      if (Array.isArray(products) && products.length > 0) {
        const p = products[0];
        const price = parsePrice(p.offer_price || p.price || p.special_price);
        const mrp = parsePrice(p.mrp || p.price);
        const title = p.name || p.title || query;
        const slug = p.slug || p.url_key;
        if (price && price > 0) {
          const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
          const url = slug ? `https://www.purplle.com/product/${slug}` : `https://www.purplle.com/search?q=${encodeURIComponent(query)}`;
          return {
            retailer: 'Purplle',
            title,
            productTitle: title,
            imageUrl: p.image_url || p.media?.[0]?.url || null,
            price,
            mrp: mrp && mrp >= price ? mrp : null,
            discountPercent,
            url,
            productUrl: url,
            inStock: p.in_stock !== false,
            source: 'live',
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Continue to snippet search
  }

  // 2. Search snippets for Purplle
  try {
    const snippets = await fetchWebSnippets(`site:purplle.com/product/ ${query}`);
    for (const s of snippets) {
      if (s.url.includes('purplle.com/product/')) {
        const { price, mrp } = extractPricesFromText(`${s.title} ${s.snippet}`);
        const slugMatch = s.url.match(/purplle\.com\/product\/([^/?#&]+)/);
        const cleanUrl = slugMatch
          ? `https://www.purplle.com/product/${slugMatch[1]}`
          : s.url;
        const cleanTitle = s.title
          .replace(/[\-–|]\s*Purplle.*$/i, '')
          .replace(/Purplle\.com\s*:\s*/i, '')
          .trim();

        if (price && price > 0) {
          const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
          return {
            retailer: 'Purplle',
            title: cleanTitle || query,
            productTitle: cleanTitle || query,
            imageUrl: null,
            price,
            mrp: mrp && mrp >= price ? mrp : null,
            discountPercent,
            url: cleanUrl,
            productUrl: cleanUrl,
            inStock: !s.snippet.toLowerCase().includes('sold out'),
            source: 'live',
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

/**
 * 5. Myntra: Search snippets for /buy links
 */
async function fetchMyntra(query: string): Promise<RetailerCompareResult | null> {
  try {
    const snippets = await fetchWebSnippets(`site:myntra.com ${query}`);
    for (const s of snippets) {
      if (s.url.includes('myntra.com') && (s.url.includes('/buy') || /\/\d+(\/|$)/.test(s.url))) {
        const { price, mrp } = extractPricesFromText(`${s.title} ${s.snippet}`);
        const cleanTitle = s.title
          .replace(/[\-–|]\s*Myntra.*$/i, '')
          .replace(/^Buy\s+/i, '')
          .trim();
        const buyMatch = s.url.match(/(https:\/\/www\.myntra\.com\/[^?#&]*\/buy)/);
        const cleanUrl = buyMatch ? buyMatch[1] : s.url;

        if (price && price > 0) {
          const discountPercent = mrp && mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
          return {
            retailer: 'Myntra',
            title: cleanTitle || query,
            productTitle: cleanTitle || query,
            imageUrl: null,
            price,
            mrp: mrp && mrp >= price ? mrp : null,
            discountPercent,
            url: cleanUrl,
            productUrl: cleanUrl,
            inStock: !s.snippet.toLowerCase().includes('out of stock'),
            source: 'live',
            updatedAt: new Date().toISOString(),
          };
        }
      }
    }
  } catch {
    // Ignore
  }

  return null;
}

// ==============================================================================
// Cloudflare Worker Fetch Handler
// ==============================================================================

export default {
  async fetch(request: Request): Promise<Response> {
    // Handle CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);

    // Root status & Health Check
    if (url.pathname === '/' || url.pathname === '/health') {
      return new Response(
        JSON.stringify(
          {
            status: 'ok',
            service: 'PriceWise Beauty 5-Store Edge Compare API',
            version: '2.0.0',
            runtime: 'Cloudflare Worker (Edge)',
            endpoint: '/compare?q=<query>',
            supportedRetailers: [
              'Tira Beauty',
              'Nykaa',
              'Amazon India',
              'Purplle',
              'Myntra',
            ],
            resilience: [
              'Direct Store Search APIs with 4.5s timeouts',
              'Multi-layer snippet fallback (DuckDuckGo -> Yahoo -> Bing RSS)',
              'GitHub Raw live-prices.json catalog merge (zero empty states)',
            ],
          },
          null,
          2
        ),
        {
          status: 200,
          headers: {
            ...CORS_HEADERS,
            'Content-Type': 'application/json; charset=utf-8',
          },
        }
      );
    }

    // Live 5-Store Product Compare Endpoint: /compare?q=<query>
    if (url.pathname === '/compare') {
      const q = (url.searchParams.get('q') || '').trim();
      if (!q) {
        return new Response(
          JSON.stringify({
            error: "Query parameter 'q' is required. Example: /compare?q=Minimalist+Niacinamide",
          }),
          {
            status: 400,
            headers: {
              ...CORS_HEADERS,
              'Content-Type': 'application/json; charset=utf-8',
            },
          }
        );
      }

      // Concurrently query all 5 retailers with 4.5s max timeouts
      const [tiraRes, nykaaRes, amazonRes, purplleRes, myntraRes, catalogMatches] =
        await Promise.all([
          fetchTira(q).catch(() => null),
          fetchNykaa(q).catch(() => null),
          fetchAmazon(q).catch(() => null),
          fetchPurplle(q).catch(() => null),
          fetchMyntra(q).catch(() => null),
          fetchCatalogMatches(q).catch(() => []),
        ]);

      const results: RetailerCompareResult[] = [];
      const seenRetailers = new Set<string>();

      const addResult = (res: RetailerCompareResult | null) => {
        if (!res || !res.price || res.price <= 0) return;
        const key = res.retailer.toLowerCase();
        if (!seenRetailers.has(key)) {
          results.push(res);
          seenRetailers.add(key);
        }
      };

      // Add live results first
      addResult(tiraRes);
      addResult(nykaaRes);
      addResult(amazonRes);
      addResult(purplleRes);
      addResult(myntraRes);

      // Merge verified catalog snapshot offers for any missing retailers to guarantee zero empty states
      for (const item of catalogMatches) {
        addResult(item);
      }

      // Calculate lowest valid in-stock price
      const inStockOffers = results.filter((r) => r.inStock && r.price > 0);
      const bestPrice =
        inStockOffers.length > 0
          ? Math.min(...inStockOffers.map((r) => r.price))
          : results.length > 0
          ? results[0].price
          : null;

      // Sort by price ascending (lowest price first)
      results.sort((a, b) => a.price - b.price);

      const responsePayload: CompareApiResponse = {
        query: q,
        updatedAt: new Date().toISOString(),
        bestPrice,
        results,
      };

      return new Response(JSON.stringify(responsePayload, null, 2), {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=600, s-maxage=1800',
        },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Not Found', path: url.pathname }),
      {
        status: 404,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'application/json; charset=utf-8',
        },
      }
    );
  },
};
