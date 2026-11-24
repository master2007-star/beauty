import { useState, useEffect, useCallback, useRef, createContext, useContext, createElement, type ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAccountShopping, saveAccountShopping } from '../utils/api';
import type { TrackedProduct, PriceAlertNotification } from '../types';
import { useCatalogue } from '../context/PriceContext';

const TRACKING_STORAGE_KEY = 'pricewise_beauty_tracked';
const ALERTS_STORAGE_KEY = 'pricewise_beauty_alerts';

// Initial pre-configured demo tracked items
const INITIAL_TRACKED_ITEMS: TrackedProduct[] = [
  {
    id: 'track-01',
    productId: 'prod-01',
    targetPrice: 450,
    currency: 'INR',
    isTracking: true,
    addedAt: '2026-10-20 10:30:00',
    note: 'Buy for summer daily protection',
  },
  {
    id: 'track-02',
    productId: 'prod-06',
    targetPrice: 380,
    currency: 'INR',
    isTracking: true,
    addedAt: '2026-10-22 14:15:00',
    note: 'Barrier repair night cream',
  },
];

const INITIAL_ALERTS: PriceAlertNotification[] = [
  {
    id: 'alert-01',
    trackingId: 'track-01',
    productId: 'prod-01',
    productName: 'Watermelon Cooling Sunscreen SPF 50+ PA++++',
    productImage: '/images/products/prod-01.webp',
    alertType: 'price_drop',
    currentPrice: 465,
    previousPrice: 595,
    targetPrice: 450,
    storeName: 'Nykaa',
    message: 'Price dropped ₹130 (22%) to ₹465 on Nykaa. Approaching your target ₹450.',
    timestamp: '28 Oct 2026',
    isRead: false,
    deliveryStatus: 'in_app_delivered',
  },
];

