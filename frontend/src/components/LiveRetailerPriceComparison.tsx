import { ExternalLink, Crown, Clock, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRetailerProductUrl } from '../utils/productLinks';
import { useCatalogue } from '../context/PriceContext';
import type { RetailerOffer } from '../types';

interface LiveRetailerPriceComparisonProps {
  productId?: number;
  slug: string;
  productName: string;
  brand: string;
  targetVariant: string;
  fallbackOffers: RetailerOffer[];
}

function isDirectProductUrl(url: string): boolean {
  if (!url) return false;
  return ['/p/', '/dp/', '/product/', '/buy'].some((marker) => url.includes(marker));
}

const STORE_PALETTES: Record<string, { badge: string; text: string; bg: string }> = {
  nykaa: { badge: 'Nykaa', text: 'text-pink-700', bg: 'bg-pink-100/80 border-pink-200' },
  amazon: { badge: 'Amazon India', text: 'text-amber-800', bg: 'bg-amber-100/80 border-amber-200' },
  tira: { badge: 'Tira Beauty', text: 'text-rose-900', bg: 'bg-rose-100/80 border-rose-200' },
  purplle: { badge: 'Purplle', text: 'text-purple-700', bg: 'bg-purple-100/80 border-purple-200' },
  myntra: { badge: 'Myntra', text: 'text-rose-700', bg: 'bg-rose-100/80 border-rose-200' },
};

