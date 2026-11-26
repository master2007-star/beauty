import { useEffect, useMemo, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { Hero } from '../components/Hero';
import { useCatalogue } from '../context/PriceContext';
import type { Product, ProductCategory, RetailerOffer, Subcategory } from '../types';

type QuickCategory = 'All' | 'Sunscreen' | 'Serums' | 'Moisturizers' | 'Lip Care' | 'Makeup';
type SortMode = 'discount' | 'price' | 'stores';

interface EdgeProduct {
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

interface DiscoveryHomePageProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

const TRENDING_SEARCHES = [
  'Dot & Key Sunscreen',
  'Minimalist Niacinamide',
  'COSRX Snail Mucin',
  'Laneige Lip Mask',
  'Maybelline Sky High',
];

const STORE_INFO: Array<{ id: string; name: RetailerOffer['storeName']; search: (query: string) => string }> = [
  { id: 'nykaa', name: 'Nykaa', search: (query) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(query)}` },
  { id: 'tira', name: 'Tira', search: (query) => `https://www.tirabeauty.com/search?q=${encodeURIComponent(query)}` },
  { id: 'amazon', name: 'Amazon India', search: (query) => `https://www.amazon.in/s?k=${encodeURIComponent(query)}` },
  { id: 'purplle', name: 'Purplle', search: (query) => `https://www.purplle.com/search?q=${encodeURIComponent(query)}` },
  { id: 'myntra', name: 'Myntra', search: (query) => `https://www.myntra.com/${encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))}` },
];

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function inferCategory(item: EdgeProduct): ProductCategory {
  const text = `${item.brand} ${item.title}`.toLowerCase();
  return /lipstick|mascara|foundation|concealer|blush|eyeliner|makeup|sky high/.test(text) ? 'makeup' : 'skincare';
}

function inferSubcategory(item: EdgeProduct): Subcategory {
  const text = `${item.brand} ${item.title}`.toLowerCase();
  if (text.includes('sunscreen') || text.includes('spf')) return 'Sunscreen';
  if (text.includes('serum') || text.includes('niacinamide') || text.includes('snail mucin')) return 'Serums';
  if (text.includes('lip')) return 'Lip Care';
  if (text.includes('mascara') || text.includes('sky high')) return 'Mascara';
  if (text.includes('foundation')) return 'Foundation';
  if (text.includes('concealer')) return 'Concealer';
  if (text.includes('blush')) return 'Blush';
  return 'Face Wash';
}

function toRouteProduct(item: EdgeProduct): Product {
  const title = `${item.brand} ${item.title}`.trim();
  return {
    id: `live-${item.id}`,
    slug: `live-${item.id}`,
    name: item.title,
    brand: item.brand || 'Beauty',
    brandTier: 'Affordable',
    category: inferCategory(item),
    subcategory: inferSubcategory(item),
    quantity: 'See retailer listing',
    price: item.lowestPrice || 0,
    originalPrice: item.mrp || undefined,
    image: item.imageUrl || '',
    description: `Compare current listings for ${title} across Nykaa, Tira, Amazon India, Purplle and Myntra. Confirm product size and availability with each retailer.`,
    keyIngredients: [],
    howToUse: {
      routine: 'AM & PM',
      stepNumber: 1,
      stepName: 'As directed on the product label',
      instructions: 'Follow the directions provided on the retailer product page and product packaging.',
    },
    storeOffers: STORE_INFO.map((store) => ({
      storeId: store.id,
      storeName: store.name,
      price: 0,
      shippingFee: null,
      deliveryDays: 'Check retailer',
      inStock: false,
      purchaseUrl: store.search(title),
      sourceType: 'unavailable',
      lastUpdated: 'Not indexed',
    })),
  };
}

function productMatchesCategory(product: Product, category: QuickCategory) {
  if (category === 'All') return true;
  if (category === 'Makeup') return product.category === 'makeup';
  if (category === 'Moisturizers') return product.subcategory === 'Moisturiser';
  return product.subcategory === category;
}

function productDiscount(product: Product) {
  return product.originalPrice && product.price > 0 && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
}

export function DiscoveryHomePage({ searchQuery, onSearchQueryChange }: DiscoveryHomePageProps) {
  const { products } = useCatalogue();
  const [category, setCategory] = useState<QuickCategory>('All');
  const [sortMode, setSortMode] = useState<SortMode>('discount');
  const [edgeProducts, setEdgeProducts] = useState<EdgeProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setEdgeProducts([]);
      setIsSearching(false);
      return;
    }

    setEdgeProducts([]);
    setIsSearching(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const base = (import.meta.env.VITE_COMPARE_API_URL || 'https://pricewise-compare.a4megaboi.workers.dev').replace(/\/$/, '');
      fetch(`${base}/search?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('Live search unavailable')))
        .then((data) => setEdgeProducts(Array.isArray(data.products) ? data.products : []))
        .catch(async () => {
          try {
            const basePath = import.meta.env.BASE_URL || '/';
            const path = `${basePath.endsWith('/') ? basePath : `${basePath}/`}data/live-prices.json`;
            const response = await fetch(path, { signal: controller.signal });
            if (!response.ok) throw new Error('Snapshot unavailable');
            const snapshot = await response.json();
            const tokens = normalize(query).split(' ').filter((token) => token.length > 1);
            const matches = (Object.values(snapshot.products || {}) as any[]).map((entry) => {
              const haystack = normalize(`${entry.brand || ''} ${entry.productName || ''}`);
              const score = tokens.filter((token) => haystack.includes(token)).length / Math.max(1, tokens.length);
              return { entry, score };
            }).filter((match) => match.score >= 0.4).sort((a, b) => b.score - a.score).slice(0, 16);
            setEdgeProducts(matches.map(({ entry }) => {
              const offers = (entry.offers || []).filter((offer: any) => offer.inStock !== false && Number(offer.price) > 0);
              const prices = offers.map((offer: any) => Number(offer.price));
              const mrps = (entry.offers || []).map((offer: any) => Number(offer.originalPrice)).filter((price: number) => price > 0);
              const lowestPrice = prices.length ? Math.min(...prices) : null;
              const mrp = mrps.length ? Math.max(...mrps) : null;
              return {
                id: String(entry.productId || entry.productName).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                title: entry.productName || '',
                brand: entry.brand || '',
                category: 'beauty',
                imageUrl: entry.imageUrl || entry.image || null,
                lowestPrice,
                mrp,
                discountPercent: mrp && lowestPrice && mrp > lowestPrice ? Math.round((mrp - lowestPrice) / mrp * 100) : 0,
                availableStores: offers.map((offer: any) => offer.storeName || offer.storeId),
              };
            }));
          } catch {
            if (!controller.signal.aborted) setEdgeProducts([]);
          }
        })
        .finally(() => { if (!controller.signal.aborted) setIsSearching(false); });
    }, 280);

    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  const localProducts = useMemo(() => {
    const tokens = normalize(searchQuery).split(' ').filter((token) => token.length > 1);
    return products.filter((product) => {
      if (!productMatchesCategory(product, category)) return false;
      if (!tokens.length) return true;
      const haystack = normalize(`${product.brand} ${product.name} ${product.category} ${product.subcategory} ${product.keyIngredients.join(' ')} ${product.skinType || ''}`);
      const matches = tokens.filter((token) => haystack.includes(token)).length;
      return matches / tokens.length >= 0.4;
    });
  }, [products, searchQuery, category]);

  const displayProducts = useMemo(() => {
    const localRows = localProducts.map((product) => ({ product, storeCount: product.storeOffers.filter((offer) => offer.price > 0).length, routeProduct: false }));
    const remoteRows = searchQuery.trim()
      ? edgeProducts
          .filter((item) => productMatchesCategory({ category: inferCategory(item), subcategory: inferSubcategory(item) } as Product, category))
          .filter((item) => !localProducts.some((product) => {
            if (normalize(product.brand) !== normalize(item.brand)) return false;
            const left = normalize(product.name);
            const right = normalize(item.title);
            return left.includes(right) || right.includes(left) || right.split(' ').filter((word) => left.includes(word)).length / Math.max(1, right.split(' ').length) >= 0.65;
          }))
          .map((item) => ({ product: toRouteProduct(item), storeCount: item.availableStores?.length || 5, routeProduct: true }))
      : [];
    const rows = [...localRows, ...remoteRows];
    return rows.sort((a, b) => {
      if (sortMode === 'price') return (a.product.price || Number.MAX_SAFE_INTEGER) - (b.product.price || Number.MAX_SAFE_INTEGER);
      if (sortMode === 'stores') return b.storeCount - a.storeCount || a.product.name.localeCompare(b.product.name);
      return productDiscount(b.product) - productDiscount(a.product) || a.product.name.localeCompare(b.product.name);
    });
  }, [localProducts, edgeProducts, searchQuery, category, sortMode]);

  const categories: QuickCategory[] = ['All', 'Sunscreen', 'Serums', 'Moisturizers', 'Lip Care', 'Makeup'];
  const sortOptions: Array<{ value: SortMode; label: string }> = [
    { value: 'discount', label: 'Best Discount' },
    { value: 'price', label: 'Lowest Price' },
    { value: 'stores', label: 'Most Stores' },
  ];

  return (
    <main className="min-h-screen bg-[#faf7f5] pb-16 text-[#1e1918]">
      <Hero searchQuery={searchQuery} onSearchChange={onSearchQueryChange} productCount={displayProducts.length} />

      <section id="catalog" className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 sm:pt-7 lg:px-8" aria-label="Beauty product discovery">
        <div className="space-y-4 border-b border-[#eadcd6] pb-5">
          <div className="flex flex-wrap items-center gap-2" aria-label="Trending searches">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#6e605c]">Trending</span>
            {TRENDING_SEARCHES.map((term) => (
              <button key={term} type="button" onClick={() => { setCategory('All'); onSearchQueryChange(term); }} className="min-h-11 rounded-full border border-[#eadcd6] bg-white px-3.5 text-[11px] font-medium text-[#514440] transition-colors hover:border-[#b86b5e] hover:text-[#80473f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d584d] sm:text-xs">
                {term}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2" aria-label="Filter by category">
              {categories.map((item) => (
                <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)} className={`min-h-11 rounded-full px-4 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d584d] ${category === item ? 'bg-[#1e1918] text-white' : 'border border-[#eadcd6] bg-white text-[#514440] hover:border-[#b86b5e] hover:text-[#80473f]'}`}>
                  {item}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2" aria-label="Sort products">
              <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6e605c]">Sort</span>
              {sortOptions.map((option) => (
                <button key={option.value} type="button" aria-pressed={sortMode === option.value} onClick={() => setSortMode(option.value)} className={`min-h-11 rounded-full px-3 text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d584d] sm:px-3.5 sm:text-xs ${sortMode === option.value ? 'bg-[#f3eae6] text-[#80473f] ring-1 ring-inset ring-[#d9c5bc]' : 'text-[#6e605c] hover:bg-white hover:text-[#1e1918]'}`}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-baseline justify-between gap-3 py-5">
          <h2 className="font-editorial text-2xl font-semibold text-[#1e1918] sm:text-3xl">
            {searchQuery.trim() ? 'Search results' : category === 'All' ? 'Beauty to explore' : category}
          </h2>
          <p className="text-xs tabular-nums text-[#6e605c]" aria-live="polite">{displayProducts.length} products</p>
        </div>

        {isSearching && displayProducts.length === 0 ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4" aria-label="Loading search results" aria-live="polite">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((item) => <div key={item} className="shimmer-active aspect-[4/5] rounded-2xl border border-[#eadcd6] bg-white" />)}
          </div>
        ) : displayProducts.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
            {displayProducts.map(({ product, storeCount, routeProduct }) => (
              <ProductCard key={product.id} product={product} storeCount={storeCount} routeProduct={routeProduct} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#eadcd6] bg-white px-5 py-12 text-center">
            <h3 className="font-editorial text-2xl font-semibold text-[#1e1918]">No matches found</h3>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#6e605c]">Try a brand or product name, or clear your search to browse the full collection.</p>
            <button type="button" onClick={() => { onSearchQueryChange(''); setCategory('All'); }} className="mt-5 min-h-11 rounded-full bg-[#1e1918] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#3b302d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d584d]">Clear search</button>
          </div>
        )}
      </section>
    </main>
  );
}
