import { ExternalLink } from 'lucide-react';
import { getRetailerProductUrl, isProductSearchUrl } from '../utils/productLinks';
import type { RetailerOffer } from '../types';

interface LiveRetailerPriceComparisonProps {
  productId?: number;
  slug: string;
  productName: string;
  brand: string;
  targetVariant: string;
  fallbackOffers: RetailerOffer[];
}

export function LiveRetailerPriceComparison({ productName, brand, targetVariant, fallbackOffers }: LiveRetailerPriceComparisonProps) {
  const sorted = [...fallbackOffers].sort((a, b) => Number(b.inStock) - Number(a.inStock) || a.price - b.price);
  const lowest = sorted.find((offer) => offer.inStock && offer.price > 0);
  return (
    <section className="space-y-4 border-t border-rose-200 pt-6" id="retailer-price-comparison-section">
      <div>
        <h2 className="font-editorial text-2xl font-bold text-espresso-900">Retailer Price Comparison</h2>
        <p className="mt-1 text-xs text-espresso-600">Demo prices for {targetVariant}. Confirm current price, stock and delivery at the retailer.</p>
      </div>
      {!sorted.length && <p className="text-sm text-espresso-800">No demo offers are available for this product.</p>}
      <div className="divide-y divide-rose-100 overflow-hidden rounded-2xl border border-rose-200 bg-white">
        {sorted.map((offer) => {
          const href = offer.purchaseUrl || getRetailerProductUrl({ name: productName, brand }, offer.storeName);
          return (
            <div key={offer.storeId} className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
              <div className="min-w-0 flex-1">
                <strong className="text-sm text-espresso-900">{offer.storeName}</strong>
                {lowest?.storeId === offer.storeId && <span className="ml-2 rounded bg-sage-100 px-2 py-1 text-[11px] text-sage-800">Lowest demo price</span>}
                <p className="mt-1 text-xs text-espresso-600">Demo data · {offer.inStock ? 'Listed in stock' : 'Listed out of stock'} · {targetVariant}</p>
              </div>
              <div className="text-sm font-bold text-espresso-900">{offer.price > 0 ? '₹' + offer.price.toLocaleString('en-IN') : 'Price unavailable'}
                <p className="mt-1 text-xs font-normal text-espresso-600">Confirm shipping at checkout</p>
              </div>
              <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-1 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-800 hover:bg-rose-50">
                {isProductSearchUrl(href) ? 'Search retailer' : 'Visit product'}<ExternalLink className="h-3 w-3" />
              </a>
            </div>
          );
        })}
      </div>
    </section>
  );
}
