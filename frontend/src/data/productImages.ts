// Product photography researched on 24 November 2026. Full provenance: public/images/products/sources.json
export interface ProductImageSource {
  sourceUrl: string;
  kind: 'official' | 'retailer';
  representation: 'product' | 'representative';
  note: string;
}

export const PRODUCT_IMAGE_SOURCES: Record<string, ProductImageSource> = {
  "/images/products/prod-01.webp": {
    "sourceUrl": "https://www.dotandkey.com/products/watermelon-cooling-spf-50-face-sunscreen",
    "kind": "official",
    "representation": "representative",
    "note": "Current 50ml packaging; demo catalogue lists 50g."
  },
  "/images/products/prod-03.webp": {
    "sourceUrl": "https://beminimalist.co/products/niacinamide-10-with-matmarine",
    "kind": "official",
    "representation": "representative",
    "note": "Current Niacinamide 10% packaging; demo formula lists Zinc PCA."
  },
  "/images/products/prod-04.webp": {
    "sourceUrl": "https://www.cosrx.com/products/advanced-snail-96-mucin-power-essence",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-06.webp": {
    "sourceUrl": "https://www.dotandkey.com/products/dot-key-ceramides-hyaluronic-hydrating-face-cream-i-repairs-skin-barrier-intense-moisturization-sensitive-dry-skin-fragrance-free",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-11.webp": {
    "sourceUrl": "https://plumgoodness.com/products/green-tea-alcohol-free-pore-tightening-face-toner-for-oily-acne-prone-skin-1",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-12.webp": {
    "sourceUrl": "https://us.laneige.com/products/lip-sleeping-mask",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-19.webp": {
    "sourceUrl": "https://swissbeauty.in/products/ultra-blush-palette-swiss-beauty-cosmetics",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-21.webp": {
    "sourceUrl": "https://www.simpleskincare.in/products/micellar-cleansing-water-with-vit-b3-b-c-200ml",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-22.webp": {
    "sourceUrl": "https://beminimalist.co/products/maleic-bond-repair-complex-05",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-23.webp": {
    "sourceUrl": "https://innovist.com/products/lactic-acid-zemea-vitamin-e-exfoliating-body-wash",
    "kind": "official",
    "representation": "representative",
    "note": "Current 236ml packaging; demo catalogue lists 250ml."
  },
  "/images/products/prod-18.webp": {
    "sourceUrl": "https://www.rarebeauty.com/products/soft-pinch-liquid-blush",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-20.webp": {
    "sourceUrl": "https://hudabeauty.com/products/nude-obsessions-eyeshadow-palette-hb00323m",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-10.webp": {
    "sourceUrl": "https://www.nykaa.com/sebamed-clear-face-cleansing-foam/p/4725?productId=4725&pps=1",
    "kind": "retailer",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-08.webp": {
    "sourceUrl": "https://www.clinique.com/product/1687/83690/skincare/moisturizers/moisture-surgetm-100h-auto-replenishing-hydrator",
    "kind": "official",
    "representation": "product",
    "note": ""
  },
  "/images/products/prod-16.webp": {
    "sourceUrl": "https://www.maybelline.com/face-makeup/concealer/instant-age-rewind-eraser-dark-circles-concealer-treatment",
    "kind": "official",
    "representation": "representative",
    "note": "Shade Sand shown; catalogue does not specify a shade."
  },
  "/images/products/prod-02.webp": {
    "sourceUrl": "https://www.nykaa.com/the-derma-co-1percent-hyaluronic-sunscreen-spf-50-aqua-gel-pa-broad-spectrum/p/15901861?productId=15901861&pps=3",
    "kind": "retailer",
    "representation": "representative",
    "note": "Current Aqua Gel packaging; size not confirmed against demo 50g."
  },
  "/images/products/prod-05.webp": {
    "sourceUrl": "https://www.nykaa.com/kama-ayurveda-kumkumadi-miraculous-beauty-fluid-ayurvedic-night-serum/p/1262946?productId=1262946&pps=1",
    "kind": "retailer",
    "representation": "representative",
    "note": "Current Kumkumadi Thailam 3ml packaging; demo catalogue lists 12ml."
  },
  "/images/products/prod-07.webp": {
    "sourceUrl": "https://www.nykaa.com/forest-essentials-soundarya-radiance-cream-with-24k-gold-and-spf25-config/p/255105?productId=255105&skuId=34182&pps=1",
    "kind": "retailer",
    "representation": "representative",
    "note": "Current 50g Soundarya cream packaging uses SPF 30; demo catalogue lists SPF 25."
  },
  "/images/products/prod-09.webp": {
    "sourceUrl": "https://www.nykaa.com/cetaphil-cleansing-lotion/p/22032?productId=22032&pps=1",
    "kind": "retailer",
    "representation": "representative",
    "note": "Current 118ml Gentle Skin Cleanser; demo catalogue lists 125ml."
  },
  "/images/products/prod-13.webp": {
    "sourceUrl": "https://www.nykaa.com/maybelline-new-york-fit-me-matte-poreless-foundation/p/31074?productId=31074&pps=2",
    "kind": "retailer",
    "representation": "representative",
    "note": "Shade Ivory shown; catalogue does not specify a shade."
  },
  "/images/products/prod-14.webp": {
    "sourceUrl": "https://www.nykaa.com/m-a-cstudio-fix-fluid-spf-15-foundation/p/14327558?productId=14327558&pps=2",
    "kind": "retailer",
    "representation": "representative",
    "note": "Current Studio Fix SPF 15 foundation; catalogue does not specify a shade."
  },
  "/images/products/prod-15.webp": {
    "sourceUrl": "https://www.nykaa.com/charlotte-tilbury-hollywood-filter/p/985214?productId=985214&skuId=959724&pps=1",
    "kind": "retailer",
    "representation": "representative",
    "note": "Shade 2 Fair shown; catalogue does not specify a shade."
  },
  "/images/products/prod-17.webp": {
    "sourceUrl": "https://www.nykaa.com/kay-matteinee-lip-crayon/p/573181?productId=573181&pps=2",
    "kind": "retailer",
    "representation": "representative",
    "note": "Same Kay Beauty Matteinee family in Wee Hours (1.8g); demo Fulfill (3.8g) was not listed by the retailer."
  },
  "/images/products/extra-lip-balm.webp": {
    "sourceUrl": "https://www.dotandkey.com/products/spf-50-barrier-repair-lip-balm",
    "kind": "official",
    "representation": "representative",
    "note": "Similar Dot & Key peptide lip balm; Glazing Peptide Lip Butter Balm was not found."
  },
  "/images/products/extra-glow.webp": {
    "sourceUrl": "https://www.maybelline.com/face-makeup/foundation-makeup/instant-age-rewind-instant-perfector-4-in-1-glow-makeup",
    "kind": "official",
    "representation": "representative",
    "note": "Perfector 4-in-1 Glow Makeup shown for the demo Glow & Contour alternative."
  }
};
