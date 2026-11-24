interface ProductIdentity {
  name: string;
  brand: string;
  officialUrl?: string;
}

const stores: Record<string, { host: string; search: (query: string) => string }> = {
  nykaa: { host: 'nykaa.com', search: (q) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}` },
  tira: { host: 'tirabeauty.com', search: (q) => `https://www.tirabeauty.com/search?q=${encodeURIComponent(q)}` },
  purplle: { host: 'purplle.com', search: (q) => `https://www.purplle.com/search?q=${encodeURIComponent(q)}` },
  myntra: { host: 'myntra.com', search: (q) => `https://www.myntra.com/${encodeURIComponent(q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}` },
  amazon: { host: 'amazon.in', search: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
};

function storeKey(retailer: string) {
  const key = retailer.toLowerCase().replace(/[^a-z]/g, '');
  return key === 'amazonindia' ? 'amazon' : key;
}

/** Keep product URLs on their named retailer; replace homepage or invalid links with an exact-name search. */
export function getRetailerProductUrl(product: ProductIdentity, retailer: string, candidate?: string): string {
  const store = stores[storeKey(retailer)];
  const query = `${product.brand} ${product.name}`.trim();
  if (!store) return product.officialUrl || stores.nykaa.search(query);
  try {
    const url = new URL(candidate || '');
    const host = url.hostname.replace(/^www\./, '');
    if (url.protocol === 'https:' && (host === store.host || host.endsWith(`.${store.host}`)) && url.pathname !== '/') {
      return url.href;
    }
  } catch {
    // A missing or malformed URL needs a product-specific destination.
  }
  return store.search(query);
}

export function isProductSearchUrl(candidate: string): boolean {
  try {
    const url = new URL(candidate);
    return ['q', 'k', 'search', 'text'].some((key) => url.searchParams.has(key))
      || (url.hostname.endsWith('myntra.com') && url.pathname.split('/').filter(Boolean).length === 1);
  } catch {
    return false;
  }
}
