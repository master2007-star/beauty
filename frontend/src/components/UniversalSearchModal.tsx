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
  RefreshCw,
  Settings,
  Check,
  AlertCircle,
  ShoppingBag,
  Globe,
  Zap,
} from 'lucide-react';
import type { Product, WebCompareResult, WebCompareResponse } from '../types';
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
    badge: '100% Authentic',
    colorBg: 'bg-[#FC2779]/5',
    colorText: 'text-[#FC2779]',
    borderColor: 'border-[#FC2779]/20',
    logoBg: 'bg-[#FC2779]',
    perks: 'Free shipping > ₹499 • 2-4 Days',
    getSearchUrl: (q) => `https://www.nykaa.com/search/result/?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'amazon',
    name: 'Amazon India',
    badge: 'Fast Prime',
    colorBg: 'bg-[#FF9900]/5',
    colorText: 'text-[#C77800]',
    borderColor: 'border-[#FF9900]/25',
    logoBg: 'bg-[#FF9900]',
    perks: 'Free Prime shipping • 1-2 Days',
    getSearchUrl: (q) => `https://www.amazon.in/s?k=${encodeURIComponent(q)}`,
  },
  {
    id: 'tira',
    name: 'Tira Beauty',
    badge: 'Reliance Luxe',
    colorBg: 'bg-[#671A37]/5',
    colorText: 'text-[#671A37]',
    borderColor: 'border-[#671A37]/20',
    logoBg: 'bg-[#671A37]',
    perks: 'Free shipping > ₹499 • 1-3 Days',
    getSearchUrl: (q) => `https://www.tirabeauty.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'purplle',
    name: 'Purplle',
    badge: 'Best Budget',
    colorBg: 'bg-[#78206E]/5',
    colorText: 'text-[#78206E]',
    borderColor: 'border-[#78206E]/20',
    logoBg: 'bg-[#78206E]',
    perks: 'Free shipping > ₹399 • 3-5 Days',
    getSearchUrl: (q) => `https://www.purplle.com/search?q=${encodeURIComponent(q)}`,
  },
  {
    id: 'myntra',
    name: 'Myntra',
    badge: 'Beauty Insider',
    colorBg: 'bg-[#EE5F73]/5',
    colorText: 'text-[#EE5F73]',
    borderColor: 'border-[#EE5F73]/20',
    logoBg: 'bg-[#EE5F73]',
    perks: 'Free shipping > ₹799 • 2-4 Days',
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
  'Dot & Key Sunscreen',
  'Minimalist Niacinamide',
  'Laneige Lip Sleeping Mask',
  'COSRX Snail Mucin',
  'Maybelline Sky High',
  'Cetaphil Gentle Skin Cleanser',
  'Soundarya 24K Gold',
];

const DEFAULT_WORKER_URL = 'https://pricewise-compare.a4megaboi.workers.dev';

