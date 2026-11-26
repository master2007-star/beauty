import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Sparkles,
  ArrowDown,
  ExternalLink,
} from 'lucide-react';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';
import { useCatalogue } from '../context/PriceContext';

interface HeroProps {
  spotlight: Product;
  onSearch: (query: string) => void;
  onExploreClick: () => void;
  onDupesClick: () => void;
  onOpenUniversalSearch?: (query?: string) => void;
  onSelectProduct?: (product: Product) => void;
}

export const Hero: React.FC<HeroProps> = ({
  spotlight,
  onSearch,
  onExploreClick,
  onDupesClick,
  onOpenUniversalSearch,
  onSelectProduct,
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { products: PRODUCTS_DATA } = useCatalogue();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      if (onOpenUniversalSearch) {
        onOpenUniversalSearch(searchInput.trim());
      } else {
        onSearch(searchInput.trim());
        onExploreClick();
      }
    }
  };

  // Instant autocomplete matching in Hero
  const heroMatches = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return [];
    return PRODUCTS_DATA.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.subcategory.toLowerCase().includes(q)
    ).slice(0, 3);
  }, [searchInput, PRODUCTS_DATA]);

  const trendingTags = [
    'Dot & Key Sunscreen',
    'Minimalist Niacinamide',
    'Laneige Lip Sleeping Mask',
    'COSRX Snail Mucin',
    'Maybelline Sky High',
  ];

  return (
    <section id="hero" className="relative pt-10 pb-16 sm:pt-14 sm:pb-20 overflow-hidden">
      {/* Background ambient lighting accents */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] pointer-events-none opacity-40">
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-rose-200/50 blur-3xl" />
        <div className="absolute top-20 right-10 w-80 h-80 rounded-full bg-champagne-200/60 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-72 h-72 rounded-full bg-sage-200/40 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Text & Editorial Intro */}
          <div className="md:col-span-7 text-center md:text-left space-y-6">
            {/* Tagline Badge */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-50/90 border border-rose-200/80 text-rose-700 text-xs font-semibold tracking-wider uppercase shadow-xs backdrop-blur-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
              <span>Instant 5-Store Price Intelligence • Live Across India</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="font-editorial text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-espresso-950 leading-[1.08]"
            >
              Discover Beauty. <br className="hidden sm:inline" />
              <span className="font-serif italic font-normal text-rose-500">
                Compare Smarter Across 5 Stores.
              </span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-base sm:text-lg text-espresso-600/90 max-w-xl mx-auto md:mx-0 font-normal leading-relaxed"
            >
              Compare live prices, verified stock, and delivery times simultaneously across{' '}
              <strong className="text-espresso-900 font-semibold">Nykaa, Amazon India, Tira, Purplle, and Myntra</strong>.
            </motion.p>

            {/* Interactive 5-Store Universal Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="relative max-w-xl mx-auto md:mx-0 z-30"
            >
              <form onSubmit={handleSearchSubmit} className="relative">
                <div className="relative flex items-center shadow-luxury-card rounded-full bg-white p-1.5 border-2 border-rose-200/90 focus-within:border-rose-400 focus-within:ring-3 focus-within:ring-rose-200/40 transition-all">
                  <Search className="w-5 h-5 text-espresso-400 ml-3.5 shrink-0" />
                  <input
                    type="text"
                    value={searchInput}
                    onFocus={() => setIsFocused(true)}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Compare any product across 5 stores (e.g. Dot & Key, Maybelline)..."
                    className="w-full bg-transparent px-3 py-2 text-sm text-espresso-900 placeholder-espresso-400 focus:outline-hidden font-medium"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-full bg-espresso-800 hover:bg-espresso-950 text-ivory text-xs sm:text-sm font-semibold tracking-wide transition-all shrink-0 hover:shadow-md flex items-center space-x-1.5 min-h-[44px]"
                  >
                    <span>Scan Live Web</span>
                    <Sparkles className="w-3.5 h-3.5 text-champagne-300" />
                  </button>
                </div>
              </form>

              {/* Autocomplete Dropdown Popup */}
              <AnimatePresence>
                {isFocused && searchInput.trim().length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute left-0 right-0 mt-2 bg-white rounded-3xl border border-rose-200 shadow-2xl overflow-hidden z-40 p-4 space-y-3"
                  >
                    {/* 1-Click Multi-Store Trigger Banner */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-ivory-100 border border-rose-100">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600 block">
                          Universal Search
                        </span>
                        <p className="text-xs font-bold text-espresso-900 truncate">
                          Compare "{searchInput.trim()}" across Nykaa, Amazon, Tira, Purplle, Myntra
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsFocused(false);
                          if (onOpenUniversalSearch) onOpenUniversalSearch(searchInput.trim());
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-espresso-800 text-ivory text-xs font-bold hover:bg-espresso-950 transition-colors shrink-0 flex items-center space-x-1"
                      >
                        <span>Open Panel</span>
                        <ExternalLink className="w-3 h-3 text-champagne-300" />
                      </button>
                    </div>

                    {/* Matching Local Catalog Products */}
                    {heroMatches.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-espresso-400 uppercase tracking-wider block">
                          Instant Catalog Matches
                        </span>
                        {heroMatches.map((p) => {
                          const lowest = p.storeOffers.reduce(
                            (min, o) => (o.price < min.price ? o : min),
                            p.storeOffers[0]
                          );
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                setIsFocused(false);
                                if (onSelectProduct) onSelectProduct(p);
                              }}
                              className="p-2.5 rounded-xl hover:bg-rose-50/70 border border-transparent hover:border-rose-200 flex items-center justify-between cursor-pointer transition-all"
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <ProductImage
                                  compact
                                  src={p.image}
                                  alt={p.name}
                                  className="w-10 h-10 rounded-lg object-cover border border-rose-100 shrink-0"
                                />
                                <div className="min-w-0">
                                  <span className="text-[10px] font-bold uppercase text-rose-500 block">
                                    {p.brand}
                                  </span>
                                  <h5 className="text-xs font-bold text-espresso-900 truncate">
                                    {p.name}
                                  </h5>
                                </div>
                              </div>
                              <div className="text-right shrink-0 pl-3">
                                <span className="text-sm font-extrabold text-espresso-950 font-sans block">
                                  ₹{p.price.toLocaleString('en-IN')}
                                </span>
                                {lowest && (
                                  <span className="text-[10px] text-emerald-700 font-semibold block">
                                    on {lowest.storeName}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Instant Search Tags */}
              <div className="mt-3 flex items-center justify-center md:justify-start flex-wrap gap-1.5 text-xs text-espresso-500">
                <span className="text-[11px] font-medium text-espresso-400">Popular:</span>
                {trendingTags.map((tag) => (
                  <button
                    type="button"
                    key={tag}
                    onClick={() => {
                      setSearchInput(tag);
                      if (onOpenUniversalSearch) onOpenUniversalSearch(tag);
                      else {
                        onSearch(tag);
                        onExploreClick();
                      }
                    }}
                    className="px-2.5 py-0.5 rounded-full bg-white/80 hover:bg-rose-100 hover:text-rose-700 border border-rose-100 transition-colors text-[11px] shadow-2xs font-medium"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="pt-2 flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4"
            >
              <button
                onClick={onExploreClick}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-rose-500 hover:bg-rose-600 text-ivory font-semibold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 group"
              >
                <span>Explore Catalog & Live Prices</span>
                <ArrowDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
              </button>

              <button
                onClick={onDupesClick}
                className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white hover:bg-champagne-50 text-espresso-700 border border-champagne-300 font-semibold text-sm tracking-wide transition-all flex items-center justify-center space-x-2 shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-champagne-500" />
                <span>Find Luxury Dupes</span>
              </button>
            </motion.div>

            {/* 5-Store Authorized Badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="pt-4 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-xs text-espresso-600"
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-espresso-400">
                Live Coverage:
              </span>
              <span className="px-2.5 py-1 rounded-md bg-pink-50 text-pink-700 font-bold text-[11px] border border-pink-200">
                Nykaa
              </span>
              <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 font-bold text-[11px] border border-amber-200">
                Amazon India
              </span>
              <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-900 font-bold text-[11px] border border-rose-200">
                Tira Beauty
              </span>
              <span className="px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 font-bold text-[11px] border border-purple-200">
                Purplle
              </span>
              <span className="px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                Myntra
              </span>
            </motion.div>
          </div>

          {/* Right Column: Editorial Hero Campaign Visual */}
          <div className="md:col-span-5 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.9, delay: 0.2 }}
              className="relative mx-auto max-w-md md:max-w-none"
            >
              {/* Outer decorative border frame */}
              <div className="absolute -inset-3 rounded-3xl border border-champagne-300/40 transform rotate-1 pointer-events-none" />

              {/* Main campaign image card */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-rose-200/60 bg-white">
                <ProductImage
                  compact
                  src={spotlight.image}
                  alt={`${spotlight.brand} ${spotlight.name}`}
                  className="w-full h-[320px] sm:h-[380px] lg:h-[450px]"
                />

                {/* Editorial Overlay Pill */}
                <div className="absolute bottom-5 inset-x-5 glass-panel rounded-2xl p-4 shadow-luxury-card border border-rose-200/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-1 text-[11px] font-bold tracking-wider text-rose-600 uppercase">
                        <Sparkles className="w-3 h-3 text-rose-500" />
                        <span>Today's Spotlight</span>
                      </div>
                      <h4 className="font-editorial text-lg font-bold text-espresso-900">
                        {spotlight.name}
                      </h4>
                      <p className="text-xs text-espresso-600 font-medium">
                        {spotlight.price > 0
                          ? `Lowest Live Price: ₹${spotlight.price.toLocaleString('en-IN')}`
                          : 'Live price verified'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-block bg-rose-500 hover:bg-rose-600 text-ivory text-xs font-bold px-3 py-1.5 rounded-full shadow-xs transition-colors">
                        {spotlight.originalPrice &&
                        spotlight.price > 0 &&
                        spotlight.originalPrice > spotlight.price
                          ? `Save ${Math.round(
                              ((spotlight.originalPrice - spotlight.price) /
                                spotlight.originalPrice) *
                                100
                            )}%`
                          : 'View Deal'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};
