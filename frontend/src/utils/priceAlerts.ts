export interface LocalPriceAlert {
  id: string;
  productId: string;
  productName: string;
  brand: string;
  image: string;
  targetPrice: number;
  updatedAt: string;
}

export const PRICE_ALERTS_KEY = 'pricewise_beauty_price_alerts';
export const PRICE_ALERTS_EVENT = 'pricewise:alerts-updated';

export function readPriceAlerts(): LocalPriceAlert[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(PRICE_ALERTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePriceAlerts(alerts: LocalPriceAlert[]) {
  try {
    localStorage.setItem(PRICE_ALERTS_KEY, JSON.stringify(alerts));
    window.dispatchEvent(new Event(PRICE_ALERTS_EVENT));
  } catch {
    // The alert remains usable in memory for this interaction if storage is unavailable.
  }
}
