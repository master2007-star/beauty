import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  ArrowRight,
  Heart,
  Bell,
  Sparkles,
  ExternalLink,
  Crown,
} from 'lucide-react';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';
import { usePriceTracker } from '../hooks/usePriceTracker';
import { getRetailerProductUrl } from '../utils/productLinks';

interface WishlistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  wishlistIds: string[];
  allProducts: Product[];
  onRemoveFromWishlist: (id: string) => void;
  onClearWishlist: () => void;
  onViewProduct: (product: Product) => void;
  onExploreProducts: () => void;
  initialTab?: 'watchlist' | 'alerts';
  onOpenPriceTrackerModal?: (product: Product) => void;
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  onClose,
  wishlistIds,
  allProducts,
  onRemoveFromWishlist,
  onClearWishlist,
  onViewProduct,
  onExploreProducts,
  initialTab = 'watchlist',
  onOpenPriceTrackerModal,
}) => {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'alerts'>(initialTab);
  const {
    trackedProducts,
    stopTracking,
    activeTargetHitCount,
    unreadAlertCount,
  } = usePriceTracker();

  if (!isOpen) return null;

  const wishlistedProducts = allProducts.filter((p) => wishlistIds.includes(p.id));
  const totalValue = wishlistedProducts.reduce((sum, p) => sum + p.price, 0);
  const totalOriginal = wishlistedProducts.reduce(
    (sum, p) => sum + (p.originalPrice || p.price),
    0
  );
  const totalSavings = totalOriginal - totalValue;

  // Tracked products joined with catalog items
  const trackedItemsWithProduct = trackedProducts
    .map((t) => {
      const prod = allProducts.find((p) => p.id === t.productId);
      return { tracking: t, product: prod };
    })
    .filter(
      (item): item is { tracking: (typeof item)['tracking']; product: Product } =>
        Boolean(item.product)
    );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden bg-espresso-950/60 backdrop-blur-xs flex justify-end">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 250 }}
          className="relative w-full max-w-md bg-ivory h-full shadow-2xl border-l border-rose-200 flex flex-col justify-between"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-rose-100 bg-white/85 backdrop-blur-md">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
                  ★
                </div>
                <div>
                  <h3 className="font-editorial text-xl font-bold text-espresso-950 leading-none">
                    Personal Beauty Vault
                  </h3>
                  <span className="text-[10px] uppercase tracking-wider text-espresso-400 font-sans block mt-1">
                    Watchlist & Target Price Alerts
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-rose-100 text-espresso-400 hover:text-espresso-700 transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center space-x-1 bg-ivory-100 p-1 rounded-2xl border border-rose-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => setActiveTab('watchlist')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                  activeTab === 'watchlist'
                    ? 'bg-espresso-800 text-ivory shadow-xs'
                    : 'text-espresso-600 hover:text-espresso-950'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${activeTab === 'watchlist' ? 'fill-current' : ''}`} />
                <span>Saved ({wishlistedProducts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alerts')}
                className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 relative ${
                  activeTab === 'alerts'
                    ? 'bg-espresso-800 text-ivory shadow-xs'
                    : 'text-espresso-600 hover:text-espresso-950'
                }`}
              >
                <Bell className={`w-3.5 h-3.5 ${activeTab === 'alerts' ? 'fill-current' : ''}`} />
                <span>Price Alerts ({trackedItemsWithProduct.length})</span>
                {(activeTargetHitCount > 0 || unreadAlertCount > 0) && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1.5 right-2 ring-2 ring-white animate-pulse" />
                )}
              </button>
            </div>
          </div>

          {/* Body: Active Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {activeTab === 'watchlist' ? (
              /* TAB 1: WATCHLIST ITEMS */
              wishlistedProducts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-400">
                    <Heart className="w-8 h-8" />
                  </div>
                  <h4 className="font-editorial text-xl font-bold text-espresso-900">
                    Your saved vault is empty
                  </h4>
                  <p className="text-xs text-espresso-500 max-w-xs">
                    Save your holy grails, skincare serums, and dream makeup to monitor price drops across Indian retailers.
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onExploreProducts();
                    }}
                    className="px-6 py-2.5 rounded-full bg-rose-500 text-ivory text-xs font-semibold hover:bg-rose-600 transition-colors shadow-xs"
                  >
                    Start Exploring
                  </button>
                </div>
              ) : (
                <>
                  {wishlistedProducts.map((prod) => {
                    const lowest = prod.storeOffers.reduce(
                      (min, o) => (o.price < min.price ? o : min),
                      prod.storeOffers[0]
                    );
                    return (
                      <div
                        key={prod.id}
                        className="p-3.5 rounded-2xl bg-white border border-rose-100 shadow-soft-lift flex items-center space-x-3.5 group relative hover:border-rose-300 transition-all"
                      >
                        <div
                          onClick={() => {
                            onClose();
                            onViewProduct(prod);
                          }}
                          className="w-16 h-16 rounded-xl overflow-hidden bg-ivory shrink-0 border border-rose-100 cursor-pointer"
                        >
                          <ProductImage
                            src={prod.image}
                            alt={prod.name}
                            compact
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] font-bold uppercase text-rose-500 tracking-wider block">
                            {prod.brand}
                          </span>
                          <h4
                            onClick={() => {
                              onClose();
                              onViewProduct(prod);
                            }}
                            className="font-editorial text-sm font-bold text-espresso-900 line-clamp-1 hover:text-rose-600 cursor-pointer transition-colors"
                          >
                            {prod.name}
                          </h4>
                          <div className="flex items-baseline space-x-2 mt-1">
                            <span className="text-sm font-extrabold font-sans text-espresso-950">
                              ₹{prod.price.toLocaleString('en-IN')}
                            </span>
                            {prod.originalPrice && prod.originalPrice > prod.price && (
                              <span className="text-[11px] text-espresso-400 line-through">
                                ₹{prod.originalPrice.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>
                          {lowest && (
                            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">
                              Lowest on {lowest.storeName}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1 shrink-0">
                          {onOpenPriceTrackerModal && (
                            <button
                              onClick={() => onOpenPriceTrackerModal(prod)}
                              className="p-2 text-espresso-400 hover:text-amber-600 transition-colors"
                              title="Set target price alert"
                              aria-label="Set price alert"
                            >
                              <Bell className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onRemoveFromWishlist(prod.id)}
                            className="p-2 text-espresso-300 hover:text-rose-500 transition-colors"
                            aria-label="Remove item"
                            title="Remove from saved"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </>
              )
            ) : (
              /* TAB 2: PRICE-DROP ALERTS & TARGETS */
              trackedItemsWithProduct.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500">
                    <Bell className="w-8 h-8" />
                  </div>
                  <h4 className="font-editorial text-xl font-bold text-espresso-900">
                    No active price alerts
                  </h4>
                  <p className="text-xs text-espresso-500 max-w-xs">
                    Set a target price (e.g. "Alert when below ₹399") on any product card or detail page. We'll monitor live prices across all 5 stores!
                  </p>
                  <button
                    onClick={() => {
                      onClose();
                      onExploreProducts();
                    }}
                    className="px-6 py-2.5 rounded-full bg-espresso-800 text-ivory text-xs font-semibold hover:bg-espresso-950 transition-colors shadow-xs"
                  >
                    Find Products to Track
                  </button>
                </div>
              ) : (
                <>
                  <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-50 via-rose-50 to-ivory border border-amber-200/80 text-xs text-espresso-800 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>
                        Monitoring <strong>{trackedItemsWithProduct.length} beauty holy grails</strong>
                      </span>
                    </div>
                    {activeTargetHitCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                        {activeTargetHitCount} Target Hit!
                      </span>
                    )}
                  </div>

                  {trackedItemsWithProduct.map(({ tracking, product }) => {
                    const isTargetHit =
                      product.price > 0 && product.price <= tracking.targetPrice;
                    const lowestOffer = product.storeOffers.reduce(
                      (min, o) => (o.price < min.price ? o : min),
                      product.storeOffers[0]
                    );
                    const purchaseHref = getRetailerProductUrl(
                      product,
                      lowestOffer?.storeName || 'Nykaa',
                      lowestOffer?.purchaseUrl
                    );

                    return (
                      <div
                        key={tracking.id}
                        className={`p-4 rounded-2xl transition-all border ${
                          isTargetHit
                            ? 'bg-gradient-to-br from-emerald-50/90 via-teal-50/80 to-white border-emerald-300 ring-2 ring-emerald-400/40 shadow-glow-champagne'
                            : 'bg-white border-rose-100 hover:border-rose-300 shadow-soft-lift'
                        }`}
                      >
                        {/* Target Reached Glowing Banner */}
                        {isTargetHit && (
                          <div className="mb-2.5 flex items-center justify-between bg-emerald-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider shadow-xs animate-pulse">
                            <span className="flex items-center space-x-1">
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>Price Drop Hit! Target Reached</span>
                            </span>
                            <span>Target: ₹{tracking.targetPrice.toLocaleString('en-IN')}</span>
                          </div>
                        )}

                        <div className="flex items-start space-x-3.5">
                          <ProductImage
                            src={product.image}
                            alt={product.name}
                            compact
                            className="w-14 h-14 rounded-xl object-cover border border-rose-100 shrink-0"
                          />

                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-bold uppercase text-rose-500 tracking-wider block">
                              {product.brand}
                            </span>
                            <h4
                              onClick={() => {
                                onClose();
                                onViewProduct(product);
                              }}
                              className="text-xs font-bold text-espresso-900 truncate hover:text-rose-600 cursor-pointer"
                            >
                              {product.name}
                            </h4>

                            {/* Price Comparison */}
                            <div className="mt-1 flex items-baseline justify-between">
                              <div>
                                <span className="text-[10px] text-espresso-400 block">Current Lowest:</span>
                                <span className="text-sm font-extrabold text-espresso-950 font-sans">
                                  ₹{product.price.toLocaleString('en-IN')}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-[10px] text-espresso-400 block">Your Target:</span>
                                <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  ₹{tracking.targetPrice.toLocaleString('en-IN')}
                                </span>
                              </div>
                            </div>

                            {/* Store perk */}
                            {lowestOffer && (
                              <div className="mt-1.5 flex items-center space-x-1 text-[11px] text-espresso-600">
                                <Crown className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>
                                  Lowest on <strong>{lowestOffer.storeName}</strong>
                                </span>
                              </div>
                            )}
                          </div>

                          <button
                            onClick={() => stopTracking(product.id)}
                            className="p-1.5 text-espresso-300 hover:text-rose-500 transition-colors"
                            aria-label="Stop tracking"
                            title="Remove alert"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* CTA Row: 1-Click Buy or Adjust */}
                        <div className="mt-3 pt-2.5 border-t border-rose-100/70 flex items-center gap-2">
                          <a
                            href={purchaseHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1 shadow-xs ${
                              isTargetHit
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-espresso-800 hover:bg-espresso-950 text-ivory'
                            }`}
                          >
                            <span>Buy on {lowestOffer?.storeName || 'Store'} (₹{product.price})</span>
                            <ExternalLink className="w-3 h-3 ml-0.5" />
                          </a>

                          {onOpenPriceTrackerModal && (
                            <button
                              type="button"
                              onClick={() => onOpenPriceTrackerModal(product)}
                              className="py-2 px-3 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-espresso-700 text-xs font-semibold transition-colors"
                            >
                              Edit Target
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )
            )}
          </div>

          {/* Footer for Watchlist Tab */}
          {activeTab === 'watchlist' && wishlistedProducts.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-rose-200 bg-white/85 space-y-3">
              <div className="flex items-center justify-between text-xs text-espresso-600">
                <span>Vault Estimated Total:</span>
                <span className="text-base font-bold font-sans text-espresso-950">
                  ₹{totalValue.toLocaleString('en-IN')}
                </span>
              </div>

              {totalSavings > 0 && (
                <div className="flex items-center justify-between text-xs text-sage-800 bg-sage-50 px-3 py-1.5 rounded-xl border border-sage-200">
                  <span>Total Discount Savings:</span>
                  <strong className="font-bold">Save ₹{totalSavings.toLocaleString('en-IN')}</strong>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  onClick={onClearWishlist}
                  className="py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-espresso-600 text-xs font-semibold transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onExploreProducts();
                  }}
                  className="py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-ivory text-xs font-semibold transition-colors flex items-center justify-center space-x-1"
                >
                  <span>Continue Shopping</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
