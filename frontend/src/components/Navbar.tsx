import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, LogOut, Menu, Search, User as UserIcon, X, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  wishlistCount: number;
  unreadAlertCount?: number;
  onOpenWishlist: () => void;
  onOpenPriceAlerts?: () => void;
}

export function Navbar({
  searchQuery,
  onSearchQueryChange,
  wishlistCount,
  unreadAlertCount = 0,
  onOpenWishlist,
  onOpenPriceAlerts,
}: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { user, openAuthModal, logout } = useAuth();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    const measure = () => document.documentElement.style.setProperty('--site-header-height', `${header.getBoundingClientRect().height}px`);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const searchField = (id: string) => (
    <label htmlFor={id} className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-full border border-[#eadcd6] bg-white px-3.5 transition-colors focus-within:border-[#b86b5e] focus-within:ring-2 focus-within:ring-[#b86b5e]/20">
      <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[#6e605c]" />
      <input
        id={id}
        type="search"
        value={searchQuery}
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder="Search beauty"
        aria-label="Search beauty products"
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent py-2 text-sm text-[#1e1918] placeholder:text-[#766762] focus:outline-none"
      />
      {searchQuery && (
        <button type="button" onClick={() => onSearchQueryChange('')} aria-label="Clear search" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[#6e605c] hover:bg-[#f3eae6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9d584d]">
          <X aria-hidden="true" className="h-3.5 w-3.5" />
        </button>
      )}
    </label>
  );

  return (
    <header
      ref={headerRef}
      className={`fixed inset-x-0 top-0 z-40 border-b border-[#eadcd6] bg-[#faf7f5]/95 backdrop-blur-xl transition-shadow duration-300 ${isScrolled ? 'shadow-[0_8px_24px_-18px_rgba(30,25,24,0.45)]' : ''}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex min-h-11 items-center justify-between gap-4">
          <Link to="/" className="group flex min-w-0 items-center gap-2.5 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#9d584d]">
            <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#d9c5bc] bg-[#f3eae6] font-editorial text-xl font-semibold text-[#80473f] transition-colors group-hover:bg-[#eadcd6]">P</span>
            <span className="min-w-0">
              <span className="block whitespace-nowrap font-editorial text-xl font-semibold leading-none tracking-tight text-[#1e1918] sm:text-2xl">PriceWise <i className="font-normal text-[#9d584d]">Beauty</i></span>
              <span className="mt-1 hidden text-[9px] uppercase tracking-[0.18em] text-[#6e605c] sm:block">Five-store beauty comparison</span>
            </span>
          </Link>

          <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm text-[#514440] md:flex">
            <Link to="/#catalog" className="transition-colors hover:text-[#80473f]">Discover</Link>
            <Link to="/routines" className="transition-colors hover:text-[#80473f]">Routines</Link>
            <Link to="/watchlist" className="transition-colors hover:text-[#80473f]">Watchlist</Link>
          </nav>

          <div className="hidden w-[clamp(180px,23vw,300px)] lg:block">{searchField('desktop-beauty-search')}</div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onOpenPriceAlerts || onOpenWishlist}
              aria-label={`Price alerts${unreadAlertCount ? `, ${unreadAlertCount} active` : ''}`}
              className="relative grid h-11 w-11 place-items-center rounded-full text-[#514440] transition-colors hover:bg-[#f3eae6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9d584d]"
            >
              <Bell aria-hidden="true" className="h-[18px] w-[18px]" />
              {unreadAlertCount > 0 && <span className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#1e6b52] px-1 text-[10px] font-bold text-white">{unreadAlertCount}</span>}
            </button>
            <button
              type="button"
              onClick={onOpenWishlist}
              aria-label={`Saved products${wishlistCount ? `, ${wishlistCount} saved` : ''}`}
              className="relative grid h-11 w-11 place-items-center rounded-full text-[#514440] transition-colors hover:bg-[#f3eae6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9d584d]"
            >
              <Heart aria-hidden="true" className="h-[18px] w-[18px]" />
              {wishlistCount > 0 && <span className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#b86b5e] px-1 text-[10px] font-bold text-white">{wishlistCount}</span>}
            </button>
            {user ? (
              <div className="relative hidden sm:block" ref={dropdownRef}>
                <button type="button" onClick={() => setUserDropdownOpen(!userDropdownOpen)} aria-expanded={userDropdownOpen} aria-label="Account menu" className="grid h-11 w-11 place-items-center rounded-full border border-[#eadcd6] bg-white text-[#514440] hover:border-[#c9897c] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9d584d]">
                  <UserIcon aria-hidden="true" className="h-4 w-4" />
                </button>
                <AnimatePresence>
                  {userDropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute right-0 top-12 z-50 w-48 rounded-xl border border-[#eadcd6] bg-white p-2 shadow-soft-lift">
                      <Link to="/profile" onClick={() => setUserDropdownOpen(false)} className="block rounded-lg px-3 py-2 text-sm text-[#514440] hover:bg-[#faf7f5]">Your profile</Link>
                      <button type="button" onClick={() => { logout(); setUserDropdownOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#80473f] hover:bg-[#faf7f5]"><LogOut aria-hidden="true" className="h-4 w-4" /> Sign out</button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button type="button" onClick={() => openAuthModal('login')} className="hidden min-h-11 items-center gap-1.5 rounded-full bg-[#1e1918] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#3b302d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d584d] sm:flex"><UserIcon aria-hidden="true" className="h-3.5 w-3.5" /> Sign in</button>
            )}
            <button type="button" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileMenuOpen} className="grid h-11 w-11 place-items-center rounded-full text-[#514440] hover:bg-[#f3eae6] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#9d584d] md:hidden">
              {mobileMenuOpen ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <div className="mt-3 lg:hidden">{searchField('mobile-beauty-search')}</div>
      </div>

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.nav initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} aria-label="Mobile navigation" className="overflow-hidden border-t border-[#eadcd6] bg-[#faf7f5] md:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              <Link to="/#catalog" onClick={() => setMobileMenuOpen(false)} className="min-h-11 rounded-lg px-3 py-3 text-sm text-[#514440] hover:bg-[#f3eae6]">Discover</Link>
              <Link to="/routines" onClick={() => setMobileMenuOpen(false)} className="min-h-11 rounded-lg px-3 py-3 text-sm text-[#514440] hover:bg-[#f3eae6]">Routines</Link>
              <Link to="/watchlist" onClick={() => setMobileMenuOpen(false)} className="min-h-11 rounded-lg px-3 py-3 text-sm text-[#514440] hover:bg-[#f3eae6]">Watchlist & price alerts</Link>
              {user ? (
                <button type="button" onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex min-h-11 items-center gap-2 rounded-lg px-3 py-3 text-left text-sm text-[#80473f] hover:bg-[#f3eae6]"><LogOut aria-hidden="true" className="h-4 w-4" /> Sign out</button>
              ) : (
                <button type="button" onClick={() => { openAuthModal('login'); setMobileMenuOpen(false); }} className="min-h-11 rounded-lg bg-[#1e1918] px-3 py-3 text-left text-sm font-semibold text-white">Sign in / Register</button>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
