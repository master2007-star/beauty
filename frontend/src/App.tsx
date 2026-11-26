import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { PriceProvider, useCatalogue } from './context/PriceContext';
import type { Product } from './types';

// Context
import { AuthProvider } from './context/AuthContext';

// Hooks
import { useWishlist } from './hooks/useWishlist';
import { usePriceTracker, PriceTrackerProvider } from './hooks/usePriceTracker';

// Components & Pages
import { Navbar } from './components/Navbar';
import { ScrollToTop } from './components/ScrollToTop';
import { WishlistDrawer } from './components/WishlistDrawer';
import { PriceTrackingModal } from './components/PriceTrackingModal';
import { AuthModal } from './components/AuthModal';
import { Footer } from './components/Footer';

import { DiscoveryHomePage } from './pages/DiscoveryHomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { WatchlistPage } from './pages/WatchlistPage';
import { ProfilePage } from './pages/ProfilePage';
import { RoutinesPage } from './pages/RoutinesPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const AppContent: React.FC = () => {
  const { products: PRODUCTS_DATA } = useCatalogue();
  const navigate = useNavigate();
  const location = useLocation();
  // Modal & Drawer State
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [wishlistDrawerTab, setWishlistDrawerTab] = useState<'watchlist' | 'alerts'>('watchlist');
  const [searchQuery, setSearchQuery] = useState('');
  const [trackingProductForModal, setTrackingProductForModal] = useState<Product | null>(null);

  // Hooks
  const { wishlist, toggleWishlist, clearWishlist, wishlistCount } = useWishlist();
  const {
    unreadAlertCount,
    activeTargetHitCount,
    getTrackedRecord,
    startTracking,
    stopTracking,
  } = usePriceTracker();

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else navigate(`/#${sectionId}`);
  };

  return (
    <div className="min-h-screen bg-ivory text-espresso-900 font-sans selection:bg-rose-200 selection:text-espresso-950 flex flex-col justify-between">
      {/* Global Navigation Header */}
      <Navbar
        searchQuery={searchQuery}
        onSearchQueryChange={(query) => {
          setSearchQuery(query);
          if (location.pathname !== '/') navigate('/');
        }}
        wishlistCount={wishlistCount}
        unreadAlertCount={unreadAlertCount + activeTargetHitCount}
        onOpenWishlist={() => {
          setWishlistDrawerTab('watchlist');
          setIsWishlistOpen(true);
        }}
        onOpenPriceAlerts={() => {
          setWishlistDrawerTab('alerts');
          setIsWishlistOpen(true);
        }}
      />

      {/* Dynamic Route View */}
      <div className="flex-1 pt-[var(--site-header-height,5rem)]">
        <Routes>
          <Route
            path="/"
            element={
              <DiscoveryHomePage
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
              />
            }
          />

          <Route path="/product/:slugOrId" element={<ProductDetailPage />} />

          <Route path="/watchlist" element={<WatchlistPage />} />

          <Route path="/profile" element={<ProfilePage />} />

          <Route path="/routines" element={<RoutinesPage />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      {/* Slide-out Wishlist & Price Alerts Drawer */}
      <AnimatePresence>
        {isWishlistOpen && (
          <WishlistDrawer
            isOpen={isWishlistOpen}
            onClose={() => setIsWishlistOpen(false)}
            initialTab={wishlistDrawerTab}
            wishlistIds={wishlist}
            allProducts={PRODUCTS_DATA}
            onRemoveFromWishlist={toggleWishlist}
            onClearWishlist={clearWishlist}
            onViewProduct={(p) => {
              setIsWishlistOpen(false);
              navigate(`/product/${p.slug || p.id}`);
            }}
            onExploreProducts={() => {
              setIsWishlistOpen(false);
              scrollToSection('catalog');
            }}
            onOpenPriceTrackerModal={(p) => setTrackingProductForModal(p)}
          />
        )}
      </AnimatePresence>

      {/* Price-Drop Alert & Target Price Modal */}
      <AnimatePresence>
        {trackingProductForModal && (
          <PriceTrackingModal
            isOpen={Boolean(trackingProductForModal)}
            onClose={() => setTrackingProductForModal(null)}
            product={trackingProductForModal}
            existingRecord={getTrackedRecord(trackingProductForModal.id)}
            onSaveTarget={(target, note) => {
              startTracking(trackingProductForModal.id, target, note);
            }}
            onRemoveTracking={() => {
              stopTracking(trackingProductForModal.id);
            }}
          />
        )}
      </AnimatePresence>

      {/* Auth Modal (Sign In / Register) */}
      <AuthModal />

      {/* Global Editorial Footer */}
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ScrollToTop />
      <AuthProvider>
        <PriceProvider>
          <PriceTrackerProvider>
            <AppContent />
          </PriceTrackerProvider>
        </PriceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
