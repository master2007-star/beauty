import { useState, type ImgHTMLAttributes } from 'react';

interface ProductImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  compact?: boolean;
  brand?: string;
}

/** Shared product media: fill the frame without stretching and recover from failed loads. */
export function ProductImage({ src, alt, brand, className = '', compact: _compact, onError, ...props }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const unavailable = !src || failedSrc === src;

  return (
    <span
      className={`relative block overflow-hidden bg-white ${className}`}
      title={props.title}
      data-product-image={src}
    >
      {unavailable ? (
        <span role="img" aria-label={`${brand || alt} product image unavailable`} className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#f4ece8] p-4 text-center text-xs leading-snug text-[#6e605c]">
          <span aria-hidden="true" className="font-editorial text-4xl text-[#b56558]">{(brand || alt).slice(0, 1).toUpperCase()}</span>
          <span className="max-w-[16ch] text-[10px] font-semibold uppercase tracking-[0.18em]">{brand || 'Beauty'}</span>
        </span>
      ) : (
        <img
          {...props}
          src={src.startsWith('/images/') ? `${import.meta.env.BASE_URL}${src.slice(1)}` : src}
          alt={alt}
          referrerPolicy="no-referrer"
          decoding="async"
          className="block h-full w-full object-cover object-center"
          onError={(event) => {
            setFailedSrc(src);
            onError?.(event);
          }}
        />
      )}
    </span>
  );
}
