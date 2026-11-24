import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { addToWatchlist, getUserWatchlist, removeFromWatchlist } from '../utils/api';
import { PRODUCTS_DATA } from '../data/products';

const GUEST_KEY = 'pricewise_beauty_wishlist';
function readWishlist(key: string, fallback: string[] = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || 'null');
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string' && PRODUCTS_DATA.some((product) => product.id === id)) : fallback;
  } catch { return fallback; }
}
interface WishlistState {
  wishlist: string[];
  toggleWishlist: (id: string) => void;
  clearWishlist: () => void;
  isWishlisted: (id: string) => boolean;
  wishlistCount: number;
  syncStatus: 'guest' | 'loading' | 'synced' | 'error';
}
const WishlistContext = createContext<WishlistState | null>(null);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const key = user ? `${GUEST_KEY}:user:${user.id}` : GUEST_KEY;
  const [wishlist, setWishlist] = useState(() => readWishlist(GUEST_KEY));
  const [syncStatus, setSyncStatus] = useState<WishlistState['syncStatus']>('guest');
  const revision = useRef(0);
  const writes = useRef(Promise.resolve());
  const activeOwner = useRef(user?.id);
  activeOwner.current = user?.id;

  useEffect(() => {
    let cancelled = false;
    revision.current++;
    const thisRevision = revision.current;
    setWishlist(readWishlist(key));
    setSyncStatus(user ? 'loading' : 'guest');
    if (user) void (async () => {
      const result = await getUserWatchlist();
      if (cancelled || thisRevision !== revision.current) return;
      if (result.error) { setSyncStatus('error'); return; }
      const ids = result.items.map((item) => item.catalogue_id).filter((id): id is string => Boolean(id) && PRODUCTS_DATA.some((product) => product.id === id));
      setWishlist(ids); localStorage.setItem(key, JSON.stringify(ids)); setSyncStatus('synced');
    })();
    return () => { cancelled = true; };
  }, [key, user?.id]);

  function save(next: string[]) { setWishlist(next); localStorage.setItem(key, JSON.stringify(next)); }
  function toggleWishlist(id: string) {
    if (!PRODUCTS_DATA.some((product) => product.id === id)) return;
    const removing = wishlist.includes(id);
    revision.current++;
    save(removing ? wishlist.filter((item) => item !== id) : [...wishlist, id]);
    if (user) {
      const owner = user.id;
      setSyncStatus('loading');
      writes.current = writes.current.then(async () => {
        if (owner !== activeOwner.current) return;
        const result = removing ? await removeFromWatchlist(id) : await addToWatchlist(id);
        if (owner === activeOwner.current) setSyncStatus(result.success ? 'synced' : 'error');
      }).catch(() => setSyncStatus('error'));
    }
  }
  function clearWishlist() {
    const ids = wishlist;
    revision.current++; save([]);
    if (user) {
      const owner = user.id;
      setSyncStatus('loading');
      writes.current = writes.current.then(async () => {
        if (owner !== activeOwner.current) return;
        const results = await Promise.all(ids.map((id) => removeFromWatchlist(id)));
        if (owner === activeOwner.current) setSyncStatus(results.every((result) => result.success) ? 'synced' : 'error');
      }).catch(() => setSyncStatus('error'));
    }
  }
  return <WishlistContext.Provider value={{ wishlist, toggleWishlist, clearWishlist, isWishlisted: (id) => wishlist.includes(id), wishlistCount: wishlist.length, syncStatus }}>{children}</WishlistContext.Provider>;
}

export function useWishlistState() {
  const state = useContext(WishlistContext);
  if (!state) throw new Error('WishlistProvider is missing');
  return state;
}