function useTrackerState() {
  const { user } = useAuth();
  const accountKey = user ? TRACKING_STORAGE_KEY + ":user:" + user.id : TRACKING_STORAGE_KEY;
  const alertKey = user ? ALERTS_STORAGE_KEY + ":user:" + user.id : ALERTS_STORAGE_KEY;
  const [stateKey, setStateKey] = useState(TRACKING_STORAGE_KEY);
  const [trackingSyncStatus, setTrackingSyncStatus] = useState("guest");
  const ready = useRef(false);
  const activeOwner = useRef(user?.id);
  activeOwner.current = user?.id;
  const pendingSaves = useRef(Promise.resolve());
  const { products: PRODUCTS_DATA } = useCatalogue();
  const [trackedProducts, setTrackedProducts] = useState<TrackedProduct[]>(() => {
    try {
      const stored = localStorage.getItem(TRACKING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_TRACKED_ITEMS;
    } catch {
      return INITIAL_TRACKED_ITEMS;
    }
  });

  const [alerts, setAlerts] = useState<PriceAlertNotification[]>(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_ALERTS;
    } catch {
      return INITIAL_ALERTS;
    }
  });

  useEffect(() => {
    let cancelled = false;
    ready.current = false;
    const read = (key: string, fallback: unknown[]) => { try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return Array.isArray(value) ? value : fallback; } catch { return fallback; } };
    setTrackedProducts(read(accountKey, user ? [] : INITIAL_TRACKED_ITEMS));
    setAlerts(read(alertKey, user ? [] : INITIAL_ALERTS));
    setStateKey(accountKey);
    setTrackingSyncStatus(user ? 'loading' : 'guest');
    if (user) void (async () => {
      const result = await getAccountShopping();
      if (cancelled) return;
      if (result.error) { setTrackingSyncStatus('error'); return; }
      setTrackedProducts(result.trackedProducts); setAlerts(result.alerts);
      ready.current = true; setTrackingSyncStatus('synced');
    })();
    else ready.current = true;
    return () => { cancelled = true; };
  }, [accountKey, alertKey, user?.id]);

  useEffect(() => {
    if (!user || !ready.current || stateKey !== accountKey) return;
    const owner = user.id;
    const timer = setTimeout(() => {
      setTrackingSyncStatus('loading');
      pendingSaves.current = pendingSaves.current.then(async () => {
        if (activeOwner.current !== owner) return;
        const result = await saveAccountShopping(trackedProducts, alerts);
        if (activeOwner.current === owner) setTrackingSyncStatus(result.success ? 'synced' : 'error');
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [trackedProducts, alerts, user?.id, stateKey, accountKey]);

  // Sync tracking to localStorage
  useEffect(() => {
    try {
      if (stateKey === accountKey) localStorage.setItem(accountKey, JSON.stringify(trackedProducts));
    } catch (e) {
      console.warn('Could not save tracked products to localStorage', e);
    }
  }, [trackedProducts, stateKey, accountKey]);

  // Sync alerts to localStorage
  useEffect(() => {
    try {
      if (stateKey === accountKey) localStorage.setItem(alertKey, JSON.stringify(alerts));
    } catch (e) {
      console.warn('Could not save price alerts to localStorage', e);
    }
  }, [alerts, stateKey, accountKey, alertKey]);

  /**
   * Add or update product price tracking with INR validation.
   */
  const startTracking = useCallback((
    productId: string,
    targetPrice: number,
    note?: string
  ): { success: boolean; message: string } => {
    if (!targetPrice || targetPrice <= 0) {
      return { success: false, message: 'Target price must be a positive number greater than ₹0.' };
    }

    const product = PRODUCTS_DATA.find((p) => p.id === productId);
    if (!product) {
      return { success: false, message: 'Product not found in catalog.' };
    }

    setTrackedProducts((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === productId);
      const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 19);

      if (existingIdx >= 0) {
        // Update existing record
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          targetPrice: Math.round(targetPrice),
          note: note !== undefined ? note : updated[existingIdx].note,
          isTracking: true,
        };
        return updated;
      }

      // Add new record
      const newRecord: TrackedProduct = {
        id: `track-${Date.now()}`,
        productId,
        targetPrice: Math.round(targetPrice),
        currency: 'INR',
        isTracking: true,
        addedAt: nowStr,
        note,
      };
      return [newRecord, ...prev];
    });

    // Check if target is already met on current lowest offer
    if (product.price > 0 && product.price <= targetPrice) {
      const bestStore = product.storeOffers[0]?.storeName || 'Nykaa';
      const alertId = `alert-${productId}-${Date.now()}`;
      setAlerts((prev) => {
        // Prevent duplicate alert for the same product at the same price
        const hasDuplicate = prev.some(
          (a) => a.productId === productId && a.currentPrice === product.price && a.alertType === 'target_reached'
        );
        if (hasDuplicate) return prev;

        const newAlert: PriceAlertNotification = {
          id: alertId,
          trackingId: `track-${productId}`,
          productId,
          productName: product.name,
          productImage: product.image,
          alertType: 'target_reached',
          currentPrice: product.price,
          targetPrice,
          storeName: bestStore,
          message: `🎯 Target reached! ${product.name} is now ₹${product.price.toLocaleString('en-IN')} on ${bestStore} (Target: ₹${targetPrice.toLocaleString('en-IN')}).`,
          timestamp: 'Just now',
          isRead: false,
          deliveryStatus: 'in_app_delivered',
        };
        return [newAlert, ...prev];
      });
    }

    return {
      success: true,
      message: `Started monitoring '${product.name}' at target ₹${targetPrice.toLocaleString('en-IN')}.`,
    };
  }, [PRODUCTS_DATA]);

  const updateTargetPrice = useCallback((productId: string, newTargetPrice: number): boolean => {
    if (newTargetPrice <= 0) return false;
    setTrackedProducts((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? { ...item, targetPrice: Math.round(newTargetPrice) }
          : item
      )
    );
    return true;
  }, []);

  const stopTracking = useCallback((productId: string) => {
    setTrackedProducts((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const isTracking = useCallback(
    (productId: string) => trackedProducts.some((item) => item.productId === productId && item.isTracking),
    [trackedProducts]
  );

  const getTrackedRecord = useCallback(
    (productId: string) => trackedProducts.find((item) => item.productId === productId),
    [trackedProducts]
  );

  const markAlertAsRead = useCallback((alertId: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
    );
  }, []);

  const markAllAlertsAsRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  }, []);

  const clearAlert = useCallback((alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  }, []);

  const unreadAlertCount = alerts.filter((a) => !a.isRead).length;

  return {
    trackingSyncStatus,
    trackedProducts,
    alerts,
    unreadAlertCount,
    startTracking,
    updateTargetPrice,
    stopTracking,
    isTracking,
    getTrackedRecord,
    markAlertAsRead,
    markAllAlertsAsRead,
    clearAlert,
  };
}

const TrackerContext = createContext<ReturnType<typeof useTrackerState> | null>(null);
export function PriceTrackerProvider({ children }: { children: ReactNode }) {
  return createElement(TrackerContext.Provider, { value: useTrackerState() }, children);
}
export function usePriceTracker() {
  const state = useContext(TrackerContext);
  if (!state) throw new Error('PriceTrackerProvider is missing');
  return state;
}
