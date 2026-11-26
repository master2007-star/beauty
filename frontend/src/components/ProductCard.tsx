import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Heart, Star, Sparkles, Scale, Info, Bell, Crown } from 'lucide-react';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';
import { OfficialProductLink } from './OfficialProductLink';
import { usePriceTracker } from '../hooks/usePriceTracker';

interface ProductCardProps {
  product: Product;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onViewProduct: (product: Product) => void;
  onComparePrices?: (product: Product) => void;
  onViewAlternative?: (product: Product) => void;
  onOpenPriceTracker?: (product: Product) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isWishlisted,
  onToggleWishlist,
  onViewProduct,
  onComparePrices,
  onViewAlternative,
  onOpenPriceTracker,
}) => {
  const { isTracking, getTargetPrice, isTargetReached } = usePriceTracker();
  const isTracked = isTracking(product.id);
  const targetPrice = getTargetPrice(product.id);
  const targetReached = isTargetReached(product.id);

  // Find lowest price store
  const lowestOffer = product.storeOffers.reduce(
    (min, o) => (o.price < min.price ? o : min),
    product.storeOffers[0]
  );
  const savingsAmount = product.originalPrice ? product.originalPrice - product.price : 0;
  const savingsPct =
    product.originalPrice && product.originalPrice > product.price
      ? Math.round((savingsAmount / product.originalPrice) * 100)
      : 0;
  const hasAlternative = Boolean(product.dupeId);
  const productUrl = `/product/${product.slug || product.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
      className={`group relative rounded-3xl bg-white border ${
        targetReached
          ? 'border-emerald-300 ring-2 ring-emerald-400/40 shadow-glow-champagne'
          : 'border-rose-100/90 hover:border-rose-300'
      } shadow-soft-lift hover:shadow-luxury-card transition-all duration-300 flex flex-col overflow-hidden`}
    >
      {/* Top Media Area */}
      <div className="relative aspect-[4/3] w-full bg-ivory-100 overflow-hidden">
        <Link to={productUrl} className="block w-full h-full">
          <ProductImage
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        </Link>

        {/* Target Reached Glowing Celebratory Pill */}
        {targetReached && targetPrice && (
          <div className="absolute top-3 left-3 z-20 flex items-center space-x-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-lg shadow-emerald-950/40 ring-1 ring-white/50 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Target Hit: ₹{targetPrice.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Top Floating Badges (when target not hit) */}
        {!targetReached && (
          <div className="absolute top-3 left-3 flex flex-col gap-1 items-start z-10">
            {product.dealTag && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500 text-ivory shadow-xs">
                {product.dealTag.split('•')[0]}
              </span>
            )}
            <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider bg-white/90 backdrop-blur-xs text-espresso-700 border border-rose-100">
              {product.subcategory}
            </span>
          </div>
        )}

        {/* Top Right Action Icons: Price Alert Bell & Wishlist Heart */}
        <div className="absolute top-3 right-3 flex items-center space-x-1.5 z-20">
          {/* Target Price Alert Trigger */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenPriceTracker) onOpenPriceTracker(product);
              else onViewProduct(product);
            }}
            aria-label={
              isTracked
                ? `Price alert active (Target: ₹${targetPrice})`
                : 'Set target price alert'
            }
            title={
              isTracked
                ? `Target alert active at ₹${targetPrice?.toLocaleString('en-IN')}`
                : 'Set ₹ target price-drop alert'
            }
            className={`p-2 rounded-full backdrop-blur-md transition-all shadow-xs ${
              targetReached
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-300 ring-2 ring-emerald-400/50'
                : isTracked
                ? 'bg-amber-50 text-amber-700 border border-amber-300'
                : 'bg-white/80 hover:bg-white text-espresso-400 hover:text-amber-600 border border-white/60'
            }`}
          >
            <Bell className={`w-3.5 h-3.5 ${isTracked ? 'fill-current' : ''}`} />
          </button>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleWishlist(product.id);
            }}
            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className={`p-2 rounded-full backdrop-blur-md transition-all shadow-xs ${
              isWishlisted
                ? 'bg-rose-50 text-rose-500 border border-rose-300'
                : 'bg-white/80 hover:bg-white text-espresso-400 hover:text-rose-500 border border-white/60'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
          </button>
        </div>

        {/* Brand Tier Pill & Availability Label */}
        <div className="absolute bottom-3 left-3 flex items-center space-x-1.5 z-10">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
              product.brandTier === 'Luxury'
                ? 'bg-espresso-800 text-champagne-300'
                : product.brandTier === 'Premium'
                ? 'bg-rose-100 text-rose-700'
                : 'bg-sage-100 text-sage-700'
            }`}
          >
            {product.brandTier}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white/85 text-espresso-600 border border-rose-100 backdrop-blur-xs">
            {product.priceStatus === 'live' ? 'Live Price' : 'Verified Price'}
          </span>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & Quantity */}
          <div className="flex items-center justify-between text-xs text-espresso-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-rose-500">
              {product.brand}
            </span>
            <span>{product.quantity}</span>
          </div>

          {/* Product Name */}
          <Link
            to={productUrl}
            className="font-editorial text-lg sm:text-xl font-bold text-espresso-800 line-clamp-2 hover:text-rose-600 cursor-pointer transition-colors leading-snug block"
            title={product.name}
          >
            {product.name}
          </Link>

          {/* Skin Type or Finish Tag */}
          <p className="text-xs text-espresso-500 mt-1 line-clamp-1">
            {product.skinType
              ? `For: ${product.skinType}`
              : product.finish
              ? `Finish: ${product.finish}`
              : ''}
          </p>

          {/* Rating */}
          {product.rating && (
            <div className="flex items-center space-x-1.5 mt-2">
              <div className="flex items-center text-champagne-500">
                <Star className="w-3.5 h-3.5 fill-champagne-500" />
                <span className="text-xs font-bold text-espresso-700 ml-1">
                  {product.rating}
                </span>
              </div>
              <span className="text-espresso-300 text-xs">•</span>
              <span className="text-xs text-espresso-400">
                ({product.reviewCount?.toLocaleString('en-IN')})
              </span>
            </div>
          )}
        </div>

        {/* Pricing & Comparison Footer */}
        <div className="pt-3 mt-3 border-t border-rose-100/70">
          <div className="flex items-baseline justify-between">
            <div>
              <span className="text-[11px] text-espresso-400 block font-normal">
                {product.priceStatus ? 'Current lowest price' : 'Lowest live price'}
              </span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-extrabold text-espresso-900 font-sans tabular-nums">
                  {product.price > 0
                    ? `₹${product.price.toLocaleString('en-IN')}`
                    : 'Price unavailable'}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-xs text-espresso-400 line-through tabular-nums">
                    ₹{product.originalPrice.toLocaleString('en-IN')}
                  </span>
                )}
              </div>
            </div>

            {/* Savings percentage pill */}
            {savingsPct > 0 && (
              <span className="text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200 shadow-2xs">
                Save ₹{savingsAmount.toLocaleString('en-IN')} • {savingsPct}% OFF
              </span>
            )}
          </div>

          {/* Active Target Price Indicator */}
          {isTracked && targetPrice && !targetReached && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-amber-800 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/80">
              <span>Your Alert Target:</span>
              <span className="font-bold">₹{targetPrice.toLocaleString('en-IN')}</span>
            </div>
          )}

          {/* Retailer badge */}
          {lowestOffer && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-espresso-700 bg-ivory-100 px-2.5 py-1.5 rounded-xl border border-rose-100 shadow-2xs">
              <span className="flex items-center space-x-1">
                <Crown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>
                  Lowest on <strong>{lowestOffer.storeName}</strong>
                </span>
              </span>
              <span className="text-sage-700 font-medium">
                {lowestOffer.isShippingDisclosed === false
                  ? 'Shipping at checkout'
                  : lowestOffer.shippingFee === 0
                  ? 'Free Delivery'
                  : 'Shipping extra'}
              </span>
            </div>
          )}

          {/* Action Button Row */}
          <div className="mt-3 flex flex-col gap-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <Link
                to={productUrl}
                className="py-2 rounded-xl bg-ivory-200 hover:bg-ivory-300 text-espresso-800 text-xs font-semibold tracking-wide transition-all flex items-center justify-center space-x-1"
              >
                <Info className="w-3.5 h-3.5 text-espresso-600" />
                <span>Details</span>
              </Link>

              <button
                type="button"
                onClick={() =>
                  onComparePrices ? onComparePrices(product) : onViewProduct(product)
                }
                className="py-2 rounded-xl bg-espresso-800 hover:bg-espresso-900 text-ivory text-xs font-semibold tracking-wide transition-all flex items-center justify-center space-x-1 shadow-xs"
              >
                <Scale className="w-3.5 h-3.5 text-champagne-300" />
                <span>Compare</span>
              </button>
            </div>

            <OfficialProductLink product={product} className="justify-center py-1.5" />

            {hasAlternative && (
              <button
                type="button"
                onClick={() =>
                  onViewAlternative ? onViewAlternative(product) : onViewProduct(product)
                }
                className="w-full py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 text-[11px] font-bold tracking-wide transition-all flex items-center justify-center space-x-1"
              >
                <Sparkles className="w-3 h-3 text-rose-500" />
                <span>Cheapest Alternative</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
