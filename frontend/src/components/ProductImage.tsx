import { useState, type ImgHTMLAttributes } from 'react';

interface ProductImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  compact?: boolean;
}

/** Shared product media: fill the frame without stretching and recover from failed loads. */
export function ProductImage({ src, alt, className = '', compact: _compact, onError, ...props }: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const unavailable = !src || failedSrc === src;

  return (
    <span
      className={`relative block overflow-hidden bg-white ${className}`}
      title={props.title}
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
    </span>
  );
}
