import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';

import { useCatalogue } from '../context/PriceContext';
import { CATEGORIES_DATA } from '../data/categories';
import type { Product, ProductCategory, Subcategory } from '../types';

import { Hero } from '../components/Hero';
import { CategoryGrid } from '../components/CategoryGrid';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { DealSection } from '../components/DealSection';
import { DupesSection } from '../components/DupesSection';
import { HowToUseSection } from '../components/HowToUseSection';
import { ReviewShowcase } from '../components/ReviewShowcase';

interface DiscoveryHomePageProps {
  wishlist?: string[];
  toggleWishlist: (id: string) => void;
  isWishlisted: (id: string) => boolean;
  onSelectProduct: (p: Product) => void;
  activeCategory: ProductCategory | 'all';
  setActiveCategory: (cat: ProductCategory | 'all') => void;
  activeSubcategory: Subcategory | 'all';
  setActiveSubcategory: (sub: Subcategory | 'all') => void;
  onOpenUniversalSearch?: (query?: string) => void;
  onOpenPriceTracker?: (product: Product) => void;
}

export const DiscoveryHomePage: React.FC<DiscoveryHomePageProps> = ({
  toggleWishlist,
  isWishlisted,
  onSelectProduct,
  activeCategory,
  setActiveCategory,
  activeSubcategory,
  setActiveSubcategory,
  onOpenUniversalSearch,
  onOpenPriceTracker,
}) => {
  const navigate = useNavigate();
  const { products: PRODUCTS_DATA } = useCatalogue();
  const [searchQuery, setSearchQuery] = useState('');
  const [edgeProducts, setEdgeProducts] = useState<Array<{ id: string; title: string; brand: string; imageUrl: string | null; lowestPrice: number | null; discountPercent: number; availableStores: string[] }>>([]);
  const [edgeLoading, setEdgeLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setEdgeLoading(true);
      const base = (import.meta.env.VITE_COMPARE_API_URL || 'https://pricewise-compare.a4megaboi.workers.dev').replace(/\/$/, '');
      fetch(`${base}/search?q=${encodeURIComponent(searchQuery.trim())}`, { signal: controller.signal })
        .then((response) => response.ok ? response.json() : Promise.reject(new Error('Search unavailable')))
        .then((data) => setEdgeProducts(Array.isArray(data.products) ? data.products : []))
        .catch(async () => {
          try {
            const localBase = import.meta.env.BASE_URL || '/';
            const response = await fetch(`${localBase.endsWith('/') ? localBase : `${localBase}/`}data/live-prices.json`, { signal: controller.signal });
            const snapshot = await response.json();
            const tokens = searchQuery.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter((token) => token.length > 1);
            const entries = Object.values(snapshot.products || {}) as any[];
            const matches = entries.map((entry) => {
              const haystack = `${entry.brand || ''} ${entry.productName || ''}`.toLowerCase();
              return { entry, score: tokens.filter((token) => haystack.includes(token)).length / Math.max(1, tokens.length) };
            }).filter((match) => !tokens.length || match.score >= 0.4).sort((a, b) => b.score - a.score).slice(0, 12);
            setEdgeProducts(matches.map(({ entry }) => {
              const offers = (entry.offers || []).filter((offer: any) => offer.inStock !== false && Number(offer.price) > 0);
              const price = offers.length ? Math.min(...offers.map((offer: any) => Number(offer.price))) : null;
              const local = PRODUCTS_DATA.find((product) => product.brand.toLowerCase() === String(entry.brand || '').toLowerCase() && product.name.toLowerCase().includes(String(entry.productName || '').toLowerCase().slice(0, 14)));
              return { id: entry.productId || entry.productName, title: entry.productName || '', brand: entry.brand || '', imageUrl: local?.image || null, lowestPrice: price, discountPercent: 0, availableStores: offers.map((offer: any) => offer.storeName || offer.storeId) };
            }));
          } catch { setEdgeProducts([]); }
        })
        .finally(() => setEdgeLoading(false));
    }, searchQuery ? 300 : 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [searchQuery]);

  // Search & Filter State
  const [selectedBrand, setSelectedBrand] = useState<string | 'all'>('all');
  const [selectedStore, setSelectedStore] = useState<'all' | 'nykaa' | 'amazon' | 'tira' | 'purplle' | 'myntra'>('all');
  const [selectedSkinType, setSelectedSkinType] = useState<string | 'all'>('all');
  const [selectedBudget, setSelectedBudget] = useState<'all' | 'under-500' | '500-1000' | '1000-2500' | 'above-2500'>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name-asc' | 'rating' | 'best-deal' | 'store-count'>('featured');

  // Extract all distinct brands
  const allBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    PRODUCTS_DATA.forEach((p) => brandsSet.add(p.brand));
    return Array.from(brandsSet).sort();
  }, [PRODUCTS_DATA]);

  const skinTypes = [
    'All Skin Types',
    'Oily',
    'Dry',
    'Sensitive',
    'Combination',
    'Acne-Prone',
    'Normal',
  ];

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    return PRODUCTS_DATA.filter((product) => {
      if (activeCategory !== 'all' && product.category !== activeCategory) return false;
      if (activeSubcategory !== 'all' && product.subcategory !== activeSubcategory) return false;
      if (selectedBrand !== 'all' && product.brand !== selectedBrand) return false;

      if (selectedStore !== 'all') {
        const hasStore = product.storeOffers.some(
          (o) =>
            (o.storeId.toLowerCase() === selectedStore ||
              o.storeName.toLowerCase().includes(selectedStore)) &&
            o.inStock &&
            o.price > 0
        );
        if (!hasStore) return false;
      }

      if (selectedSkinType !== 'all') {
        if (!product.skinType) return false;
        const normalized = product.skinType.toLowerCase();
        if (selectedSkinType === 'All Skin Types') {
          if (!normalized.includes('all skin')) return false;
        } else if (!normalized.includes(selectedSkinType.toLowerCase())) {
          return false;
        }
      }

      if (selectedBudget === 'under-500' && product.price > 500) return false;
      if (selectedBudget === '500-1000' && (product.price < 500 || product.price > 1000)) return false;
      if (selectedBudget === '1000-2500' && (product.price < 1000 || product.price > 2500)) return false;
      if (selectedBudget === 'above-2500' && product.price < 2500) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = product.name.toLowerCase().includes(q);
        const matchesBrand = product.brand.toLowerCase().includes(q);
        const matchesCategory = product.category.toLowerCase().includes(q);
        const matchesSubcat = product.subcategory.toLowerCase().includes(q);
        const matchesIngredients = product.keyIngredients.some((i) => i.toLowerCase().includes(q));
        const matchesSkin = product.skinType ? product.skinType.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesBrand && !matchesCategory && !matchesSubcat && !matchesIngredients && !matchesSkin) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'store-count') return b.storeOffers.filter((offer) => offer.price > 0).length - a.storeOffers.filter((offer) => offer.price > 0).length;
      if (sortBy === 'best-deal') {
        const aScore = a.dealScore || (a.originalPrice ? a.originalPrice - a.price : 0);
        const bScore = b.dealScore || (b.originalPrice ? b.originalPrice - b.price : 0);
        return bScore - aScore;
      }
      return (b.isTrending ? 1 : 0) - (a.isTrending ? 1 : 0);
    });
  }, [PRODUCTS_DATA, activeCategory, activeSubcategory, selectedBrand, selectedStore, selectedSkinType, selectedBudget, searchQuery, sortBy]);

  const bestDeals = useMemo(() => {
    return PRODUCTS_DATA.filter((p) => p.isBestDeal || (p.originalPrice && p.originalPrice > p.price));
  }, [PRODUCTS_DATA]);

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleResetFilters = () => {
    setActiveCategory('all');
    setActiveSubcategory('all');
    setSelectedBrand('all');
    setSelectedStore('all');
    setSelectedSkinType('all');
    setSelectedBudget('all');
    setSearchQuery('');
    setSortBy('featured');
  };

  const hasActiveFilters = Boolean(
    activeCategory !== 'all' ||
    activeSubcategory !== 'all' ||
    selectedBrand !== 'all' ||
    selectedStore !== 'all' ||
    selectedSkinType !== 'all' ||
    selectedBudget !== 'all' ||
    searchQuery.trim() ||
    sortBy !== 'featured'
  );

  return (
    <main>
      {/* 1. Hero Campaign Section */}
      <Hero
        spotlight={PRODUCTS_DATA[0]}
        onSearch={(query: string) => setSearchQuery(query)}
        onExploreClick={() => scrollToSection('catalog')}
        onDupesClick={() => scrollToSection('dupes')}
        onOpenUniversalSearch={onOpenUniversalSearch}
        onSelectProduct={(p) => navigate(`/product/${p.slug || p.id}`)}
      />

      {/* 2. Visual Categories Navigation */}
      <CategoryGrid
        selectedSubcategory={activeSubcategory}
        onSelectSubcategory={(sub: Subcategory) => {
          setActiveSubcategory(sub);
          const match = CATEGORIES_DATA.find((c) => c.name === sub);
          if (match) setActiveCategory(match.category);
          scrollToSection('catalog');
        }}
      />

      {/* 3. Catalog Section with Search, Multi-Filter Toolbar & Sorting */}
      <section id="catalog" className="py-14 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="text-xs font-bold tracking-widest uppercase text-rose-500">
                Indian Skincare & Makeup Discovery
              </span>
              <span className="text-espresso-300">•</span>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-champagne-100 text-espresso-700 border border-champagne-300">
                Phase 3 Live
              </span>
            </div>
            <h2 className="font-editorial text-4xl sm:text-5xl font-medium text-espresso-800 tracking-tight">
              Find your next beauty essential
            </h2>
            <p className="text-espresso-600 text-xs sm:text-sm mt-1">
              Showing {filteredProducts.length} authentic beauty products with multi-store comparison across Nykaa, Tira, Amazon, Purplle, and Myntra.
            </p>
          </div>

          {/* Quick Department Switcher */}
          <div className="flex flex-wrap items-center p-1 bg-white rounded-xl border border-rose-200/80 text-xs shadow-2xs">
            {(['all', 'skincare', 'makeup', 'haircare', 'bodycare'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setActiveSubcategory('all');
                }}
                className={`px-3 py-1.5 rounded-lg font-semibold capitalize transition-colors ${
                  activeCategory === cat
                    ? 'bg-espresso-800 text-ivory'
                    : 'text-espresso-600 hover:text-espresso-900'
                }`}
              >
                {cat === 'all' ? 'All' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Search & Multi-Filter Control Strip */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-rose-200/90 shadow-soft-lift mb-6 space-y-4">
          {/* Row 1: Search Bar with Clear Button */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search products, brands and ingredients"
              placeholder="Search products, brands and ingredients"
              className="w-full min-h-12 pl-10 pr-10 rounded-xl bg-[#faf7f5] border border-[#eadcd6] text-sm text-espresso-800 placeholder-espresso-400 focus-visible:border-[#b56558] focus-visible:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-espresso-400 hover:text-rose-500 rounded-full"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Row 2: Secondary Dropdown Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {/* Brand Filter */}
            <div className="relative">
              <label className="text-[10px] font-bold uppercase tracking-wider text-espresso-400 block mb-1">
                Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-rose-200 bg-ivory-50 text-espresso-800 font-medium focus:outline-hidden focus:border-rose-400 cursor-pointer"
              >
                <option value="all">All Brands</option>
                {allBrands.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            {/* Skin Type Filter */}
            <div className="relative">
              <label className="text-[10px] font-bold uppercase tracking-wider text-espresso-400 block mb-1">
                Skin Type
              </label>
              <select
                value={selectedSkinType}
                onChange={(e) => setSelectedSkinType(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-rose-200 bg-ivory-50 text-espresso-800 font-medium focus:outline-hidden focus:border-rose-400 cursor-pointer"
              >
                <option value="all">Any Skin Type</option>
                {skinTypes.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
            </div>

            {/* Budget Presets */}
            <div className="relative">
              <label className="text-[10px] font-bold uppercase tracking-wider text-espresso-400 block mb-1">
                Budget Range
              </label>
              <select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-rose-200 bg-ivory-50 text-espresso-800 font-medium focus:outline-hidden focus:border-rose-400 cursor-pointer"
              >
                <option value="all">Any Budget</option>
                <option value="under-500">Under ₹500</option>
                <option value="500-1000">₹500 - ₹1,000</option>
                <option value="1000-2500">₹1,000 - ₹2,500</option>
                <option value="above-2500">Luxury (₹2,500+)</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="relative">
              <label className="text-[10px] font-bold uppercase tracking-wider text-espresso-400 block mb-1">
                Sort Results
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-rose-200 bg-ivory-50 text-espresso-800 font-medium focus:outline-hidden focus:border-rose-400 cursor-pointer"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Lowest price</option>
                <option value="price-desc">Highest price</option>
                <option value="name-asc">Name A–Z</option>
                <option value="best-deal">Best discount</option>
                <option value="store-count">Most stores</option>
                <option value="rating">★ Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Row 3: Store Filter Pill Strip */}
          <div className="pt-2 border-t border-rose-100/70">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-espresso-400">
                Filter By Store
              </span>
              <span className="text-[10px] text-espresso-400">
                5 Indian Retailers
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {[
                { id: 'all', label: 'All Stores' },
                { id: 'nykaa', label: 'Nykaa' },
                { id: 'amazon', label: 'Amazon India' },
                { id: 'tira', label: 'Tira Beauty' },
                { id: 'purplle', label: 'Purplle' },
                { id: 'myntra', label: 'Myntra' },
              ].map((s) => {
                const isActive = selectedStore === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedStore(s.id as any)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                      isActive
                        ? 'bg-espresso-800 text-ivory shadow-xs'
                        : 'bg-ivory-100 text-espresso-700 hover:bg-champagne-100 hover:text-espresso-900 border border-rose-200/60'
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Filter Pills & Reset Button */}
          {hasActiveFilters && (
            <div className="pt-2 border-t border-rose-100 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-espresso-500">
                <span className="font-semibold text-espresso-700">Active Filters:</span>
                {selectedStore !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                    <span className="capitalize">Store: {selectedStore}</span>
                    <button onClick={() => setSelectedStore('all')}>✕</button>
                  </span>
                )}
                {activeCategory !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1">
                    <span>Dept: {activeCategory}</span>
                    <button onClick={() => setActiveCategory('all')}>✕</button>
                  </span>
                )}
                {selectedBrand !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1">
                    <span>Brand: {selectedBrand}</span>
                    <button onClick={() => setSelectedBrand('all')}>✕</button>
                  </span>
                )}
                {selectedSkinType !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-sage-50 text-sage-800 border border-sage-200 flex items-center space-x-1">
                    <span>Skin: {selectedSkinType}</span>
                    <button onClick={() => setSelectedSkinType('all')}>✕</button>
                  </span>
                )}
                {selectedBudget !== 'all' && (
                  <span className="px-2 py-0.5 rounded-full bg-champagne-50 text-champagne-800 border border-champagne-300 flex items-center space-x-1">
                    <span>Budget: {selectedBudget}</span>
                    <button onClick={() => setSelectedBudget('all')}>✕</button>
                  </span>
                )}
                {searchQuery.trim() && (
                  <span className="px-2 py-0.5 rounded-full bg-ivory-200 text-espresso-800 border border-rose-200 flex items-center space-x-1">
                    <span>Query: "{searchQuery}"</span>
                    <button onClick={() => setSearchQuery('')}>✕</button>
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 underline underline-offset-2 transition-colors ml-auto"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>

        {searchQuery.trim() && edgeLoading && edgeProducts.length === 0 && (
          <div className="mb-9 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-label="Loading live search results" aria-live="polite">
            {[0, 1, 2, 3].map((item) => <div key={item} className="shimmer-active aspect-[4/5] rounded-2xl border border-[#eadcd6] bg-white" />)}
          </div>
        )}
        {searchQuery.trim() && edgeProducts.length > 0 && (
          <section className="mb-9" aria-label="Live search results">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div><h3 className="font-editorial text-2xl font-semibold text-[#1a1514]">More to discover</h3><p className="mt-1 text-xs text-[#6e605c]">Live product matches from Tira Beauty and Nykaa</p></div>
              {edgeLoading && <span className="text-xs text-[#6e605c]" aria-live="polite">Refreshing…</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {edgeProducts.slice(0, 8).map((item) => (
                <button type="button" key={item.id} onClick={() => onOpenUniversalSearch?.(`${item.brand} ${item.title}`)} className="group min-w-0 overflow-hidden rounded-2xl border border-[#eadcd6] bg-white text-left shadow-soft-lift transition-shadow hover:shadow-luxury-card focus-visible:outline-offset-2">
                  <ProductImage src={item.imageUrl || ''} alt={item.title} brand={item.brand} loading="lazy" className="aspect-[4/3] transition-transform duration-300 ease-out group-hover:scale-[1.03]" />
                  <span className="block p-3"><span className="block truncate text-[10px] font-bold uppercase tracking-[0.14em] text-[#6e605c]">{item.brand}</span><span className="mt-1 line-clamp-2 min-h-10 text-sm text-[#1a1514]">{item.title}</span><span className="mt-3 flex items-center justify-between gap-1"><strong className="tabular-nums text-base">{item.lowestPrice ? `₹${item.lowestPrice.toLocaleString('en-IN')}` : 'Check price'}</strong><span className="text-[10px] font-semibold text-[#17634b]">Compare stores</span></span></span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Product Cards Grid or Empty State */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-rose-100 p-8 shadow-soft-lift max-w-xl mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-400 flex items-center justify-center mx-auto text-2xl font-serif">
              ✦
            </div>
            <h3 className="font-editorial text-2xl font-bold text-espresso-800">
              No matching beauty products found
            </h3>
            <p className="text-xs sm:text-sm text-espresso-500 leading-relaxed">
              We couldn't find any products matching your specific combination of filters. Try clearing your search keyword or switching to "All Brands".
            </p>
            <button
              onClick={handleResetFilters}
              className="mt-2 px-5 py-2.5 rounded-xl bg-espresso-800 text-ivory text-xs font-semibold hover:bg-espresso-900 transition-colors shadow-xs"
            >
              Reset Filters & Show Full Catalog
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                isWishlisted={isWishlisted(product.id)}
                onToggleWishlist={toggleWishlist}
                onViewProduct={() => navigate(`/product/${product.slug || product.id}`)}
                onComparePrices={() => onSelectProduct(product)}
                onOpenPriceTracker={onOpenPriceTracker}
                onViewAlternative={(p) => {
                  if (p.dupeId) {
                    const dupe = PRODUCTS_DATA.find((x) => x.id === p.dupeId);
                    if (dupe) navigate(`/product/${dupe.slug || dupe.id}`);
                  }
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Deals Section */}
      <DealSection
        deals={bestDeals}
        onViewProduct={(p) => navigate(`/product/${p.slug || p.id}`)}
        onToggleWishlist={toggleWishlist}
        isWishlisted={isWishlisted}
      />

      {/* 5. Affordable Alternatives */}
      <DupesSection
        onSelectAlternative={(productId) => {
          const target = PRODUCTS_DATA.find((p) => p.id === productId);
          if (target) navigate(`/product/${target.slug || target.id}`);
        }}
      />

      {/* 6. Educational How to Use / Routine Section */}
      <HowToUseSection />

      {/* 7. Multi-Platform Reviews Showcase */}
      <ReviewShowcase />
    </main>
  );
};
