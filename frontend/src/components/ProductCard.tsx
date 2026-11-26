import { ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Product } from '../types';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  storeCount?: number;
  routeProduct?: boolean;
}

export function ProductCard({ product, storeCount, routeProduct = false }: ProductCardProps) {
  const discount = product.originalPrice && product.price > 0 && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;
  const compareCount = storeCount ?? product.storeOffers.filter((offer) => offer.price > 0).length;
  const productPath = `/product/${product.slug || product.id}`;

  return (
    <Link
      to={productPath}
      state={routeProduct ? { product } : undefined}
      className="group block min-w-0 rounded-2xl border border-[#eadcd6] bg-white p-2.5 shadow-[0_8px_24px_-20px_rgba(30,25,24,0.5)] transition-[border-color,box-shadow,transform] duration-300 ease-out hover:-translate-y-0.5 hover:border-[#c9897c] hover:shadow-[0_16px_36px_-22px_rgba(30,25,24,0.35)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9d584d] sm:p-3.5"
      aria-label={`Compare ${product.brand} ${product.name} across ${compareCount || 5} stores`}
    >
      <article className="flex h-full flex-col">
        <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f3eae6]">
          <ProductImage
            src={product.image}
            alt={product.name}
            brand={product.brand}
            loading="lazy"
            className="h-full w-full transition-transform duration-300 ease-out group-hover:scale-[1.03]"
          />
          {discount > 0 && (
            <span className="absolute right-2 top-2 rounded-full bg-[#1e6b52] px-2 py-1 text-[10px] font-bold tracking-wide text-white sm:text-xs">
              {discount}% OFF
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-1 pt-3 sm:px-1.5 sm:pt-4">
          <span className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-[#8e4e43] sm:text-[11px]">
            {product.brand}
          </span>
          <h2 className="mt-1 line-clamp-2 min-h-10 font-editorial text-lg font-semibold leading-5 text-[#1e1918] sm:text-xl sm:leading-6">
            {product.name}
          </h2>

          <div className="mt-auto pt-3">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <span className="font-sans text-lg font-bold tabular-nums text-[#1e1918] sm:text-xl">
                {product.price > 0 ? `₹${product.price.toLocaleString('en-IN')}` : 'See offers'}
              </span>
              {product.originalPrice && product.price > 0 && product.originalPrice > product.price && (
                <s className="text-xs tabular-nums text-[#766762]">₹{product.originalPrice.toLocaleString('en-IN')}</s>
              )}
            </div>
            <span className="mt-2 flex min-h-11 items-center justify-between gap-2 rounded-full border border-[#eadcd6] bg-[#faf7f5] px-3 text-[11px] font-semibold text-[#514440] transition-colors group-hover:border-[#c9897c] group-hover:text-[#80473f] sm:text-xs">
              <span>Compare {compareCount || 5} stores</span>
              <ArrowUpRight aria-hidden="true" className="h-4 w-4 shrink-0" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
