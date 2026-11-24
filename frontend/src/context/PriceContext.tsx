import { createContext, useContext, type ReactNode } from 'react';
import { PRODUCTS_DATA } from '../data/products';
import type { Product } from '../types';

// Use the curated demo dataset without making price API requests.
const PriceContext = createContext<{ products: Product[] } | null>(null);

export function PriceProvider({ children }: { children: ReactNode }) {
  return <PriceContext.Provider value={{ products: PRODUCTS_DATA }}>{children}</PriceContext.Provider>;
}

export function useCatalogue() {
  const state = useContext(PriceContext);
  if (!state) throw new Error('PriceProvider is missing');
  return state;
}
