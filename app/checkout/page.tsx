'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { money } from '@/lib/utils';
import { countries } from '@/lib/locations';

export default function Checkout() {
  const [items, setItems] = useState<any[]>([]);
  const [country, setCountry] = useState('Ghana');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const selected = useMemo(() => countries.find(c => c.name === country) || countries[0], [country]);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem('fuguaa_cart') || '[]');
      setItems(Array.isArray(raw) ? raw.map((x:any) => ({ ...x, id: String(x.id || ''), quantity: Math.max(1, Number(x.quantity) || 1), price: Number(x.price) || 0 })) : []);
    } catch { setItems([]); }
  }, []);
  const total = items.reduce((a, x) => a + Number(x.price) * x.quantity, 0);
  async function pay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (!items.length) throw new Error('Your cart is empty. Please add an item before paying.');
      const f = new FormData(e.currentTarget);
      const value = (key: string) => String(f.get(key) || '').trim();
      const phone = value('phone');
      const shipping = { name: value('name'), phone: `${selected.dial}${phone.replace(/^0+/, '')}`, country: value('country') || country, region: value('region'), city: value('city'), address1: value('address1'), address2: value('address2'), postalCode: value('postalCode') };
      const missing = ['name','phone','region','city','address1'].filter(k => !String((shipping as any)[k] || '').trim());
      if (missing.length) throw new Error('Please complete all required delivery details before paying.');
      const r = await fetch('/api/payments/initialize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({
        items: items.map(x => ({ id: String(x.id), quantity: Number(x.quantity), size: x.size ? String(x.size) : undefined, color: x.color ? String(x.color) : undefined })),
        shipping
      }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error || 'Unable to start payment');
      if (j.authorization_url) window.location.href = j.authorization_url; else router.push('/orders');
    } catch (e: any) { setError(e.message || 'Unable to start payment.'); setBusy(false); }
  }
  return <main className="container-x max-w-4xl py-12"><h1 className="text-4xl font-black">Checkout</h1><p className="mt-3 text-black/60">Secure payment through Paystack. Fuguaa never stores your card or mobile-money PIN.</p>
    <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_.7fr]"><form onSubmit={pay} className="card p-6"><h2 className="text-xl font-black">Delivery details</h2><div className="mt-5 space-y-4"><input name="name" required className="field" placeholder="Full name"/><div><label className="label">Phone number</label><div className="flex gap-2"><select className="field w-32" value={selected.code} onChange={e=>{const c=countries.find(x=>x.code===e.target.value);if(c)setCountry(c.name)}}>{countries.map(c=><option key={c.code} value={c.code}>{c.dial} · {c.code}</option>)}</select><input name="phone" required className="field flex-1" placeholder="Phone number" inputMode="tel"/></div></div><div><label className="label">Country</label><select name="country" className="field" value={country} onChange={e=>setCountry(e.target.value)}>{countries.map(c=><option key={c.code} value={c.name}>{c.name}</option>)}</select></div><div><label className="label">Region / State / Province</label><select name="region" required className="field"><option value="">Select region</option>{selected.regions.map(r=><option key={r} value={r}>{r}</option>)}</select></div><div className="grid gap-4 sm:grid-cols-2"><input name="city" required className="field" placeholder="City / Town"/><input name="postalCode" className="field" placeholder="Postal code (optional)"/></div><input name="address1" required className="field" placeholder="Street address / house number"/><input name="address2" className="field" placeholder="Apartment, landmark (optional)"/></div>{error&&<p className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button disabled={busy||!items.length} className="btn btn-primary mt-6 w-full">{busy?'Redirecting to secure payment…':`Pay ${money(total)}`}</button></form>
      <aside className="card h-fit p-6"><h2 className="font-black">Order summary</h2>{items.map(x=><div key={x.key} className="mt-4 flex justify-between gap-3 text-sm"><span>{x.title} × {x.quantity}</span><strong>{money(Number(x.price)*x.quantity)}</strong></div>)}<div className="my-6 border-t"/><div className="flex justify-between text-xl font-black"><span>Total</span><span className="text-terracotta">{money(total)}</span></div><p className="mt-4 text-xs leading-5 text-black/50">Payments are processed by Paystack. Fuguaa does not receive or store raw card details.</p><Link href="/cart" className="mt-5 block text-center text-sm font-bold">Back to cart</Link></aside></div></main>;
}
