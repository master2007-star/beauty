import type { Subcategory, ProductCategory } from '../types';

export interface CategoryInfo {
  name: Subcategory;
  category: ProductCategory;
  description: string;
  image: string;
  itemCount: number;
}

export const CATEGORIES_DATA: CategoryInfo[] = [
  // Skincare (8)
  {
    name: 'Face Wash',
    category: 'skincare',
    description: 'Gentle, pH-balanced cleansers to purify without stripping the moisture barrier.',
    image: "/images/categories/face-wash.webp",
    itemCount: 42,
  },
  {
    name: 'Moisturiser',
    category: 'skincare',
    description: 'Ceramide-rich creams, gel hydrators and barrier-repair formulas for glowing skin.',
    image: "/images/categories/moisturiser.webp",
    itemCount: 58,
  },
  {
    name: 'Sunscreen',
    category: 'skincare',
    description: 'Broad-spectrum PA++++ sun protections with zero white cast and light matte finishes.',
    image: "/images/categories/sunscreen.webp",
    itemCount: 36,
  },
  {
    name: 'Serums',
    category: 'skincare',
    description: 'Targeted actives including Niacinamide, Vitamin C, Retinol, and Hyaluronic Acid.',
    image: "/images/categories/serums.webp",
    itemCount: 64,
  },
  {
    name: 'Toners',
    category: 'skincare',
    description: 'Hydrating essences and gentle exfoliating waters to prep and balance pH.',
    image: "/images/categories/toners.webp",
    itemCount: 28,
  },
  {
    name: 'Face Masks',
    category: 'skincare',
    description: 'Deep detoxifying clay treatments, revitalising sheet masks, and overnight jellies.',
    image: "/images/categories/face-masks.webp",
    itemCount: 22,
  },
  {
    name: 'Eye Care',
    category: 'skincare',
    description: 'Caffeine peptides and botanical eye balms for dark circles and morning puffiness.',
    image: "/images/categories/eye-care.webp",
    itemCount: 18,
  },
  {
    name: 'Lip Care',
    category: 'skincare',
    description: 'Nourishing peptide butter balms, overnight sleeping masks, and SPF lip oils.',
    image: "/images/categories/lip-care.webp",
    itemCount: 24,
  },

  // Makeup (8)
  {
    name: 'Foundation',
    category: 'makeup',
    description: 'Second-skin liquid, cream, and powder bases matched to Indian undertones.',
    image: "/images/categories/foundation.webp",
    itemCount: 46,
  },
  {
    name: 'Concealer',
    category: 'makeup',
    description: 'Crease-proof high-coverage concealers for blemish correction and under-eye brighten.',
    image: "/images/categories/concealer.webp",
    itemCount: 32,
  },
  {
    name: 'Lipstick',
    category: 'makeup',
    description: 'Hydrating matte bullets, transfers-proof liquid pigments, and sheer tinted balms.',
    image: "/images/categories/lipstick.webp",
    itemCount: 78,
  },
  {
    name: 'Blush',
    category: 'makeup',
    description: 'Dewy liquid drops, velvet mousse, and baked powder flushes for warm radiance.',
    image: "/images/categories/blush.webp",
    itemCount: 35,
  },
  {
    name: 'Mascara',
    category: 'makeup',
    description: 'Humidity-resistant, non-clumping lash lift formulas for length and intense volume.',
    image: "/images/categories/mascara.webp",
    itemCount: 26,
  },
  {
    name: 'Eyeliner',
    category: 'makeup',
    description: 'Smudge-proof kajal pencils, waterproof dip ink pens, and gel pot liners.',
    image: "/images/categories/eyeliner.webp",
    itemCount: 30,
  },
  {
    name: 'Highlighter',
    category: 'makeup',
    description: 'Champagne and rose gold liquid strobes and ultra-fine pressed glow powders.',
    image: "/images/categories/highlighter.webp",
    itemCount: 24,
  },
  {
    name: 'Makeup Palettes',
    category: 'makeup',
    description: 'Versatile warm nude, terracotta and festival shimmer eyeshadow collections.',
    image: "/images/categories/makeup-palettes.webp",
    itemCount: 19,
  },
  {
    name: 'Makeup Remover',
    category: 'skincare',
    description: 'Nourishing cleansing balms, bifocal waters, and gentle micellar liquids for clean skin.',
    image: "/images/categories/makeup-remover.webp",
    itemCount: 16,
  },
  {
    name: 'Haircare',
    category: 'haircare',
    description: 'Bond-repair hair serums, peptide scalp density drops, and nourishing hair masks.',
    image: "/images/categories/haircare.webp",
    itemCount: 28,
  },
  {
    name: 'Body Care',
    category: 'bodycare',
    description: 'Exfoliating AHA/BHA body washes, ceramide skin smoothing lotions, and body sunscreens.',
    image: "/images/categories/body-care.webp",
    itemCount: 31,
  },
];
