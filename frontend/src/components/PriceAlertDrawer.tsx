import { useEffect, useState } from 'react';
import { Bell, Trash2, X } from 'lucide-react';
import { PRICE_ALERTS_EVENT, readPriceAlerts, writePriceAlerts, type LocalPriceAlert } from '../utils/priceAlerts';

interface PriceAlertDrawerProps { open: boolean; onClose: () => void; }

export function PriceAlertDrawer({ open, onClose }: PriceAlertDrawerProps) {
  const [alerts, setAlerts] = useState<LocalPriceAlert[]>(readPriceAlerts);
  useEffect(() => {
    const refresh = () => setAlerts(readPriceAlerts());
    window.addEventListener(PRICE_ALERTS_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(PRICE_ALERTS_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open, onClose]);
  const remove = (id: string) => {
    const next = alerts.filter((alert) => alert.id !== id);
    setAlerts(next);
    writePriceAlerts(next);
  };
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button aria-label="Close price alerts" onClick={onClose} className="absolute inset-0 bg-espresso/35 backdrop-blur-[2px]" />
      <aside role="dialog" aria-modal="true" aria-labelledby="alerts-title" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-line bg-ivory shadow-2xl animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <div><p className="text-[10px] font-bold uppercase tracking-[.18em] text-rose">Your watchlist</p><h2 id="alerts-title" className="mt-1 font-editorial text-3xl font-semibold text-espresso">Price alerts</h2></div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white text-taupe hover:text-espresso"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {alerts.length ? alerts.map((alert) => (
            <article key={alert.id} className="flex gap-4 rounded-2xl border border-line bg-white p-3.5 shadow-card">
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-champagne">
                {alert.image && <img src={alert.image.startsWith('/images/') ? `${import.meta.env.BASE_URL}${alert.image.slice(1)}` : alert.image} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />}
              </div>
              <div className="min-w-0 flex-1"><p className="truncate text-[10px] font-bold uppercase tracking-[.12em] text-rose">{alert.brand}</p><h3 className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-espresso">{alert.productName}</h3><p className="mt-2 text-[11px] text-taupe">Notify me at <strong className="tabular-nums text-emerald">₹{alert.targetPrice.toLocaleString('en-IN')}</strong></p></div>
              <button type="button" onClick={() => remove(alert.id)} aria-label={`Remove alert for ${alert.productName}`} className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-taupe hover:bg-rose/10 hover:text-rose"><Trash2 className="h-4 w-4" /></button>
            </article>
          )) : (
            <div className="flex h-full min-h-64 flex-col items-center justify-center px-8 text-center"><span className="grid h-14 w-14 place-items-center rounded-full bg-champagne text-rose"><Bell className="h-6 w-6" /></span><h3 className="mt-5 font-editorial text-2xl font-semibold text-espresso">Your next good find</h3><p className="mt-2 max-w-xs text-sm leading-6 text-taupe">Set a target price on a product page and we’ll keep it here for you.</p></div>
          )}
        </div>
        <div className="border-t border-line px-6 py-4 text-[11px] leading-5 text-taupe">Alerts are saved on this device. Prices and availability can change at the retailer.</div>
      </aside>
    </div>
  );
}
