import { useEffect, useRef } from 'react';
import { Bell, Search, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  alertCount: number;
  onOpenAlerts: () => void;
}

export function Navbar({ searchQuery, onSearchQueryChange, alertCount, onOpenAlerts }: NavbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName || '');
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === 'Escape' && document.activeElement === inputRef.current) {
        onSearchQueryChange('');
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onSearchQueryChange]);

  return (
    <header className="glass-header fixed inset-x-0 top-0 z-40 border-b border-line/80 shadow-glass">
      <div className="mx-auto grid min-h-[5rem] max-w-[1440px] grid-cols-[1fr_auto] items-center gap-x-4 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(190px,1fr)_minmax(300px,680px)_minmax(190px,1fr)] lg:gap-8 lg:px-10">
        <Link to="/" className="flex w-fit items-baseline gap-1.5 no-underline focus-visible:rounded-sm" aria-label="PriceWise Beauty home">
          <span className="text-[13px] font-bold tracking-[.17em] text-espresso sm:text-sm">PRICEWISE</span>
          <span className="font-editorial text-[20px] italic leading-none text-rose sm:text-[22px]">Beauty</span>
        </Link>

        <label className="col-span-2 row-start-2 flex h-12 min-w-0 items-center gap-3 rounded-full border border-line bg-white/90 px-4 shadow-sm transition-[border-color,box-shadow] focus-within:border-rose/70 focus-within:shadow-card lg:col-span-1 lg:col-start-2 lg:row-start-1">
          <Search aria-hidden="true" className="h-[18px] w-[18px] shrink-0 text-taupe" />
          <span className="sr-only">Search beauty stores</span>
          <input ref={inputRef} value={searchQuery} onChange={(event) => onSearchQueryChange(event.target.value)} placeholder="Search 5 beauty stores: Sunscreens, Serums, Lip Oils…" className="min-w-0 flex-1 bg-transparent text-[12px] text-espresso outline-none placeholder:text-taupe/80 sm:text-[13px]" />
          {searchQuery ? (
            <button type="button" onClick={() => { onSearchQueryChange(''); inputRef.current?.focus(); }} aria-label="Clear search" className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-taupe transition-colors hover:bg-champagne hover:text-espresso"><X className="h-4 w-4" /></button>
          ) : (
            <kbd className="hidden shrink-0 rounded-md border border-line bg-ivory px-2 py-1 text-[10px] font-semibold text-taupe lg:inline">/</kbd>
          )}
        </label>

        <div className="col-start-2 row-start-1 flex justify-end lg:col-start-3">
          <button type="button" onClick={onOpenAlerts} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-white px-3.5 text-[11px] font-semibold text-espresso shadow-sm transition-colors hover:border-rose/50 hover:bg-champagne focus-visible:outline" aria-label={`Open saved price alerts, ${alertCount} active`}>
            <Bell aria-hidden="true" className="h-4 w-4 text-rose" />
            <span className="hidden sm:inline">Price alerts</span>
            <span className="grid min-w-6 h-6 place-items-center rounded-full bg-emerald-tint px-1.5 text-[10px] font-bold tabular-nums text-emerald">{alertCount}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
