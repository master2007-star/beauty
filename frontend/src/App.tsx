import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import { PriceProvider, useCatalogue } from './context/PriceContext';
import type { Product, ProductCategory, Subcategory } from './types';

// Context
import { AuthProvider } from './context/AuthContext';

// Hooks
import { useWishlist } from './hooks/useWishlist';
import { usePriceTracker } from './hooks/usePriceTracker';

// Components & Pages
import { Navbar } from './components/Navbar';
import { ScrollToTop } from './components/ScrollToTop';
import { WishlistDrawer } from './components/WishlistDrawer';
import { ProductDetailModal } from './components/ProductDetailModal';
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
  // Navigation & Filter State
  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>('all');
  const [activeSubcategory, setActiveSubcategory] = useState<Subcategory | 'all'>('all');

  // Modal & Drawer State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);

  // Hooks
  const { wishlist, toggleWishlist, isWishlisted, clearWishlist, wishlistCount } = useWishlist();
  const { unreadAlertCount } = usePriceTracker();

  const handleSelectAlternativeProduct = (productId: string) => {
    const target = PRODUCTS_DATA.find((p) => p.id === productId);
    if (target) {
      setSelectedProduct(target);
    }
  };

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
        wishlistCount={wishlistCount}
        unreadAlertCount={unreadAlertCount}
        onOpenWishlist={() => setIsWishlistOpen(true)}
        onSelectCategory={(cat) => { setActiveCategory(cat); setActiveSubcategory('all'); }}
        onScrollToSection={scrollToSection}
        activeCategory={activeCategory}
      />

      {/* Dynamic Route View */}
      <div className="flex-1 pt-[var(--site-header-height,5rem)]">
        <Routes>
          <Route
            path="/"
            element={
              <DiscoveryHomePage
                wishlist={wishlist}
                toggleWishlist={toggleWishlist}
                isWishlisted={isWishlisted}
                onSelectProduct={(p) => setSelectedProduct(p)}
                activeCategory={activeCategory}
                setActiveCategory={setActiveCategory}
                activeSubcategory={activeSubcategory}
                setActiveSubcategory={setActiveSubcategory}
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

      {/* Slide-out Wishlist Drawer */}
      <AnimatePresence>
        {isWishlistOpen && (
          <WishlistDrawer
            isOpen={isWishlistOpen}
            onClose={() => setIsWishlistOpen(false)}
            wishlistIds={wishlist}
            allProducts={PRODUCTS_DATA}
            onRemoveFromWishlist={toggleWishlist}
            onClearWishlist={clearWishlist}
            onViewProduct={(p) => {
              setIsWishlistOpen(false);
              setSelectedProduct(p);
            }}
            onExploreProducts={() => {
              setIsWishlistOpen(false);
              scrollToSection('catalog');
            }}
          />
        )}
      </AnimatePresence>

      {/* Quick Product Detail Modal (for comparison triggers) */}
      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={PRODUCTS_DATA.find((product) => product.id === selectedProduct.id) || selectedProduct}
            onClose={() => setSelectedProduct(null)}
            isWishlisted={isWishlisted(selectedProduct.id)}
            onToggleWishlist={toggleWishlist}
            onSelectAlternative={handleSelectAlternativeProduct}
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
        <PriceProvider><AppContent /></PriceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
