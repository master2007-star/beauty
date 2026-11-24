import { useState, type ImgHTMLAttributes } from 'react';
import { PRODUCT_IMAGE_SOURCES } from '../data/productImages';

interface ProductImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  compact?: boolean;
}

/** Shared product media: fill the frame without stretching and recover from failed loads. */
export function ProductImage({ src, alt, className = '', compact = false, onError, ...props }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const source = PRODUCT_IMAGE_SOURCES[src];
  const unavailable = !src || failedSrc === src;

  return (
    <span
      className={`relative block overflow-hidden bg-white ${className}`}
      title={source?.note || props.title}
      data-product-image={src}
    >
      {unavailable ? (
        <span role="img" aria-label={alt} className="flex h-full w-full items-center justify-center bg-ivory p-2 text-center text-xs leading-snug text-espresso-800">
          {alt}
        </span>
      ) : (
        <img
          {...props}
          src={src.startsWith('/images/') ? `${import.meta.env.BASE_URL}${src.slice(1)}` : src}
          alt={alt}
          decoding="async"
          className="block h-full w-full object-cover object-center"
          onError={(event) => {
            setFailedSrc(src);
            onError?.(event);
          }}
        />
      )}
      {!unavailable && !compact && source?.representation === 'representative' && (
        <span className="absolute bottom-10 right-2 max-w-[calc(100%-1rem)] rounded bg-ivory/95 px-2 py-1 text-[11px] leading-tight text-espresso-800">
          Representative image
        </span>
      )}
    </span>
  );
}