const getInitialWorkerUrl = (): string => {
  return (
    localStorage.getItem('PRICEWISE_WORKER_URL') ||
    localStorage.getItem('pricewise_worker_api') ||
    (import.meta.env.VITE_LIVE_SEARCH_API as string) ||
    DEFAULT_WORKER_URL
  );
};

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Live Synced';
  try {
    const d = new Date(dateStr);
    const now = Date.now();
    const diffSec = Math.floor((now - d.getTime()) / 1000);
    if (diffSec < 60) return 'Updated just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Updated ${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Updated ${diffHours}h ago`;
    return 'Verified in catalog';
  } catch {
    return 'Live Synced';
  }
}

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

  // Cloudflare Worker Live Search State
  const [workerApiUrl, setWorkerApiUrl] = useState<string>(getInitialWorkerUrl);
  const [isEditingApi, setIsEditingApi] = useState(false);
  const [tempApiUrl, setTempApiUrl] = useState(workerApiUrl);
  const [apiStatus, setApiStatus] = useState<'idle' | 'testing' | 'valid' | 'invalid'>('idle');

  const [isLoadingWeb, setIsLoadingWeb] = useState(false);
  const [webResults, setWebResults] = useState<WebCompareResult[]>([]);
  const [webBestPrice, setWebBestPrice] = useState<number | null>(null);
  const [webError, setWebError] = useState<string | null>(null);
  const [hasSearchedWeb, setHasSearchedWeb] = useState(false);

  // Focus and initialize on open
  useEffect(() => {
    if (isOpen) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [isOpen, initialQuery]);

  // Handle ESC key
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
    }).slice(0, 5);
  }, [query, PRODUCTS_DATA]);

  const topMatch = matchingProducts[0] || null;

  // Auto-debounced Live Web Search via Cloudflare Worker
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 3) {
      setWebResults([]);
      setWebBestPrice(null);
      setWebError(null);
      setHasSearchedWeb(false);
      setIsLoadingWeb(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchLiveWebPrices(trimmed);
    }, 650);

    return () => clearTimeout(timer);
  }, [query, workerApiUrl]);

  // Fetch from Cloudflare Worker
  const fetchLiveWebPrices = async (searchTerm: string, overrideUrl?: string) => {
    if (!searchTerm) return;
    const activeUrl = (overrideUrl !== undefined ? overrideUrl : workerApiUrl).trim().replace(/\/+$/, '');

    if (!activeUrl) {
      setWebResults([]);
      setWebBestPrice(null);
      setWebError('Please configure your Cloudflare Worker URL in Settings.');
      return;
    }

    setIsLoadingWeb(true);
    setWebError(null);
    setHasSearchedWeb(true);

    try {
      const endpoint = `${activeUrl}/compare?q=${encodeURIComponent(searchTerm)}`;
      const res = await fetch(endpoint, {
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Worker returned status ${res.status}`);
      }

      const data: WebCompareResponse = await res.json();
      const validResults = (data.results || []).filter((r) => r.price && r.price > 0);
      setWebResults(validResults);
      setWebBestPrice(data.bestPrice || (validResults[0]?.price ?? null));
    } catch {
      setWebError('Edge Search temporarily offline. Please verify endpoint or use direct store search.');
      setWebResults([]);
      setWebBestPrice(null);
    } finally {
      setIsLoadingWeb(false);
    }
  };

  const testApiConnection = async (testUrl: string) => {
    setApiStatus('testing');
    try {
      const cleanBase = testUrl.trim().replace(/\/+$/, '');
      if (!cleanBase) {
        setApiStatus('invalid');
        return;
      }
      const res = await fetch(`${cleanBase}/health`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        setApiStatus('valid');
      } else {
        setApiStatus('invalid');
      }
    } catch {
      setApiStatus('invalid');
    }
  };

  const handleSaveApiUrl = () => {
    const clean = tempApiUrl.trim().replace(/\/+$/, '');
    setWorkerApiUrl(clean);
    if (clean) {
      localStorage.setItem('PRICEWISE_WORKER_URL', clean);
      localStorage.setItem('pricewise_worker_api', clean);
    } else {
      localStorage.removeItem('PRICEWISE_WORKER_URL');
      localStorage.removeItem('pricewise_worker_api');
    }
    setIsEditingApi(false);
    if (query.trim().length >= 3) {
      fetchLiveWebPrices(query.trim(), clean);
    }
  };

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

  const getStoreMeta = (retailerName: string): StoreSearchMeta => {
    const lower = retailerName.toLowerCase();
    const found = FIVE_STORES.find(
      (s) => lower.includes(s.id) || s.name.toLowerCase().includes(lower)
    );
    return (
      found || {
        id: 'generic',
        name: retailerName,
        badge: 'Verified Retailer',
        colorBg: 'bg-stone-50',
        colorText: 'text-stone-800',
        borderColor: 'border-stone-200',
        logoBg: 'bg-stone-800',
        perks: 'Standard shipping • Express available',
        getSearchUrl: (q) => `https://www.google.com/search?q=${encodeURIComponent(retailerName + ' ' + q)}`,
      }
    );
  };

  if (!isOpen) return null;

  // Stores that did NOT return an exact price for custom search
  const coveredStoreIds = new Set(
    topMatch
      ? topMatch.storeOffers.filter((o) => o.price > 0).map((o) => o.storeId.toLowerCase())
      : webResults.map((r) => getStoreMeta(r.retailer).id)
  );

  const missingStores = FIVE_STORES.filter((s) => !coveredStoreIds.has(s.id));

  // Highest price among web results for "Save vs highest" calculation
  const highestWebPrice = webResults.length > 0 ? Math.max(...webResults.map((r) => r.price)) : 0;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#1E1918]/70 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 pt-6 sm:pt-12">
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: -12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="relative w-full max-w-4xl bg-[#FAF7F5] rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header & Search Input */}
          <div className="p-4 sm:p-6 border-b border-stone-200/90 bg-white/95 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#B86B5E] via-[#C98991] to-[#1E1918] text-white flex items-center justify-center font-serif font-bold text-sm shadow-xs">
                  5S
                </div>
                <div>
                  <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#1E1918] leading-none">
                    5-Store Universal Beauty Compare
                  </h2>
                  <span className="text-[10px] tracking-widest uppercase text-stone-500 font-sans block mt-1">
                    Nykaa • Amazon India • Tira Beauty • Purplle • Myntra
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  onClick={() => setIsEditingApi((prev) => !prev)}
                  title="Configure Cloudflare Worker Edge Search API"
                  className={`p-2 rounded-full border transition-all min-h-[44px] min-w-[44px] flex items-center justify-center ${
                    isEditingApi
                      ? 'bg-rose-50 text-[#B86B5E] border-rose-300'
                      : 'hover:bg-stone-100 text-stone-500 hover:text-stone-800 border-transparent'
                  }`}
                  aria-label="Worker settings"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  onClick={onClose}
                  className="p-2 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-900 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Cloudflare Worker Endpoint Settings Panel */}
            <AnimatePresence>
              {isEditingApi && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden mb-3 p-3.5 bg-white rounded-2xl border border-stone-200 text-xs space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#1E1918] flex items-center space-x-1.5">
                      <Globe className="w-3.5 h-3.5 text-[#B86B5E]" />
                      <span>Cloudflare Worker Live Search Edge Endpoint</span>
                    </span>
                    <span className="text-[10px] text-stone-400">
                      Edge-accelerated comparison
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="url"
                      value={tempApiUrl}
                      onChange={(e) => {
                        setTempApiUrl(e.target.value);
                        setApiStatus('idle');
                      }}
                      placeholder="https://pricewise-compare.a4megaboi.workers.dev"
                      className="flex-1 px-3 py-2 bg-stone-50 rounded-xl border border-stone-300 text-[#1E1918] focus:outline-hidden focus:border-[#B86B5E] font-mono text-[11px]"
                    />
                    <button
                      type="button"
                      onClick={() => testApiConnection(tempApiUrl)}
                      disabled={apiStatus === 'testing'}
                      className="px-3 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-[#1E1918] font-semibold text-[11px] transition-colors shrink-0 min-h-[38px]"
                    >
                      {apiStatus === 'testing' ? 'Testing...' : 'Test'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveApiUrl}
                      className="px-3.5 py-2 rounded-xl bg-[#1E1918] hover:bg-black text-white font-semibold text-[11px] transition-colors shrink-0 min-h-[38px]"
                    >
                      Save
                    </button>
                  </div>

                  <p className="text-[10px] text-stone-500">
                    Active URL saved in <code>localStorage</code> (key: <code>PRICEWISE_WORKER_URL</code>) — instant updates with zero rebuild.
                  </p>

                  {apiStatus === 'valid' && (
                    <p className="text-[11px] text-[#1E6B52] flex items-center space-x-1 font-semibold">
                      <Check className="w-3 h-3 text-[#1E6B52]" />
                      <span>Worker is online and reachable! Live search active.</span>
                    </p>
                  )}
                  {apiStatus === 'invalid' && (
                    <p className="text-[11px] text-[#DC2626] flex items-center space-x-1 font-semibold">
                      <AlertCircle className="w-3 h-3 text-[#DC2626]" />
                      <span>Could not reach worker. Verify URL or check Cloudflare deployment.</span>
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input Form */}
            <div className="relative flex items-center bg-white rounded-2xl border-2 border-stone-200 focus-within:border-[#B86B5E] focus-within:ring-2 focus-within:ring-[#B86B5E]/30 transition-all shadow-inner">
              <Search className="w-5 h-5 text-stone-400 ml-4 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search any product (e.g. Dot & Key Sunscreen, Minimalist Niacinamide, Snail Mucin)..."
                className="w-full bg-transparent px-3 py-3.5 text-sm sm:text-base text-[#1E1918] placeholder-stone-400 focus:outline-hidden font-medium"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1.5 mr-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition-colors"
                  aria-label="Clear query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <div className="hidden sm:flex items-center pr-3 shrink-0 space-x-1.5">
                {isLoadingWeb && (
                  <RefreshCw className="w-4 h-4 text-[#B86B5E] animate-spin mr-1" />
                )}
                <kbd className="px-2 py-0.5 text-[10px] font-bold text-stone-400 bg-stone-100 border border-stone-200 rounded-md">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Live Store Scanning Status Strip */}
            <div className="mt-3 flex items-center flex-wrap gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-stone-500 mr-1 flex items-center space-x-1">
                {isLoadingWeb ? (
                  <RefreshCw className="w-3 h-3 text-[#B86B5E] animate-spin" />
                ) : (
                  <Zap className="w-3 h-3 text-[#B86B5E]" />
                )}
                <span>{isLoadingWeb ? 'Scanning Stores:' : 'Coverage:'}</span>
              </span>
              {FIVE_STORES.map((store) => {
                const isFound = webResults.some(
                  (r) => getStoreMeta(r.retailer).id === store.id
                );
                return (
                  <div
                    key={store.id}
                    className={`inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border transition-all ${
                      isLoadingWeb
                        ? 'bg-stone-100 border-stone-200 text-stone-500 animate-pulse'
                        : isFound
                        ? `${store.colorBg} ${store.borderColor} ${store.colorText}`
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}
                  >
                    <span>{store.name}</span>
                    {isLoadingWeb ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#B86B5E] animate-ping" />
                    ) : isFound ? (
                      <Check className="w-2.5 h-2.5" />
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* Trending Pills if query is empty */}
            {!query.trim() && (
              <div className="mt-3 flex items-center flex-wrap gap-1.5 text-xs text-stone-600">
                <span className="text-[11px] font-semibold text-stone-400 flex items-center space-x-1 mr-1">
                  <TrendingUp className="w-3 h-3 text-[#B86B5E]" />
                  <span>Trending:</span>
                </span>
                {TRENDING_QUERIES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setQuery(t)}
                    className="px-2.5 py-1 rounded-full bg-white hover:bg-stone-100 text-stone-700 hover:text-[#B86B5E] border border-stone-200 text-xs font-medium transition-all shadow-2xs min-h-[32px]"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* Top Bar with Scan Button & Open 5 Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-stone-200 shadow-2xs">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-[#F3EAE6] text-[#B86B5E]">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-editorial text-sm sm:text-base font-bold text-[#1E1918] leading-tight">
                    {query.trim()
                      ? `Comparing "${query.trim()}" Across 5 Stores`
                      : '5-Store Real-Time Beauty Engine'}
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Live selling prices, discounts & canonical direct store links.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {query.trim().length >= 3 && (
                  <button
                    type="button"
                    onClick={() => fetchLiveWebPrices(query.trim())}
                    disabled={isLoadingWeb}
                    className="px-3.5 py-2 rounded-xl border border-stone-300 hover:border-[#B86B5E] hover:bg-[#F3EAE6] text-[#1E1918] text-xs font-semibold transition-all flex items-center space-x-1.5 shadow-2xs min-h-[44px]"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-[#B86B5E] ${isLoadingWeb ? 'animate-spin' : ''}`}
                    />
                    <span>Scan Live Web</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleOpenAllStores}
                  className="px-3.5 py-2 rounded-xl bg-[#1E1918] hover:bg-black text-white text-xs font-bold tracking-wide transition-all shadow-xs flex items-center space-x-1.5 min-h-[44px]"
                >
                  <span>Open All 5 Stores</span>
                  <ExternalLink className="w-3.5 h-3.5 text-[#E8CAD0]" />
                </button>
              </div>
            </div>

            {/* CASE 1: Instant Catalog Match Found (Local Catalog + Live-Prices Sync) */}
            {topMatch && (
              <div className="space-y-4">
                <div className="p-4 sm:p-5 rounded-3xl bg-white border border-stone-200 shadow-soft-lift space-y-4">
                  {/* Hero Showcase Header of Matched Product */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
                    <div className="flex items-center space-x-3.5">
                      <ProductImage
                        compact
                        src={topMatch.image}
                        alt={topMatch.name}
                        className="w-16 h-16 rounded-2xl object-cover border border-stone-200 shadow-2xs"
                      />
                      <div>
                        <div className="flex items-center space-x-2 text-[10px] uppercase font-bold text-[#B86B5E] mb-0.5">
                          <Sparkles className="w-3 h-3" />
                          <span>Exact Verified Product Match</span>
                          <span>•</span>
                          <span className="text-stone-500">{topMatch.brand}</span>
                        </div>
                        <h4 className="font-editorial text-base sm:text-lg font-bold text-[#1E1918] leading-tight">
                          {topMatch.name}
                        </h4>
                        <span className="text-[11px] text-stone-500 font-sans block mt-0.5">
                          {topMatch.quantity || topMatch.subcategory} • Live Synced across authorized Indian retailers
                        </span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-stone-100">
                      <span className="text-[10px] uppercase tracking-wider text-stone-400 font-bold block">
                        Lowest In-Stock Price
                      </span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className="text-2xl font-extrabold text-[#1E1918] tabular-nums">
                          ₹{topMatch.price.toLocaleString('en-IN')}
                        </span>
                        {topMatch.originalPrice && topMatch.originalPrice > topMatch.price && (
                          <span className="text-xs text-stone-400 line-through tabular-nums">
                            ₹{topMatch.originalPrice.toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 5-Store Grid for Matched Product */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {FIVE_STORES.map((store) => {
                      const offer = topMatch.storeOffers.find(
                        (o) =>
                          o.storeId.toLowerCase() === store.id ||
                          o.storeName.toLowerCase().includes(store.id)
                      );

                      if (!offer || offer.price <= 0) return null;

                      const isLowest = offer.isLowestPrice || offer.price === topMatch.price;
                      const savings =
                        offer.originalPrice && offer.originalPrice > offer.price
                          ? offer.originalPrice - offer.price
                          : 0;
                      const savingsPct =
                        offer.originalPrice && offer.originalPrice > offer.price
                          ? Math.round((savings / offer.originalPrice) * 100)
                          : 0;

                      return (
                        <div
                          key={store.id}
                          className={`rounded-2xl p-3.5 border transition-all flex flex-col justify-between ${
                            isLowest
                              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30 shadow-md'
                              : `${store.colorBg} ${store.borderColor} hover:shadow-xs`
                          }`}
                        >
                          <div>
                            {/* Retailer Header */}
                            <div className="flex items-center justify-between mb-2">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${store.logoBg}`}
                              >
                                {store.name}
                              </span>
                              {isLowest ? (
                                <span className="inline-flex items-center space-x-0.5 px-1.5 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold shadow-2xs">
                                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                                  <span>BEST PRICE</span>
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-stone-400">
                                  {store.badge}
                                </span>
                              )}
                            </div>

                            {/* Live Price */}
                            <div className="my-2">
                              <div className="flex items-baseline space-x-1.5">
                                <span className="text-xl font-extrabold text-[#1E1918] tabular-nums">
                                  ₹{offer.price.toLocaleString('en-IN')}
                                </span>
                                {offer.originalPrice && offer.originalPrice > offer.price && (
                                  <span className="text-[10px] text-stone-400 line-through tabular-nums">
                                    ₹{offer.originalPrice.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center space-x-1 mt-1">
                                {savingsPct > 0 ? (
                                  <span className="text-[9px] font-bold text-[#1E6B52] bg-[#EAF5F0] border border-[#C6E7D8] px-1.5 py-0.5 rounded-md">
                                    Save ₹{savings} ({savingsPct}%)
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded-md">
                                    Verified In Stock
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-[10px] text-stone-500 leading-tight mb-3">
                              {store.perks}
                            </p>
                          </div>

                          {/* Direct Canonical Buy CTA */}
                          <a
                            href={offer.purchaseUrl || store.getSearchUrl(topMatch.name)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px] ${
                              isLowest
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-white hover:bg-[#1E1918] hover:text-white text-[#1E1918] border border-stone-200'
                            }`}
                          >
                            <span>Buy at ₹{offer.price}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      );
                    })}
                  </div>

                  {/* Compact Direct Search for Stores without an offer */}
                  {missingStores.length > 0 && (
                    <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                      <span className="text-[11px] font-semibold text-stone-400">
                        Check remaining stores directly:
                      </span>
                      {missingStores.map((ms) => (
                        <a
                          key={ms.id}
                          href={ms.getSearchUrl(topMatch.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-[#1E1918] text-[11px] font-semibold transition-colors flex items-center space-x-1 min-h-[36px]"
                        >
                          <span>{ms.name}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* CASE 2: Live Web Search via Cloudflare Worker */}
            {query.trim().length >= 3 && (
              <div className="space-y-4">
                {/* Section Header */}
                <div className="flex items-center justify-between">
                  <h4 className="font-editorial text-base sm:text-lg font-bold text-[#1E1918] flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-[#B86B5E]" />
                    <span>
                      Live Web Compare Across 5 Retailers ({webResults.length})
                    </span>
                  </h4>
                  <span className="text-[11px] text-stone-400">
                    Direct Cloudflare Edge API
                  </span>
                </div>

                {/* Loading Skeleton */}
                {isLoadingWeb && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="p-4 rounded-2xl bg-white border border-stone-200 shimmer-active space-y-3"
                      >
                        <div className="flex justify-between items-center">
                          <div className="w-20 h-5 bg-stone-200 rounded-md" />
                          <div className="w-16 h-4 bg-stone-100 rounded-md" />
                        </div>
                        <div className="w-full h-4 bg-stone-200 rounded-md" />
                        <div className="w-2/3 h-4 bg-stone-200 rounded-md" />
                        <div className="w-24 h-6 bg-stone-300 rounded-md" />
                        <div className="w-full h-11 bg-stone-200 rounded-xl" />
                      </div>
                    ))}
                  </div>
                )}

                {/* Web Results Found */}
                {!isLoadingWeb && webResults.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {webResults.map((r, idx) => {
                      const meta = getStoreMeta(r.retailer);
                      const isBestPrice =
                        webBestPrice !== null && r.price <= webBestPrice;
                      const savings =
                        r.mrp && r.mrp > r.price ? r.mrp - r.price : 0;
                      const savingsPct =
                        r.discountPercent !== undefined && r.discountPercent > 0
                          ? r.discountPercent
                          : r.mrp && r.mrp > r.price
                          ? Math.round((savings / r.mrp) * 100)
                          : 0;
                      const saveVsHighest =
                        isBestPrice && highestWebPrice > r.price
                          ? highestWebPrice - r.price
                          : 0;
                      const displayTitle = (r.title || r.productTitle || query)
                        .replace(/&amp;/g, '&')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'");

                      return (
                        <div
                          key={idx}
                          className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                            isBestPrice
                              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30 shadow-md'
                              : 'bg-white border-stone-200 hover:shadow-xs'
                          }`}
                        >
                          <div>
                            {/* Retailer badge & Lowest winner pill */}
                            <div className="flex items-center justify-between mb-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${meta.logoBg}`}
                              >
                                {r.retailer}
                              </span>
                              {isBestPrice ? (
                                <span className="inline-flex items-center space-x-0.5 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[9px] font-extrabold shadow-2xs">
                                  <Crown className="w-2.5 h-2.5 mr-0.5" />
                                  <span>BEST DEAL</span>
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-stone-400">
                                  {formatRelativeTime(r.updatedAt)}
                                </span>
                              )}
                            </div>

                            {/* Exact Matched Product Title */}
                            <h5 className="text-xs sm:text-sm font-bold text-[#1E1918] line-clamp-2 leading-snug mb-2">
                              {displayTitle}
                            </h5>

                            {/* Price Block */}
                            <div className="my-2.5">
                              <div className="flex items-baseline space-x-2">
                                <span className="text-xl font-extrabold text-[#1E1918] tabular-nums">
                                  ₹{r.price.toLocaleString('en-IN')}
                                </span>
                                {r.mrp && r.mrp > r.price && (
                                  <span className="text-xs text-stone-400 line-through tabular-nums">
                                    ₹{r.mrp.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                                {savingsPct > 0 && (
                                  <span className="text-[10px] font-bold text-[#1E6B52] bg-[#EAF5F0] border border-[#C6E7D8] px-1.5 py-0.5 rounded-md">
                                    Save {savingsPct}% OFF
                                  </span>
                                )}
                                {saveVsHighest > 0 && (
                                  <span className="text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                    Save ₹{saveVsHighest} vs highest
                                  </span>
                                )}
                                {r.source === 'snapshot' && (
                                  <span className="text-[9px] font-semibold text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded-md">
                                    Verified Snapshot
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Direct Canonical Buy Button */}
                          <a
                            href={r.url || r.productUrl || meta.getSearchUrl(query)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`w-full mt-3 py-2.5 px-3 rounded-xl text-xs font-bold tracking-wide transition-all flex items-center justify-center space-x-1.5 shadow-2xs min-h-[44px] ${
                              isBestPrice
                                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                : 'bg-[#1E1918] hover:bg-black text-white'
                            }`}
                          >
                            <span>Buy on {r.retailer} at ₹{r.price}</span>
                            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          </a>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* If web search returned no direct match or offline error */}
                {!isLoadingWeb && hasSearchedWeb && webResults.length === 0 && !topMatch && (
                  <div className="p-6 text-center bg-white rounded-2xl border border-stone-200 space-y-2">
                    <p className="text-sm font-semibold text-[#1E1918]">
                      No live prices indexed for "{query}" yet
                    </p>
                    <p className="text-xs text-stone-500 max-w-md mx-auto">
                      Use the direct links below to search "{query}" live on Nykaa, Amazon India, Tira, Purplle, and Myntra.
                    </p>
                    {webError && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 py-1.5 px-3 rounded-lg inline-block border border-amber-200">
                        {webError}
                      </p>
                    )}
                  </div>
                )}

                {/* Compact Direct Search for Remaining Retailers */}
                {!isLoadingWeb && missingStores.length > 0 && (
                  <div className="p-3 bg-white rounded-2xl border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] font-semibold text-stone-600 flex items-center space-x-1.5">
                      <ShoppingBag className="w-3.5 h-3.5 text-[#B86B5E]" />
                      <span>Direct 1-click search for "{query}":</span>
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {missingStores.map((ms) => (
                        <a
                          key={ms.id}
                          href={ms.getSearchUrl(query)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-stone-100 hover:bg-[#F3EAE6] text-[#1E1918] hover:text-[#B86B5E] text-[11px] font-semibold border border-stone-200 transition-colors flex items-center space-x-1 min-h-[36px]"
                        >
                          <span>{ms.name}</span>
                          <ExternalLink className="w-2.5 h-2.5 text-stone-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Other Matching Catalog Products (if user typed brand or category) */}
            {matchingProducts.length > 1 && (
              <div className="space-y-3 pt-2 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-editorial text-sm sm:text-base font-bold text-[#1E1918] flex items-center space-x-1.5">
                    <Layers className="w-4 h-4 text-[#B86B5E]" />
                    <span>Other Catalog Matches ({matchingProducts.length - 1})</span>
                  </h4>
                  <span className="text-xs text-stone-400">
                    Click to switch product
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {matchingProducts.slice(1).map((p) => {
                    const savings = p.originalPrice ? p.originalPrice - p.price : 0;
                    const savingsPct =
                      p.originalPrice && p.originalPrice > p.price
                        ? Math.round((savings / p.originalPrice) * 100)
                        : 0;

                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectProductItem(p)}
                        className="p-3 rounded-2xl bg-white border border-stone-200 hover:border-[#B86B5E] hover:shadow-xs cursor-pointer transition-all flex items-center space-x-3 group min-h-[64px]"
                      >
                        <ProductImage
                          compact
                          src={p.image}
                          alt={p.name}
                          className="w-12 h-12 rounded-xl object-cover border border-stone-100 group-hover:scale-105 transition-transform"
                        />

                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[#B86B5E] block">
                            {p.brand}
                          </span>
                          <h5 className="text-xs font-bold text-[#1E1918] truncate group-hover:text-[#B86B5E] transition-colors">
                            {p.name}
                          </h5>

                          <div className="flex items-center space-x-2 mt-1">
                            <span className="text-xs font-extrabold text-[#1E1918] tabular-nums">
                              ₹{p.price.toLocaleString('en-IN')}
                            </span>
                            {savingsPct > 0 && (
                              <span className="text-[9px] font-bold text-[#1E6B52] bg-[#EAF5F0] px-1.5 py-0.5 rounded-md">
                                {savingsPct}% OFF
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="p-1.5 rounded-full bg-stone-100 group-hover:bg-[#B86B5E] group-hover:text-white text-stone-400 transition-all shrink-0">
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
