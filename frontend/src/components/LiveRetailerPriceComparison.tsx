import { useEffect, useMemo, useState } from 'react';
import { Check, Clock3, ExternalLink, Medal, Store } from 'lucide-react';
import type { Product } from '../types';

interface CompareResult {
  retailer: string;
  price: number;
  mrp: number | null;
  inStock: boolean;
  url: string;
  source: 'live' | 'snapshot';
  updatedAt: string;
}
interface CompareResponse { results?: CompareResult[]; }
interface OfferRow { id: string; name: string; price: number; mrp?: number; inStock: boolean; url: string; source: string; updatedAt: string; }
const STORES = [
  { id: 'tira', name: 'Tira Beauty' },
  { id: 'nykaa', name: 'Nykaa' },
  { id: 'amazon', name: 'Amazon India' },
  { id: 'purplle', name: 'Purplle' },
  { id: 'myntra', name: 'Myntra' },
];
function storeId(value: string) {
  const name = value.toLowerCase();
  if (name.includes('amazon')) return 'amazon';
  if (name.includes('tira')) return 'tira';
  if (name.includes('nykaa')) return 'nykaa';
  if (name.includes('purplle')) return 'purplle';
  if (name.includes('myntra')) return 'myntra';
  return name;
}
function searchUrl(id: string, query: string) {
  const encoded = encodeURIComponent(query);
  if (id === 'tira') return `https://www.tirabeauty.com/search?q=${encoded}`;
  if (id === 'nykaa') return `https://www.nykaa.com/search/result/?q=${encoded}`;
  if (id === 'amazon') return `https://www.amazon.in/s?k=${encoded}`;
  if (id === 'purplle') return `https://www.purplle.com/search?q=${encoded}`;
  return `https://www.myntra.com/${query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}
function isSearchUrl(url: string) { return /\/search|[?&](q|k)=/i.test(url); }
function snapshotTime(value?: string) {
  if (!value) return 'Price snapshot';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function LiveRetailerPriceComparison({ product }: { product: Product }) {
  const [apiResults, setApiResults] = useState<CompareResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const base = (import.meta.env.VITE_COMPARE_API_URL || 'https://pricewise-compare.a4megaboi.workers.dev').replace(/\/$/, '');
    setLoading(true);
    fetch(`${base}/compare?q=${encodeURIComponent(`${product.brand} ${product.name}`)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<CompareResponse & { updatedAt?: string }> : Promise.reject(new Error('Comparison unavailable')))
      .then((data) => {
        setApiResults(Array.isArray(data.results) ? data.results : []);
        setCheckedAt(data.updatedAt || null);
      })
      .catch(() => { if (!controller.signal.aborted) setApiResults([]); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [product.brand, product.name]);

  const rows = useMemo(() => {
    const byStore = new Map<string, OfferRow>();
    for (const offer of product.storeOffers) {
      const id = storeId(offer.storeId || offer.storeName);
      byStore.set(id, { id, name: STORES.find((store) => store.id === id)?.name || offer.storeName, price: offer.price || 0, mrp: offer.originalPrice || undefined, inStock: offer.inStock, url: offer.purchaseUrl || '', source: offer.sourceType || 'catalogue', updatedAt: offer.lastUpdated || '' });
    }
    for (const result of apiResults) {
      const id = storeId(result.retailer);
      if (!STORES.some((store) => store.id === id)) continue;
      byStore.set(id, { id, name: STORES.find((store) => store.id === id)!.name, price: Number(result.price) || 0, mrp: result.mrp || undefined, inStock: Boolean(result.inStock), url: result.url || '', source: result.source || 'live', updatedAt: result.updatedAt || checkedAt || '' });
    }
    return STORES.map((store) => byStore.get(store.id) || { id: store.id, name: store.name, price: 0, inStock: false, url: '', source: 'unavailable', updatedAt: '' }).sort((a, b) => {
      const aAvailable = a.inStock && a.price > 0;
      const bAvailable = b.inStock && b.price > 0;
      if (aAvailable !== bAvailable) return aAvailable ? -1 : 1;
      return (a.price > 0 ? a.price : Number.MAX_SAFE_INTEGER) - (b.price > 0 ? b.price : Number.MAX_SAFE_INTEGER);
    });
  }, [product.storeOffers, apiResults, checkedAt]);
  const available = rows.filter((row) => row.inStock && row.price > 0);
  const best = available[0];
  const highest = available.reduce((max, row) => Math.max(max, row.price), 0);
  const savings = best && highest > best.price ? highest - best.price : 0;

  return (
    <section aria-labelledby="comparison-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div><p className="text-[9px] font-bold uppercase tracking-[.17em] text-rose">The price edit</p><h2 id="comparison-heading" className="mt-1 font-editorial text-[30px] font-semibold leading-none sm:text-[34px]">Compare five stores</h2></div>
        <span className="hidden items-center gap-1.5 text-[10px] text-taupe sm:flex"><span className={`h-1.5 w-1.5 rounded-full ${loading ? 'animate-pulse bg-rose' : 'bg-emerald'}`} />{loading ? 'Checking listings' : 'Comparison updated'}</span>
      </div>
      <div className="rounded-2xl border border-emerald/20 bg-emerald-tint px-4 py-4 sm:px-5">
        {best ? <><p className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald">Best available price</p><div className="mt-1 flex flex-wrap items-baseline gap-x-2"><strong className="text-[23px] font-bold tabular-nums text-emerald sm:text-[27px]">₹{best.price.toLocaleString('en-IN')}</strong><span className="text-xs font-semibold text-espresso">at {best.name}</span>{savings > 0 && <span className="text-[10px] text-emerald">Save ₹{savings.toLocaleString('en-IN')} vs highest listed price</span>}</div></> : <><p className="text-[9px] font-bold uppercase tracking-[.15em] text-emerald">Retailer listings</p><p className="mt-1 text-xs font-semibold text-espresso">Check current price and availability with each store.</p></>}
      </div>
      <div className="space-y-2.5">
        {rows.map((row, index) => {
          const bestDeal = Boolean(best && row.id === best.id);
          const hasPrice = row.price > 0;
          const direct = row.url && !isSearchUrl(row.url);
          const href = direct ? row.url : row.url || searchUrl(row.id, `${product.brand} ${product.name}`);
          const discount = row.mrp && hasPrice && row.mrp > row.price ? Math.round((row.mrp - row.price) / row.mrp * 100) : 0;
          const status = !hasPrice || row.source === 'unavailable' ? 'Check store' : row.source === 'demo' || row.source === 'catalogue' ? 'Catalog reference' : row.inStock ? 'In stock' : 'Out of stock';
          return (
            <article key={row.id} className={`rounded-2xl border bg-white p-3.5 transition-colors sm:p-4 ${bestDeal ? 'border-emerald/45 shadow-[0_8px_24px_-17px_rgba(22,101,75,.65)]' : 'border-line hover:border-rose/30'}`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${bestDeal ? 'bg-emerald-tint text-emerald' : 'bg-champagne text-rose'}`}><Store aria-hidden="true" className="h-4 w-4" /></span>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-1.5"><h3 className="text-xs font-bold text-espresso sm:text-[13px]">{row.name}</h3>{bestDeal && <span className="inline-flex items-center gap-1 rounded-full bg-emerald px-2 py-1 text-[8px] font-bold tracking-[.1em] text-white"><Medal className="h-3 w-3" />BEST DEAL</span>}</div><p className={`mt-1 text-[9px] font-semibold ${status === 'In stock' ? 'text-emerald' : 'text-taupe'}`}>{status}</p></div>
                </div>
                <div className="ml-auto text-right">
                  {hasPrice ? <div className="flex items-baseline justify-end gap-1.5"><strong className="text-[17px] font-bold tabular-nums text-espresso sm:text-[19px]">₹{row.price.toLocaleString('en-IN')}</strong>{row.mrp && row.mrp > row.price && <s className="text-[10px] tabular-nums text-taupe">₹{row.mrp.toLocaleString('en-IN')}</s>}</div> : <span className="text-[10px] font-semibold text-taupe">Price not indexed</span>}
                  {discount > 0 && <span className="mt-0.5 block text-[9px] font-bold text-emerald">{discount}% off</span>}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-line/80 pt-3">
                <span className="flex min-w-0 items-center gap-1 truncate text-[9px] text-taupe"><Clock3 aria-hidden="true" className="h-3 w-3 shrink-0" />{row.updatedAt ? snapshotTime(row.updatedAt) : hasPrice ? 'Catalogue price' : 'No listing indexed'}{row.source === 'snapshot' ? ' · snapshot' : row.source === 'live' ? ' · live' : ''}</span>
                <a href={href} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-full px-3 text-[9px] font-bold transition-colors sm:px-4 sm:text-[10px] ${bestDeal ? 'bg-emerald text-white hover:bg-[#10543D]' : 'bg-espresso text-white hover:bg-rose'}`}>
                  {direct ? 'Buy on' : 'Search on'} {row.name}<ExternalLink aria-hidden="true" className="h-3 w-3" />
                </a>
              </div>
              {index === 0 && !bestDeal && best && <span className="sr-only"><Check />Best available price is {best.name}</span>}
            </article>
          );
        })}
      </div>
      <p className="text-[9px] leading-4 text-taupe">Prices and stock can change. Confirm the final total, product size and seller with the retailer before purchase.</p>
    </section>
  );
}
