import { Search, Sparkles } from 'lucide-react';

interface HeroProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  productCount: number;
}

export function Hero({ searchQuery, onSearchChange, productCount }: HeroProps) {
  return (
    <section id="hero" className="border-b border-[#eadcd6] bg-[#faf7f5]">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-7 sm:px-6 sm:py-9 lg:grid-cols-[1fr_0.82fr] lg:items-end lg:gap-12 lg:px-8 lg:py-12">
        <div>
          <h1 className="max-w-3xl font-editorial text-4xl font-medium leading-[0.98] tracking-tight text-[#1e1918] sm:text-5xl lg:text-6xl">
            Beauty worth discovering.
            <span className="block italic text-[#8e4e43]">Prices worth comparing.</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-[#5f514d] sm:text-base">
            Find your favourites and compare offers across India’s leading beauty stores.
          </p>
        </div>

        <div className="w-full">
          <label htmlFor="beauty-search" className="mb-2 block text-xs font-semibold text-[#514440]">
            Search products, brands or ingredients
          </label>
          <div className="flex min-h-12 items-center gap-3 rounded-full border border-[#d9c5bc] bg-white px-4 shadow-[0_8px_24px_-18px_rgba(30,25,24,0.45)] transition-colors focus-within:border-[#b86b5e] focus-within:ring-2 focus-within:ring-[#b86b5e]/20">
            <Search aria-hidden="true" className="h-4 w-4 shrink-0 text-[#7a6963]" />
            <input
              id="beauty-search"
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Try sunscreen, niacinamide, COSRX…"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#1e1918] placeholder:text-[#766762] focus:outline-none"
              autoComplete="off"
            />
            <span className="hidden items-center gap-1.5 border-l border-[#eadcd6] pl-3 text-[11px] text-[#6e605c] sm:flex">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-[#9d584d]" />
              {productCount} finds
            </span>
          </div>
          <p className="mt-2 text-[11px] text-[#6e605c]">Compare Nykaa, Tira, Amazon, Purplle and Myntra.</p>
        </div>
      </div>
    </section>
  );
}