export function LiveRetailerPriceComparison({
  productName,
  brand,
  targetVariant,
  fallbackOffers,
}: LiveRetailerPriceComparisonProps) {
  const { liveUpdatedLabel, isLiveLoaded } = useCatalogue();
  const [apiOffers, setApiOffers] = useState<RetailerOffer[] | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const base = (import.meta.env.VITE_COMPARE_API_URL || 'https://pricewise-compare.a4megaboi.workers.dev').replace(/\/$/, '');
    fetch(`${base}/compare?q=${encodeURIComponent(`${brand} ${productName}`)}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Comparison unavailable')))
      .then((data) => {
        if (!Array.isArray(data.results)) return;
        const offers: RetailerOffer[] = data.results.map((result: any) => ({
          storeId: String(result.retailer || '').toLowerCase().includes('amazon') ? 'amazon' : String(result.retailer || '').toLowerCase().replace(/\s.*/, ''),
          storeName: (result.retailer === 'Amazon India' ? 'Amazon India' : result.retailer === 'Tira Beauty' ? 'Tira' : result.retailer) as RetailerOffer['storeName'],
          price: Number(result.price) || 0,
          originalPrice: result.mrp || undefined,
          shippingFee: null,
          isShippingDisclosed: false,
          deliveryDays: 'Check retailer',
          inStock: Boolean(result.inStock),
          stockStatus: result.inStock ? 'In Stock' : 'Out of Stock',
          purchaseUrl: result.url || result.productUrl || '',
          sourceType: result.source === 'live' ? 'live' : 'cached',
          lastUpdated: result.updatedAt ? (Number.isNaN(Date.parse(result.updatedAt)) ? result.updatedAt : new Date(result.updatedAt).toLocaleString('en-IN')) : 'Recently verified',
          matchClassification: 'verified_match',
        }));
        if (offers.length) setApiOffers(offers);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [brand, productName]);
  const sourceOffers = apiOffers ? [...apiOffers, ...fallbackOffers.filter((offer) => !apiOffers.some((live) => live.storeId === offer.storeId))] : fallbackOffers;
  const sorted = [...sourceOffers].sort(
    (a, b) => (a.price > 0 ? a.price : Number.MAX_SAFE_INTEGER) - (b.price > 0 ? b.price : Number.MAX_SAFE_INTEGER)
  );

  const availableOffers = sorted.filter((offer) => offer.inStock && offer.price > 0);
  const lowestLive =
    availableOffers.length > 0
      ? availableOffers.reduce((min, o) => (o.price < min.price ? o : min), availableOffers[0])
      : null;
  const hasLiveOffer = availableOffers.some((offer) => offer.sourceType === 'live');
  const showLiveBadge = hasLiveOffer || isLiveLoaded;

  return (
    <section
      className="space-y-5 border-t border-rose-200/80 pt-8"
      id="retailer-price-comparison-section"
    >
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-espresso-950">
              Retailer Price Intelligence
            </h2>
            {showLiveBadge && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-2xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Synced
              </span>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-espresso-600 font-normal">
            {showLiveBadge
              ? `Real-time verified pricing for ${targetVariant}${
                  liveUpdatedLabel ? ` • Snapshot: ${liveUpdatedLabel}` : ''
                }. Confirm stock & checkout delivery perks at the retailer.`
              : `Current verified pricing for ${targetVariant}. Confirm stock & checkout delivery perks at the retailer.`}
          </p>
        </div>

        <div className="hidden sm:flex items-center space-x-1.5 text-xs text-espresso-500 shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>5 Authorized Indian Retailers</span>
        </div>
      </div>

      {!sorted.length && (
        <div className="p-8 text-center bg-white rounded-3xl border border-rose-100 text-espresso-700">
          No retailer offers are currently listed for this product.
        </div>
      )}

      {/* Comparison Cards Stack */}
      <div className="space-y-3">
        {sorted.map((offer) => {
          const rawHref = offer.purchaseUrl?.trim();
          const fallbackHref = getRetailerProductUrl(
            { name: productName, brand },
            offer.storeName
          );
          const href = rawHref && rawHref.startsWith('http') ? rawHref : fallbackHref;
          const isLive = offer.sourceType === 'live';
          const isBestDeal = lowestLive?.storeId === offer.storeId;
          const updateTime = offer.lastUpdated || liveUpdatedLabel || 'Recently verified';
          const storeKey = offer.storeId.toLowerCase();
          const palette = STORE_PALETTES[storeKey] || {
            badge: offer.storeName,
            text: 'text-espresso-800',
            bg: 'bg-ivory-100 border-rose-200',
          };

          const savingsAmount =
            offer.originalPrice && offer.originalPrice > offer.price
              ? offer.originalPrice - offer.price
              : 0;
          const savingsPct =
            offer.originalPrice && offer.originalPrice > offer.price
              ? Math.round((savingsAmount / offer.originalPrice) * 100)
              : 0;

          return (
            <div
              key={offer.storeId}
              className={`rounded-3xl p-4 sm:p-5 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 border ${
                isBestDeal
                  ? 'bg-gradient-to-r from-emerald-50/50 via-white to-white border-emerald-300 ring-2 ring-emerald-400/30 shadow-luxury-card'
                  : 'bg-white border-rose-100 hover:border-rose-300 shadow-soft-lift'
              }`}
            >
              {/* Left Column: Store identity, deal crown, variant metadata */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${palette.bg} ${palette.text}`}
                  >
                    {offer.storeName}
                  </span>

                  {isBestDeal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-0.5 text-xs font-bold text-white shadow-xs">
                      <Crown className="h-3.5 w-3.5 text-amber-100" />
                      <span>Best Deal</span>
                    </span>
                  )}

                  {savingsPct > 0 && (
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                      Save ₹{savingsAmount.toLocaleString('en-IN')} • {savingsPct}% OFF
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs text-espresso-600">
                  <span className="flex items-center space-x-1">
                    {offer.inStock ? (
                      <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Listed In Stock</span>
                      </span>
                    ) : (
                      <span className="text-rose-600 font-semibold">Listed Out of Stock</span>
                    )}
                  </span>
                  <span>•</span>
                  <span>{targetVariant}</span>
                  <span>•</span>
                  <span className="flex items-center space-x-1 text-espresso-400">
                    <Clock className="w-3 h-3" />
                    <span>{isLive ? 'Verified' : 'Updated'} {updateTime}</span>
                  </span>
                </div>
              </div>

              {/* Middle Column: Price & Delivery Breakdown */}
              <div className="flex items-baseline md:items-end flex-col md:text-right shrink-0">
                {offer.price > 0 ? (
                  <div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-black text-espresso-950 font-sans tabular-nums">
                        ₹{offer.price.toLocaleString('en-IN')}
                      </span>
                      {offer.originalPrice && offer.originalPrice > offer.price && (
                        <span className="text-sm font-normal text-espresso-400 line-through tabular-nums">
                          ₹{offer.originalPrice.toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                      <span className="text-[11px] text-espresso-500 block mt-0.5 font-normal">
                      {offer.isShippingDisclosed === false
                        ? 'Shipping disclosed at checkout'
                        : offer.shippingFee === 0
                        ? 'Free Standard Delivery'
                        : `+ ₹${offer.shippingFee} Shipping`}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="inline-block text-xs font-semibold text-espresso-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200">
                      Check live on store
                    </span>
                    <span className="text-[11px] text-espresso-400 block mt-0.5">
                      Search retailer for current availability
                    </span>
                  </div>
                )}
              </div>

              {/* Right Column: 1-Click Purchase CTA */}
              <div className="shrink-0 flex items-center">
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-2xl px-5 py-3 min-h-[44px] text-xs sm:text-sm font-bold tracking-wide transition-all shadow-xs ${
                    isBestDeal
                      ? 'bg-espresso-900 hover:bg-espresso-950 text-ivory shadow-md'
                      : 'bg-white hover:bg-rose-50 text-espresso-800 border border-rose-200'
                  }`}
                >
                  <span>{isDirectProductUrl(href) ? `Buy on ${offer.storeName}` : `Search on ${offer.storeName}`}</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
