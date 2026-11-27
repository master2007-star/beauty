import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, BellRing, Check, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ProductImage } from '../components/ProductImage';
import { LiveRetailerPriceComparison } from '../components/LiveRetailerPriceComparison';
import { useCatalogue } from '../context/PriceContext';
import type { Product } from '../types';
import { findProductBySlugOrId } from '../utils/slug';
import { readPriceAlerts, writePriceAlerts, type LocalPriceAlert } from '../utils/priceAlerts';

export function ProductDetailPage() {
  const { slugOrId = '' } = useParams();
  const { products } = useCatalogue();
  const location = useLocation();
  const navigate = useNavigate();
  const locationProduct = (location.state as { product?: Product } | null)?.product;
  const sessionProduct = useMemo(() => {
    try { return JSON.parse(sessionStorage.getItem(`pricewise:product:${slugOrId}`) || 'null') as Product | null; } catch { return null; }
  }, [slugOrId]);
  const product = findProductBySlugOrId(products, slugOrId) || locationProduct || sessionProduct;
  const [target, setTarget] = useState('');
  const [savedAlert, setSavedAlert] = useState<LocalPriceAlert | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!product) return;
    const saved = readPriceAlerts().find((alert) => alert.productId === product.id) || null;
    setSavedAlert(saved);
    setTarget(saved ? String(saved.targetPrice) : '');
  }, [product?.id]);

  if (!product) return (
    <main className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center px-6 text-center">
      <p className="text-[10px] font-bold uppercase tracking-[.18em] text-rose">Product unavailable</p><h1 className="mt-3 font-editorial text-4xl font-semibold">We couldn’t find that beauty find</h1><p className="mt-2 max-w-md text-sm leading-6 text-taupe">Return to the storefront and choose another product to compare current retailer listings.</p><button onClick={() => navigate('/')} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-espresso px-5 text-xs font-semibold text-white hover:bg-rose"><ArrowLeft className="h-4 w-4" />Back to Beauty Storefront</button>
    </main>
  );

  const saveAlert = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(target);
    if (!Number.isFinite(amount) || amount <= 0) { setMessage('Enter a target price above ₹0.'); return; }
    const nextAlert: LocalPriceAlert = { id: savedAlert?.id || `price-alert-${product.id}`, productId: product.id, productName: product.name, brand: product.brand, image: product.image, targetPrice: Math.round(amount), updatedAt: new Date().toISOString() };
    const alerts = readPriceAlerts().filter((alert) => alert.productId !== product.id);
    writePriceAlerts([nextAlert, ...alerts]);
    setSavedAlert(nextAlert);
    setMessage(`Alert saved for ₹${nextAlert.targetPrice.toLocaleString('en-IN')}.`);
  };
  const removeAlert = () => {
    writePriceAlerts(readPriceAlerts().filter((alert) => alert.productId !== product.id));
    setSavedAlert(null); setTarget(''); setMessage('Price alert removed.');
  };

  return (
    <main className="min-h-screen bg-ivory pb-16">
      <div className="mx-auto max-w-[1320px] px-4 pt-5 sm:px-6 sm:pt-7 lg:px-10">
        <button type="button" onClick={() => navigate('/#catalog')} className="inline-flex min-h-11 items-center gap-2 rounded-full pr-3 text-[10px] font-semibold text-taupe transition-colors hover:text-rose sm:text-[11px]"><ArrowLeft aria-hidden="true" className="h-4 w-4" />Back to Beauty Storefront</button>
        <div className="mb-6 mt-4 flex items-center gap-1.5 text-[9px] text-taupe"><span>Beauty</span><ChevronRight className="h-3 w-3" /><span>{product.category}</span><ChevronRight className="h-3 w-3" /><span className="truncate text-espresso">{product.brand} {product.name}</span></div>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(330px,.88fr)_minmax(0,1.12fr)] lg:gap-12">
          <section className="space-y-5 lg:sticky lg:top-[calc(var(--site-header-height)+1.5rem)]">
            <div className="product-image-frame relative aspect-[4/4.4] overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-card sm:aspect-[4/4.15]">
              <ProductImage src={product.image} alt={`${product.brand} ${product.name}`} brand={product.brand} frameClassName="h-full w-full" className="object-contain p-5 sm:p-8" />
              <span className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-2 text-[9px] font-semibold text-taupe backdrop-blur"><ShieldCheck className="h-3.5 w-3.5 text-emerald" />5-store price comparison</span>
            </div>
            <div className="px-1">
              <p className="text-[10px] font-bold uppercase tracking-[.18em] text-rose">{product.brand} <span className="px-1 text-line">/</span> {product.subcategory}</p>
              <h1 className="mt-2 font-editorial text-[36px] font-semibold leading-[.98] text-espresso sm:text-[44px]">{product.name}</h1>
              <p className="mt-3 text-[11px] text-taupe">{product.quantity}{product.price > 0 ? ` · Currently from ₹${product.price.toLocaleString('en-IN')}` : ''}</p>
            </div>
            <form onSubmit={saveAlert} className="rounded-[1.25rem] border border-line bg-white p-4 shadow-card sm:p-5">
              <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-champagne text-rose"><BellRing className="h-[18px] w-[18px]" /></span><div><h2 className="font-editorial text-[23px] font-semibold leading-none text-espresso">Your price, your cue</h2><p className="mt-1.5 text-[10px] leading-4 text-taupe">Save a target price on this device and keep it in your alerts.</p></div></div>
              <label htmlFor="target-price" className="mt-4 block text-[9px] font-bold uppercase tracking-[.12em] text-taupe">Alert me when it reaches</label>
              <div className="mt-1.5 flex gap-2"><div className="flex min-h-12 min-w-0 flex-1 items-center rounded-xl border border-line bg-ivory px-3"><span className="mr-2 text-xs font-semibold text-taupe">₹</span><input id="target-price" type="number" min="1" inputMode="numeric" required value={target} onChange={(event) => setTarget(event.target.value)} placeholder="Enter target price" className="min-w-0 flex-1 bg-transparent text-sm font-semibold tabular-nums text-espresso outline-none placeholder:text-taupe/70" /></div><button type="submit" className="min-h-12 rounded-xl bg-espresso px-4 text-[10px] font-bold text-white transition-colors hover:bg-rose">{savedAlert ? 'Update' : 'Save alert'}</button></div>
              {savedAlert && <p className="mt-2 flex items-center gap-1 text-[9px] font-medium text-emerald"><Check className="h-3 w-3" />Saved target: ₹{savedAlert.targetPrice.toLocaleString('en-IN')} <button type="button" onClick={removeAlert} className="ml-auto rounded px-2 py-1 text-taupe underline underline-offset-2 hover:text-rose">Remove</button></p>}
              {message && <p role="status" className="mt-2 text-[10px] font-medium text-emerald">{message}</p>}
            </form>
          </section>
          <div className="min-w-0 lg:pt-2"><LiveRetailerPriceComparison product={product} /></div>
        </div>
        <p className="mx-auto mt-12 flex max-w-2xl items-center justify-center gap-2 text-center text-[9px] leading-4 text-taupe"><Sparkles aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-rose" />PriceWise helps you compare listed prices. Product details, seller, stock and final checkout prices are confirmed by each retailer.</p>
      </div>
    </main>
  );
}
