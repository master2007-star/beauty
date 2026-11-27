import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ProductCard } from '../components/ProductCard';
import { useCatalogue } from '../context/PriceContext';
import type { Product, ProductCategory, RetailerOffer, Subcategory } from '../types';

type CategoryTab = 'All' | 'Sunscreen' | 'Serums' | 'Moisturizers' | 'Lip Care' | 'Makeup';
type SortOrder = 'discount' | 'price' | 'stores';
interface SearchProduct {
  id: string;
  title: string;
  brand: string;
  category: string;
  imageUrl: string | null;
  lowestPrice: number | null;
  mrp: number | null;
  discountPercent: number;
  availableStores: string[];
}
interface DisplayProduct { product: Product; count: number; remote: boolean; }
const QUICK_SEARCHES = ['Dot & Key Sunscreen', 'Minimalist Niacinamide', 'COSRX Snail Mucin', 'Laneige Lip Mask', 'Maybelline Sky High'];
const CATEGORIES: CategoryTab[] = ['All', 'Sunscreen', 'Serums', 'Moisturizers', 'Lip Care', 'Makeup'];
const RETAILERS: Array<{ id: string; name: RetailerOffer['storeName']; search: (query: string) => string }> = [
  { id: 'tira', name: 'Tira', search: (q) => `https://www.tirabeauty.com/search?q=${encodeURIComponent(q)}` },
  { id: 'nykaa', name: 'Nykaa', search: (q) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}` },
  { id: 'amazon', name: 'Amazon India', search: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}` },
  { id: 'purplle', name: 'Purplle', search: (q) => `https://www.purplle.com/search?q=${encodeURIComponent(q)}` },
  { id: 'myntra', name: 'Myntra', search: (q) => `https://www.myntra.com/${encodeURIComponent(q.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}` },
];

