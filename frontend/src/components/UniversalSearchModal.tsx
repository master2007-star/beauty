import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Sparkles,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Layers,
  Crown,
} from 'lucide-react';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';
import { useCatalogue } from '../context/PriceContext';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  onSelectProduct?: (product: Product) => void;
}

interface StoreSearchMeta {
  id: string;
  name: string;
  badge: string;
  colorBg: string;
  colorText: string;
  borderColor: string;
  logoBg: string;
  perks: string;
  getSearchUrl: (q: string) => string;
}

const FIVE_STORES: StoreSearchMeta[] = [
  {
    id: 'nykaa',
    name: 'Nykaa',
    badge: '100% Authentic Guarantee',
    colorBg: 'bg-pink-50',
    colorText: 'text-pink-700',
    borderColor: 'border-pink-200/80',
    logoBg: 'bg-pink-600',
    perks: 'Free delivery above ₹499 • 2-4 Days',
    getSearchUrl: (q) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'amazon',
    name: 'Amazon India',
    badge: 'Fastest Prime Delivery',
    colorBg: 'bg-amber-50',
    colorText: 'text-amber-800',
    borderColor: 'border-amber-200/80',
    logoBg: 'bg-amber-600',
    perks: 'Free Prime shipping • 1-2 Days',
    getSearchUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  },
  {
    id: 'tira',
    name: 'Tira Beauty',
    badge: 'Reliance Beauty Luxe',
    colorBg: 'bg-rose-50',
    colorText: 'text-rose-900',
    borderColor: 'border-rose-200/80',
    logoBg: 'bg-[#671A37]',
    perks: 'Free delivery above ₹499 • 1-3 Days',
    getSearchUrl: (q) => `https://www.tirabeauty.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'purplle',
    name: 'Purplle',
    badge: 'Best Budget Offers',
    colorBg: 'bg-purple-50',
    colorText: 'text-purple-700',
    borderColor: 'border-purple-200/80',
    logoBg: 'bg-[#78206E]',
    perks: 'Free delivery above ₹399 • 3-5 Days',
    getSearchUrl: (q) => `https://www.purplle.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'myntra',
    name: 'Myntra',
    badge: 'Fashion & Beauty Insider',
    colorBg: 'bg-rose-50',
    colorText: 'text-rose-700',
    borderColor: 'border-rose-200/80',
    logoBg: 'bg-[#EE5F73]',
    perks: 'Free delivery above ₹799 • 2-4 Days',
    getSearchUrl: (q) =>
      `https://www.myntra.com/${encodeURIComponent(
        q
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
      )}`,
  },
];

