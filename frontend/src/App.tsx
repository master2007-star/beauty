import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PriceProvider } from './context/PriceContext';
import { Navbar } from './components/Navbar';
import { PriceAlertDrawer } from './components/PriceAlertDrawer';
import { DiscoveryHomePage } from './pages/DiscoveryHomePage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { PRICE_ALERTS_EVENT, readPriceAlerts } from './utils/priceAlerts';

function AppContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [alertCount, setAlertCount] = useState(() => readPriceAlerts().length);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const refresh = () => setAlertCount(readPriceAlerts().length);
    window.addEventListener(PRICE_ALERTS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(PRICE_ALERTS_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  const updateSearch = (query: string) => {
    setSearchQuery(query);
    if (location.pathname !== '/') navigate('/');
  };
  return (
    <div className="min-h-screen bg-ivory font-sans text-espresso">
      <Navbar searchQuery={searchQuery} onSearchQueryChange={updateSearch} alertCount={alertCount} onOpenAlerts={() => setAlertsOpen(true)} />
      <div className="min-h-screen pt-[var(--site-header-height)]">
        <Routes>
          <Route path="/" element={<DiscoveryHomePage searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />} />
          <Route path="/product/:slugOrId" element={<ProductDetailPage />} />
          <Route path="*" element={<DiscoveryHomePage searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />} />
        </Routes>
      </div>
      <PriceAlertDrawer open={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </div>
  );
}

export default function App() {
  return <BrowserRouter basename={import.meta.env.BASE_URL}><PriceProvider><AppContent /></PriceProvider></BrowserRouter>;
}