function normalize(value: string) { return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function inferCategory(item: SearchProduct): ProductCategory {
  return /mascara|foundation|concealer|blush|eyeliner|makeup|sky high|lipstick/.test(`${item.brand} ${item.title}`.toLowerCase()) ? 'makeup' : 'skincare';
}
function inferSubcategory(item: SearchProduct): Subcategory {
  const text = `${item.brand} ${item.title}`.toLowerCase();
  if (/sunscreen|spf/.test(text)) return 'Sunscreen';
  if (/serum|niacinamide|snail mucin/.test(text)) return 'Serums';
  if (/lip|mucin/.test(text)) return 'Lip Care';
  if (/mascara|sky high/.test(text)) return 'Mascara';
  if (/moistur|cream/.test(text)) return 'Moisturiser';
  if (/foundation/.test(text)) return 'Foundation';
  if (/concealer/.test(text)) return 'Concealer';
  if (/blush/.test(text)) return 'Blush';
  return 'Face Wash';
}
function makeRemoteProduct(item: SearchProduct): Product {
  const fullTitle = `${item.brand} ${item.title}`.trim();
  return {
    id: `live-${item.id}`, slug: `live-${item.id}`, name: item.title, brand: item.brand || 'Beauty', brandTier: 'Affordable',
    category: inferCategory(item), subcategory: inferSubcategory(item), quantity: 'See retailer listing', price: item.lowestPrice || 0,
    originalPrice: item.mrp || undefined, image: item.imageUrl || '', description: `Compare current listings for ${fullTitle} across five Indian beauty stores. Confirm product size and availability with the retailer.`,
    keyIngredients: [], howToUse: { routine: 'AM & PM', stepNumber: 1, stepName: 'As directed', instructions: 'Follow the directions on the product packaging.' },
    storeOffers: RETAILERS.map((store) => ({ storeId: store.id, storeName: store.name, price: 0, shippingFee: null, deliveryDays: 'Check retailer', inStock: false, purchaseUrl: store.search(fullTitle), sourceType: 'unavailable', lastUpdated: 'Not indexed' })),
  };
}
function matchesCategory(product: Product, category: CategoryTab) {
  if (category === 'All') return true;
  if (category === 'Makeup') return product.category === 'makeup';
  if (category === 'Moisturizers') return product.subcategory === 'Moisturiser';
  return product.subcategory === category;
}
function discount(product: Product) { return product.originalPrice && product.price > 0 && product.originalPrice > product.price ? Math.round((product.originalPrice - product.price) / product.originalPrice * 100) : 0; }
function getApiBase() { return (import.meta.env.VITE_COMPARE_API_URL || 'https://pricewise-compare.a4megaboi.workers.dev').replace(/\/$/, ''); }

async function loadSnapshot(query: string): Promise<SearchProduct[]> {
  const base = import.meta.env.BASE_URL || '/';
  const response = await fetch(`${base.endsWith('/') ? base : `${base}/`}data/live-prices.json`);
  if (!response.ok) throw new Error('Price snapshot is unavailable');
  const snapshot = await response.json();
  const tokens = normalize(query).split(' ').filter((token) => token.length > 1);
  return (Object.values(snapshot.products || {}) as Array<Record<string, unknown>>)
    .map((entry) => {
      const offers = (Array.isArray(entry.offers) ? entry.offers : []) as Array<Record<string, unknown>>;
      const listed = offers.filter((offer) => offer.inStock !== false && Number(offer.price) > 0);
      const prices = listed.map((offer) => Number(offer.price));
      const mrps = offers.map((offer) => Number(offer.originalPrice)).filter((price) => price > 0);
      return {
        id: String(entry.productId || entry.productName || ''), title: String(entry.productName || ''), brand: String(entry.brand || ''), category: 'beauty',
        imageUrl: String(entry.imageUrl || entry.image || '') || null, lowestPrice: prices.length ? Math.min(...prices) : null,
        mrp: mrps.length ? Math.max(...mrps) : null, discountPercent: 0,
        availableStores: [...new Set(listed.map((offer) => String(offer.storeName || offer.storeId || '')).filter(Boolean))],
        _search: normalize(`${entry.brand || ''} ${entry.productName || ''}`),
      };
    })
    .filter((item) => !tokens.length || tokens.filter((token) => String((item as SearchProduct & { _search: string })._search).includes(token)).length / tokens.length >= .4)
    .map(({ _search: _ignored, ...item }) => item as SearchProduct)
    .slice(0, 60);
}

interface DiscoveryHomePageProps { searchQuery: string; onSearchQueryChange: (query: string) => void; }
export function DiscoveryHomePage({ searchQuery, onSearchQueryChange }: DiscoveryHomePageProps) {
  const { products } = useCatalogue();
  const location = useLocation();
  const [category, setCategory] = useState<CategoryTab>('All');
  const [sort, setSort] = useState<SortOrder>('discount');
  const [remote, setRemote] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'live' | 'snapshot'>('live');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (location.hash !== '#catalog') return;
    requestAnimationFrame(() => document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' }));
  }, [location.hash]);

  useEffect(() => {
    const controller = new AbortController();
    const query = searchQuery.trim();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(`${getApiBase()}/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Live search unavailable');
        const data = await response.json();
        setRemote(Array.isArray(data.products) ? data.products : []);
        setSource('live');
      } catch {
        if (controller.signal.aborted) return;
        try {
          setRemote(await loadSnapshot(query));
          setSource('snapshot');
        } catch {
          setRemote([]);
          setError(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 140);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  const productsToShow = useMemo(() => {
    const query = normalize(searchQuery);
    const tokens = query.split(' ').filter((token) => token.length > 1);
    const local = products.filter((product) => {
      if (!matchesCategory(product, category)) return false;
      if (!tokens.length) return true;
      const text = normalize(`${product.brand} ${product.name} ${product.subcategory} ${product.keyIngredients.join(' ')}`);
      return tokens.filter((token) => text.includes(token)).length / tokens.length >= .4;
    }).map((product): DisplayProduct => ({ product, count: product.storeOffers.filter((offer) => offer.price > 0).length || 5, remote: false }));
    const mappedRemote = remote
      .filter((item) => matchesCategory(makeRemoteProduct(item), category))
      .map((item) => {
        const match = local.find(({ product }) => normalize(product.brand) === normalize(item.brand) && (normalize(product.name).includes(normalize(item.title)) || normalize(item.title).includes(normalize(product.name))));
        const count = item.availableStores?.length || 5;
        if (match) {
          const updated = item.lowestPrice && item.lowestPrice > 0 ? { ...match.product, price: item.lowestPrice, originalPrice: item.mrp || match.product.originalPrice } : match.product;
          return { product: updated, count, remote: false };
        }
        return { product: makeRemoteProduct(item), count, remote: true };
      });
    const seen = new Set<string>();
    const rows = [...mappedRemote, ...local].filter((row) => {
      const key = normalize(`${row.product.brand} ${row.product.name}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return rows.sort((a, b) => {
      if (sort === 'price') return (a.product.price || Number.MAX_SAFE_INTEGER) - (b.product.price || Number.MAX_SAFE_INTEGER);
      if (sort === 'stores') return b.count - a.count || a.product.name.localeCompare(b.product.name);
      return discount(b.product) - discount(a.product) || a.product.name.localeCompare(b.product.name);
    });
  }, [products, remote, category, sort, searchQuery]);

  return (
    <main className="min-h-screen bg-ivory pb-16 text-espresso">
      <section className="mx-auto max-w-[1440px] px-4 pt-4 sm:px-6 sm:pt-5 lg:px-10" aria-label="Beauty store introduction">
        <div className="relative overflow-hidden rounded-[1.5rem] border border-line bg-[linear-gradient(110deg,#F3EAE6_0%,#FCF9F7_50%,#F7ECE8_100%)] px-5 py-5 sm:px-8 sm:py-6 lg:flex lg:min-h-[148px] lg:items-center lg:justify-between lg:gap-8 lg:px-10">
          <div className="relative z-10 max-w-none">
            <h1 className="text-[25px] font-semibold leading-[1.02] text-espresso sm:text-[34px] lg:text-[36px] xl:whitespace-nowrap xl:text-[40px]">Compare India’s top 5 beauty stores in one click</h1>
            <p className="mt-2 text-[10px] font-medium tracking-[.08em] text-taupe sm:text-xs">Nykaa <span className="px-1.5 text-rose">•</span> Tira <span className="px-1.5 text-rose">•</span> Amazon <span className="px-1.5 text-rose">•</span> Purplle <span className="px-1.5 text-rose">•</span> Myntra</p>
          </div>
          <div className="pointer-events-none absolute -right-10 -top-24 h-52 w-52 rounded-full border border-white/80 lg:right-[27%] lg:top-[-140px] lg:h-72 lg:w-72" />
        </div>
        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Popular beauty searches">
          <span className="shrink-0 pr-1 text-[9px] font-bold uppercase tracking-[.16em] text-taupe">Trending</span>
          {QUICK_SEARCHES.map((term) => <button key={term} type="button" onClick={() => { setCategory('All'); onSearchQueryChange(term); }} className={`min-h-10 shrink-0 rounded-full border px-3.5 text-[10px] font-semibold transition-colors sm:text-[11px] ${searchQuery === term ? 'border-rose bg-rose text-white' : 'border-line bg-white text-taupe hover:border-rose/50 hover:text-espresso'}`}>{term}</button>)}
        </div>
      </section>

      <section id="catalog" className="sticky top-[var(--site-header-height)] z-30 mt-4 border-y border-line bg-ivory/95 backdrop-blur-md" aria-label="Product filters">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Filter by category">
            {CATEGORIES.map((tab) => <button key={tab} type="button" aria-pressed={category === tab} onClick={() => setCategory(tab)} className={`min-h-10 shrink-0 rounded-full px-3 text-[10px] font-semibold transition-colors sm:px-4 sm:text-[11px] ${category === tab ? 'bg-espresso text-white' : 'text-taupe hover:bg-champagne hover:text-espresso'}`}>{tab}</button>)}
          </div>
          <label className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-line bg-white px-3 text-taupe sm:px-3.5">
            <SlidersHorizontal aria-hidden="true" className="h-3.5 w-3.5" />
            <span className="sr-only">Sort products</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="max-w-[118px] cursor-pointer bg-transparent text-[10px] font-semibold text-espresso outline-none sm:max-w-none sm:text-[11px]">
              <option value="discount">Biggest % Off</option><option value="price">Lowest Price</option><option value="stores">Most Stores</option>
            </select>
          </label>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 pt-6 sm:px-6 sm:pt-8 lg:px-10" aria-label="Beauty products">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div><h2 className="font-editorial text-[27px] font-semibold leading-none sm:text-[32px]">{searchQuery.trim() ? 'Your search edit' : category === 'All' ? 'Beauty worth discovering' : category}</h2><p className="mt-1.5 text-[10px] text-taupe sm:text-[11px]">{searchQuery.trim() ? `Results for “${searchQuery.trim()}”` : 'Thoughtful finds, compared across five stores'}</p></div>
          <span className="shrink-0 text-[10px] tabular-nums text-taupe sm:text-[11px]" aria-live="polite">{productsToShow.length} products</span>
        </div>
        {productsToShow.length > 0 ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6">
            {productsToShow.map(({ product, count, remote: isRemote }) => <ProductCard key={product.id} product={product} storeCount={count} routeProduct={isRemote} />)}
          </div>
        ) : loading ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 md:gap-5 lg:grid-cols-4 lg:gap-6" aria-label="Loading beauty products" aria-live="polite">{Array.from({ length: 8 }, (_, index) => <div key={index} className="overflow-hidden rounded-[1.1rem] border border-line bg-white p-2.5"><div className="skeleton aspect-[4/5] rounded-xl" /><div className="skeleton mt-3 h-3 w-1/3 rounded" /><div className="skeleton mt-2 h-4 w-4/5 rounded" /><div className="skeleton mt-2 h-4 w-3/5 rounded" /></div>)}</div>
        ) : (
          <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-champagne text-rose"><Search className="h-5 w-5" /></span><h3 className="mt-4 font-editorial text-2xl font-semibold">{error ? 'The catalogue is taking a moment' : 'No beauty matches yet'}</h3><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-taupe">{error ? 'Live search and the saved catalogue could not be reached. Check your connection and try again.' : 'Try another brand or product, or clear your search to browse every find.'}</p><button type="button" onClick={() => { onSearchQueryChange(''); setCategory('All'); }} className="mt-5 min-h-11 rounded-full bg-espresso px-5 text-[11px] font-semibold text-white hover:bg-rose">Clear search</button></div>
        )}
        <p className="mt-5 text-right text-[9px] text-taupe">{source === 'snapshot' ? 'Showing saved price snapshot' : 'Prices are checked against retailer listings'}</p>
      </section>
    </main>
  );
}
