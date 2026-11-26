import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { PRODUCTS_DATA } from '../data/products';
import type { Product, RetailerOffer } from '../types';

export interface PriceContextType {
  products: Product[];
  liveUpdatedLabel?: string;
  isLiveLoaded: boolean;
}

const PriceContext = createContext<PriceContextType | null>(null);

export function PriceProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(PRODUCTS_DATA);
  const [liveUpdatedLabel, setLiveUpdatedLabel] = useState<string | undefined>(undefined);
  const [isLiveLoaded, setIsLiveLoaded] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadLivePrices() {
      try {
        const baseUrl = import.meta.env.BASE_URL || '/';
        const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
        const url = `${cleanBase}data/live-prices.json?t=${Math.floor(Date.now() / 300000)}`;

        const response = await fetch(url);
        if (!response.ok) return;

        const data = await response.json();
        if (!data || !data.products || typeof data.products !== 'object') return;

        if (!isMounted) return;

        const formattedUpdatedLabel: string | undefined = data.updatedLabel || undefined;

        setProducts((currentProducts) => {
          return currentProducts.map((product) => {
            const liveEntry = data.products[product.id];
            if (!liveEntry) return product;

            // Collect all live offer entries (from .offers array or storeId properties)
            const liveOffersMap: Record<string, any> = {};
            if (Array.isArray(liveEntry.offers)) {
              for (const off of liveEntry.offers) {
                if (off && off.storeId) {
                  liveOffersMap[String(off.storeId).toLowerCase()] = off;
                }
              }
            }
            for (const key of Object.keys(liveEntry)) {
              if (!['offers', 'productId', 'productName', 'brand'].includes(key)) {
                const val = liveEntry[key];
                if (val && typeof val === 'object' && val.price !== undefined) {
                  liveOffersMap[key.toLowerCase()] = val;
                }
              }
            }

            if (Object.keys(liveOffersMap).length === 0) return product;

            // Merge each storeOffer with live data
            const updatedOffers: RetailerOffer[] = product.storeOffers.map((existingOffer) => {
              const liveMatch = liveOffersMap[existingOffer.storeId.toLowerCase()];

              // ONLY set sourceType: 'live' when liveMatch actually exists and has sourceType === 'live' | 'cached' with valid price > 0
              const isTrulyLive = Boolean(
                liveMatch &&
                (liveMatch.sourceType === 'live' || liveMatch.sourceType === 'cached') &&
                liveMatch.price !== undefined &&
                liveMatch.price !== null &&
                Number(liveMatch.price) > 0
              );

              if (!isTrulyLive) {
                // Keep unscraped / fallback offers strictly as demo with catalog pricing
                return {
                  ...existingOffer,
                  sourceType: 'demo' as const,
                  lastUpdated: undefined,
                };
              }

              const livePrice = Number(liveMatch.price);
              const liveOriginalPrice = liveMatch.originalPrice ? Number(liveMatch.originalPrice) : existingOffer.originalPrice;
              const liveInStock = liveMatch.inStock !== undefined ? Boolean(liveMatch.inStock) : existingOffer.inStock;
              const livePurchaseUrl = liveMatch.resolvedUrl || liveMatch.purchaseUrl || existingOffer.purchaseUrl;

              // Format lastUpdated using snapshot.updatedLabel (never raw ISO strings)
              const lastUpdated = formattedUpdatedLabel || 'Recently verified';

              const shipping = existingOffer.shippingFee ?? 0;
              const couponDiscount = existingOffer.couponDiscount ?? 0;
              const totalCost = Math.max(0, livePrice + shipping - couponDiscount);

              return {
                ...existingOffer,
                price: livePrice,
                originalPrice: liveOriginalPrice,
                inStock: liveInStock,
                stockStatus: liveInStock ? 'In Stock' : 'Out of Stock',
                purchaseUrl: livePurchaseUrl,
                lastUpdated,
                sourceType: 'live' as const,
                totalCost,
                isLowestPrice: false,
              };
            });

            // Recalculate lowest in-stock price & mark isLowestPrice on cheapest offer
            const inStockOffers = updatedOffers.filter((o) => o.inStock && o.price > 0);
            const lowestOffer = inStockOffers.length > 0
              ? inStockOffers.reduce((min, o) => (o.price < min.price ? o : min), inStockOffers[0])
              : null;

            const finalOffers = updatedOffers.map((o) => ({
              ...o,
              isLowestPrice: lowestOffer ? o.storeId === lowestOffer.storeId : false,
            }));

            const lowestPrice = lowestOffer ? lowestOffer.price : product.price;

            return {
              ...product,
              price: lowestPrice,
              storeOffers: finalOffers,
            };
          });
        });

        if (formattedUpdatedLabel) {
          setLiveUpdatedLabel(formattedUpdatedLabel);
        }
        setIsLiveLoaded(true);
      } catch {
        // Fallback silently to static catalogue data
      }
    }

    loadLivePrices();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <PriceContext.Provider value={{ products, liveUpdatedLabel, isLiveLoaded }}>
      {children}
    </PriceContext.Provider>
  );
}

export function useCatalogue() {
  const state = useContext(PriceContext);
  if (!state) throw new Error('PriceProvider is missing');
  return state;
}
