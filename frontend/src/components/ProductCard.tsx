import { ArrowRight, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  storeCount?: number;
  routeProduct?: boolean;
}

function discountFor(product: Product) {
  return product.originalPrice && product.price > 0 && product.originalPrice > product.price
    ? Math.round((product.originalPrice - product.price) / product.originalPrice * 100)
    : 0;
}

export function ProductCard({ product, storeCount, routeProduct = false }: ProductCardProps) {
  const discount = discountFor(product);
  const count = storeCount ?? product.storeOffers.filter((offer) => offer.price > 0).length;
  const slug = product.slug || product.id;

  return (
    <Link
      to={`/product/${slug}`}
      state={routeProduct ? { product } : undefined}
      onClick={() => { if (routeProduct) { try { sessionStorage.setItem(`pricewise:product:${slug}`, JSON.stringify(product)); } catch { /* Router state still carries the selected product. */ } } }}
      aria-label={`Compare ${product.brand} ${product.name} across five beauty stores`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-[1.1rem] border border-line bg-silk text-espresso shadow-card transition-[transform,border-color,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:border-rose/40 hover:shadow-lift focus-visible:outline"
    >
      <div className="product-image-frame relative aspect-[4/5] overflow-hidden">
        <ProductImage src={product.image} alt={`${product.brand} ${product.name}`} brand={product.brand} frameClassName="h-full w-full" className="transition-transform duration-500 ease-out group-hover:scale-105" />
        {discount > 0 && <span className="absolute right-2.5 top-2.5 rounded-full bg-emerald px-2.5 py-1.5 text-[9px] font-bold tracking-[.06em] text-white sm:right-3 sm:top-3 sm:text-[10px]">{discount}% OFF</span>}
      </div>
      <div className="flex flex-1 flex-col px-3 pb-3 pt-3.5 sm:px-4 sm:pb-4 sm:pt-4">
        <p className="truncate text-[9px] font-bold uppercase tracking-[.16em] text-rose sm:text-[10px]">{product.brand}</p>
        <h2 className="mt-1.5 line-clamp-2 min-h-[2.65rem] font-sans text-[11px] font-semibold leading-[1.35rem] text-espresso sm:min-h-[3rem] sm:text-[13px] sm:leading-6">{product.name}</h2>
        <div className="mt-auto pt-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="text-[16px] font-bold tabular-nums text-espresso sm:text-[18px]">{product.price > 0 ? `₹${product.price.toLocaleString('en-IN')}` : 'Check stores'}</span>
            {product.originalPrice && product.price > 0 && product.originalPrice > product.price && <s className="text-[10px] tabular-nums text-taupe sm:text-xs">₹{product.originalPrice.toLocaleString('en-IN')}</s>}
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[9px] text-taupe sm:text-[10px]"><Store aria-hidden="true" className="h-3 w-3" />Across {count || 5} stores</p>
        </div>
      </div>
      <div className="flex min-h-11 items-center justify-between border-t border-line bg-ivory/80 px-3 text-[9px] font-bold uppercase tracking-[.1em] text-taupe transition-colors group-hover:bg-champagne group-hover:text-espresso sm:px-4 sm:text-[10px]">
        <span>Compare 5 stores</span><ArrowRight aria-hidden="true" className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
