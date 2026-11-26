import { ExternalLink, Crown, Clock, ShieldCheck } from 'lucide-react';
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
  const sorted = [...fallbackOffers].sort(
    (a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price
  );

  // Only evaluate lowest among verified live offers
  const liveOffers = sorted.filter(
    (offer) => offer.sourceType === 'live' && offer.inStock && offer.price > 0
  );
  const lowestLive =
    liveOffers.length > 0
      ? liveOffers.reduce((min, o) => (o.price < min.price ? o : min), liveOffers[0])
      : null;
  const hasLiveOffer = liveOffers.length > 0;
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

          const buttonLabel = isDirectProductUrl(href)
            ? `Buy on ${offer.storeName}`
            : `View on ${offer.storeName}`;

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
                      <span>Best Live Deal</span>
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
                  {isLive && (
                    <>
                      <span>•</span>
                      <span className="flex items-center space-x-1 text-espresso-400">
                        <Clock className="w-3 h-3" />
                        <span>Verified {updateTime}</span>
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Middle Column: Price & Delivery Breakdown */}
              <div className="flex items-baseline md:items-end flex-col md:text-right shrink-0">
                {isLive && offer.price > 0 ? (
                  <div>
                    <div className="flex items-baseline space-x-2">
                      <span className="text-2xl font-black text-espresso-950 font-sans">
                        ₹{offer.price.toLocaleString('en-IN')}
                      </span>
                      {offer.originalPrice && offer.originalPrice > offer.price && (
                        <span className="text-sm font-normal text-espresso-400 line-through">
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
                      Store search check
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
                  className={`w-full sm:w-auto inline-flex items-center justify-center gap-1.5 rounded-2xl px-5 py-3 text-xs sm:text-sm font-bold tracking-wide transition-all shadow-xs ${
                    isBestDeal
                      ? 'bg-espresso-900 hover:bg-espresso-950 text-ivory shadow-md'
                      : 'bg-white hover:bg-rose-50 text-espresso-800 border border-rose-200'
                  }`}
                >
                  <span>{buttonLabel}</span>
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
