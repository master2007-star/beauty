import { ExternalLink } from 'lucide-react';
import type { Product } from '../types';

export function OfficialProductLink({ product, className = '' }: { product: Product; className?: string }) {
  if (!product.officialUrl) return null;
  return (
    <a
      href={product.officialUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={product.officialUrlNote || `${product.brand} ${product.name}`}
      className={`inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:text-rose-900 ${className}`}
    >
      {product.officialUrlKind === 'retailer' ? 'Product page on Nykaa' : 'Official product page'}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}
