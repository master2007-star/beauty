import { ExternalLink } from 'lucide-react';
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

export function LiveRetailerPriceComparison({ productName, brand, targetVariant, fallbackOffers }: LiveRetailerPriceComparisonProps) {
  const { liveUpdatedLabel, isLiveLoaded } = useCatalogue();
  const sorted = [...fallbackOffers].sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price);
  
  // Only evaluate lowest among verified live offers
  const liveOffers = sorted.filter((offer) => offer.sourceType === 'live' && offer.inStock && offer.price > 0);
  const lowestLive = liveOffers.length > 0 ? liveOffers.reduce((min, o) => (o.price < min.price ? o : min), liveOffers[0]) : null;
  const hasLiveOffer = liveOffers.length > 0;
  const showLiveBadge = hasLiveOffer || isLiveLoaded;

  return (
    <section className="space-y-4 border-t border-rose-200 pt-6" id="retailer-price-comparison-section">
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="font-editorial text-2xl font-bold text-espresso-900">Retailer Price Comparison</h2>
          {showLiveBadge && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Synced
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-espresso-600">
          {showLiveBadge
            ? `Live prices for ${targetVariant}${liveUpdatedLabel ? ` • Updated ${liveUpdatedLabel}` : ''}. Confirm current price, stock and delivery at the retailer.`
            : `Current prices for ${targetVariant}. Confirm current price, stock and delivery at the retailer.`}
        </p>
      </div>
      {!sorted.length && <p className="text-sm text-espresso-800">No offers are available for this product.</p>}
      <div className="divide-y divide-rose-100 overflow-hidden rounded-2xl border border-rose-200 bg-white">
        {sorted.map((offer) => {
          const rawHref = offer.purchaseUrl?.trim();
          const fallbackHref = getRetailerProductUrl({ name: productName, brand }, offer.storeName);
          const href = rawHref && rawHref.startsWith('http') ? rawHref : fallbackHref;
          const isLive = offer.sourceType === 'live';
          const updateTime = offer.lastUpdated || liveUpdatedLabel || 'Recently verified';
          const buttonLabel = isDirectProductUrl(href) ? 'Visit product' : `View on ${offer.storeName}`;

          return (
            <div key={offer.storeId} className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="min-w-0 flex-1">
                <strong className="text-sm text-espresso-900">{offer.storeName}</strong>
                {lowestLive?.storeId === offer.storeId && (
                  <span className="ml-2 rounded bg-sage-100 px-2 py-1 text-[11px] text-sage-800">
                    Lowest live price
                  </span>
                )}
                <p className="mt-1 text-xs text-espresso-600">
                  {isLive ? `Live price (${updateTime}) · ` : ''}
                  {offer.inStock ? 'Listed in stock' : 'Listed out of stock'} · {targetVariant}
                </p>
              </div>
              <div className="text-sm font-bold text-espresso-900">
                {isLive && offer.price > 0 ? (
                  <>
                    {'₹' + offer.price.toLocaleString('en-IN')}
                    {offer.originalPrice && offer.originalPrice > offer.price && (
                      <span className="ml-1.5 text-xs font-normal text-espresso-400 line-through">
                        ₹{offer.originalPrice.toLocaleString('en-IN')}
                      </span>
                    )}
                    <p className="mt-1 text-xs font-normal text-espresso-600">Confirm shipping at checkout</p>
                  </>
                ) : (
                  <>
                    <span className="inline-block text-xs font-semibold text-espresso-700 bg-rose-50 px-2 py-1 rounded-md border border-rose-200">
                      Check price on store
                    </span>
                    <p className="mt-1 text-xs font-normal text-espresso-500">Live check pending</p>
                  </>
                )}
              </div>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 px-3.5 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50 transition-colors shrink-0"
              >
                {buttonLabel}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
