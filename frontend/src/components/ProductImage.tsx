import { useState, type ImgHTMLAttributes } from 'react';

interface ProductImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  brand?: string;
  frameClassName?: string;
}

export function ProductImage({ src, alt, brand, className = '', frameClassName = '', onError, ...props }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const unavailable = !src || failed;
  const baseUrl = import.meta.env.BASE_URL || '/';
  const resolved = src.startsWith('/images/') ? `${baseUrl}${src.slice(1)}` : src;
  const monogram = (brand || alt || 'B').trim().charAt(0).toUpperCase();

  return (
    <div className={`relative overflow-hidden ${frameClassName}`}>
      {unavailable ? (
        <div role="img" aria-label={`${brand || alt} image unavailable`} className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-champagne to-ivory text-rose">
          <span aria-hidden="true" className="font-editorial text-6xl font-semibold">{monogram}</span>
          <span className="max-w-[15ch] text-center text-[10px] font-bold uppercase tracking-[.22em] text-taupe">{brand || 'Beauty'}</span>
        </div>
      ) : (
        <img
          {...props}
          src={resolved}
          alt={alt}
          referrerPolicy="no-referrer"
          loading={props.loading || 'lazy'}
          decoding="async"
          className={`block h-full w-full object-cover object-center ${className}`}
          onError={(event) => { setFailed(true); onError?.(event); }}
        />
      )}
    </div>
  );
}