const TRENDING_QUERIES = [
  'Dot & Key Watermelon Sunscreen',
  'Minimalist 10% Niacinamide',
  'Cetaphil Gentle Skin Cleanser',
  'Cosrx Snail Mucin 96',
  'Maybelline Fit Me Matte Foundation',
  'Forest Essentials Soundarya 24K',
  'Kama Ayurveda Kumkumadi Serum',
  'Plum Green Tea Toner',
];

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  onSelectProduct,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { products: PRODUCTS_DATA } = useCatalogue();

  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, initialQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Autocomplete matching products in local catalogue
  const matchingProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return PRODUCTS_DATA.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q) ||
        p.keyIngredients.some((i) => i.toLowerCase().includes(q))
      );
    }).slice(0, 6);
  }, [query, PRODUCTS_DATA]);

  // Best single match (for store-specific live price preview)
  const topMatch = matchingProducts[0] || null;

  const handleOpenAllStores = () => {
    const trimmed = query.trim() || 'beauty';
    FIVE_STORES.forEach((store) => {
      window.open(store.getSearchUrl(trimmed), '_blank', 'noopener,noreferrer');
    });
  };

  const handleSelectProductItem = (p: Product) => {
    onClose();
    if (onSelectProduct) {
      onSelectProduct(p);
    } else {
      navigate(`/product/${p.slug || p.id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-espresso-950/65 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 pt-10 sm:pt-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-ivory rounded-3xl shadow-2xl border border-rose-200/80 overflow-hidden flex flex-col max-h-[88vh]"
        >
          {/* Header & Search Input */}
          <div className="p-4 sm:p-6 border-b border-rose-100 bg-white/90 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 text-ivory flex items-center justify-center font-serif font-bold text-sm shadow-xs">
                  5S
                </div>
                <div>
                  <h2 className="font-editorial text-xl sm:text-2xl font-bold text-espresso-950 leading-none">
                    5-Store Universal Beauty Compare
                  </h2>
                  <span className="text-[10px] tracking-widest uppercase text-espresso-400 font-sans block mt-1">
                    Nykaa • Amazon India • Tira • Purplle • Myntra
                  </span>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-rose-100 text-espresso-400 hover:text-espresso-700 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Input Form */}
            <div className="relative flex items-center bg-ivory-50 rounded-2xl border-2 border-rose-200/90 focus-within:border-rose-500 focus-within:ring-3 focus-within:ring-rose-200/50 transition-all shadow-inner">
              <Search className="w-5 h-5 text-espresso-400 ml-4 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Type any beauty product (e.g. Dot & Key Sunscreen, Maybelline Sky High, Snail Mucin)..."
                className="w-full bg-transparent px-3 py-3.5 text-sm sm:text-base text-espresso-900 placeholder-espresso-400 focus:outline-hidden font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1.5 mr-2 rounded-full hover:bg-rose-100 text-espresso-400 hover:text-espresso-700 transition-colors"
                  aria-label="Clear query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="hidden sm:flex items-center pr-3 shrink-0">
                <kbd className="px-2 py-0.5 text-[10px] font-bold text-espresso-400 bg-white border border-rose-200 rounded-md shadow-2xs">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Trending Chips if query is short */}
            {!query.trim() && (
              <div className="mt-3 flex items-center flex-wrap gap-1.5 text-xs text-espresso-600">
                <span className="text-[11px] font-semibold text-espresso-400 flex items-center space-x-1 mr-1">
                  <TrendingUp className="w-3 h-3 text-rose-500" />
                  <span>Trending:</span>
                </span>
                {TRENDING_QUERIES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuery(t)}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-rose-50 text-espresso-700 hover:text-rose-600 border border-rose-200/70 text-xs font-medium transition-all shadow-2xs"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* 1-Click "Compare Live Across All 5 Stores" Panel */}
            <div className="rounded-3xl bg-white border border-rose-200/80 p-4 sm:p-5 shadow-soft-lift space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-100/70 pb-3.5">
                <div>
                  <div className="inline-flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-rose-600 mb-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                    <span>Instant Live Cross-Store Search</span>
                  </div>
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-espresso-950">
                    {query.trim()
                      ? `Compare "${query.trim()}" Live Across 5 Stores`
                      : 'Compare Across 5 Authorized Indian Retailers'}
                  </h3>
                  <p className="text-xs text-espresso-500">
                    Deep search direct into Nykaa, Amazon India, Tira, Purplle, and Myntra simultaneously.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleOpenAllStores}
                  className="px-4 py-2 rounded-xl bg-espresso-800 hover:bg-espresso-950 text-ivory text-xs font-bold tracking-wide transition-all shadow-xs flex items-center justify-center space-x-1.5 shrink-0 self-start sm:self-auto"
                >
                  <span>Open All 5 in Tabs</span>
                  <ExternalLink className="w-3.5 h-3.5 text-champagne-300" />
                </button>
              </div>

              {/* 5-Store Comparison Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {FIVE_STORES.map((store) => {
                  const effectiveQuery = query.trim() || 'best skincare';
                  const storeUrl = store.getSearchUrl(effectiveQuery);

                  // Check if topMatch has an offer for this store
                  const storeOffer = topMatch?.storeOffers.find(
                    (o) => o.storeId.toLowerCase() === store.id || o.storeName.toLowerCase().includes(store.id)
                  );

                  return (
                    <div
                      key={store.id}
                      className={`rounded-2xl p-3.5 border ${store.borderColor} ${store.colorBg} flex flex-col justify-between hover:shadow-md transition-all group`}
                    >
                      <div>
                        {/* Store Badge */}
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${store.logoBg}`}
                          >
                            {store.name}
                          </span>
                          <span className="text-[9px] font-semibold text-espresso-400">
                            {store.badge.split(' ')[0]}
                          </span>
                        </div>

                        {/* Live Price Tag or Search State */}
                        <div className="my-2">
                          {storeOffer && storeOffer.price > 0 ? (
                            <div>
                              <div className="flex items-baseline space-x-1.5">
                                <span className="text-lg font-extrabold text-espresso-950 font-sans">
                                  ₹{storeOffer.price.toLocaleString('en-IN')}
                                </span>
                                {storeOffer.originalPrice && storeOffer.originalPrice > storeOffer.price && (
                                  <span className="text-[10px] text-espresso-400 line-through">
                                    ₹{storeOffer.originalPrice.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded-sm inline-block mt-0.5">
                                Live In Catalog
                              </span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-xs font-semibold text-espresso-700 block">
                                Live Store Search
                              </span>
                              <span className="text-[10px] text-espresso-400 block mt-0.5">
                                View instant results
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Perks */}
                        <p className="text-[10px] text-espresso-500 leading-tight mb-3">
                          {store.perks}
                        </p>
                      </div>

                      {/* Direct Link CTA */}
                      <a
                        href={storeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-2.5 rounded-xl bg-white hover:bg-espresso-800 hover:text-ivory text-espresso-800 border border-rose-200/80 text-xs font-bold tracking-wide transition-all flex items-center justify-center space-x-1 shadow-2xs group-hover:border-espresso-800"
                      >
                        <span>Search {store.name}</span>
                        <ExternalLink className="w-3 h-3 text-espresso-400 group-hover:text-champagne-300" />
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section: Matching Catalog Products */}
            {query.trim() && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-editorial text-lg font-bold text-espresso-950 flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-rose-500" />
                    <span>Curated Indian Catalog Matches ({matchingProducts.length})</span>
                  </h4>
                  <span className="text-xs text-espresso-500">
                    Live pricing verified across Indian stores
                  </span>
                </div>

                {matchingProducts.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-rose-100 space-y-2">
                    <p className="text-sm font-semibold text-espresso-700">
                      No exact catalog match for "{query}"
                    </p>
                    <p className="text-xs text-espresso-500 max-w-md mx-auto">
                      Use the 5-store comparison buttons above to search directly across Nykaa, Amazon India, Tira, Purplle, and Myntra!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {matchingProducts.map((p) => {
                      const lowestOffer = p.storeOffers.reduce(
                        (min, o) => (o.price < min.price ? o : min),
                        p.storeOffers[0]
                      );
                      const savings = p.originalPrice ? p.originalPrice - p.price : 0;
                      const savingsPct =
                        p.originalPrice && p.originalPrice > p.price
                          ? Math.round((savings / p.originalPrice) * 100)
                          : 0;

                      return (
                        <div
                          key={p.id}
                          onClick={() => handleSelectProductItem(p)}
                          className="p-3.5 rounded-2xl bg-white border border-rose-100/90 hover:border-rose-400 hover:shadow-luxury-card cursor-pointer transition-all flex items-center space-x-3.5 group"
                        >
                          <ProductImage
                            compact
                            src={p.image}
                            alt={p.name}
                            className="w-16 h-16 rounded-xl object-cover border border-rose-100 group-hover:scale-105 transition-transform"
                          />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-1.5 text-[10px] text-espresso-400 mb-0.5">
                              <span className="font-bold uppercase tracking-wider text-rose-500">
                                {p.brand}
                              </span>
                              <span>•</span>
                              <span>{p.subcategory}</span>
                            </div>

                            <h5 className="text-xs sm:text-sm font-bold text-espresso-900 truncate group-hover:text-rose-600 transition-colors">
                              {p.name}
                            </h5>

                            {/* Lowest Price and Best Store Badge */}
                            <div className="flex items-center justify-between mt-1.5">
                              <div className="flex items-baseline space-x-1.5">
                                <span className="text-sm font-extrabold text-espresso-950 font-sans">
                                  ₹{p.price.toLocaleString('en-IN')}
                                </span>
                                {p.originalPrice && p.originalPrice > p.price && (
                                  <span className="text-[11px] text-espresso-400 line-through">
                                    ₹{p.originalPrice.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>

                              {savingsPct > 0 && (
                                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                                  Save {savingsPct}%
                                </span>
                              )}
                            </div>

                            {lowestOffer && (
                              <div className="mt-1 flex items-center space-x-1 text-[10px] text-espresso-500">
                                <Crown className="w-3 h-3 text-amber-500" />
                                <span>Lowest on <strong>{lowestOffer.storeName}</strong></span>
                              </div>
                            )}
                          </div>

                          <div className="p-2 rounded-full bg-ivory-100 group-hover:bg-rose-500 group-hover:text-white text-espresso-400 transition-all shrink-0">
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
