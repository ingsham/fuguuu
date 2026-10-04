'use client';
import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { countries } from '@/lib/locations';

export default function Onboarding() {
  const router = useRouter();
  const [country,setCountry]=useState('Ghana');
  const selected=countries.find(c=>c.name===country)||countries[0];
  useEffect(()=>{fetch('/api/account').then(r=>r.json()).then(a=>{if(!a.authenticated||a.role!=='SELLER'){router.push('/auth/login?next=%2Fseller-onboarding');}else if(a.onboardingComplete&&a.verificationStatus==='VERIFIED'){router.push('/dashboard/seller');}else if(a.country&&countries.some(c=>c.name===a.country)){setCountry(a.country);} if(a.rejectionReason) setRejection(a.rejectionReason);}).catch(()=>{});},[router]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [success, setSuccess] = useState(false); const [rejection, setRejection] = useState('');

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    try {
      const f = new FormData(e.currentTarget);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const r = await fetch('/api/seller/onboarding', { method: 'POST', body: f, signal: controller.signal });
      clearTimeout(timeout);
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsg(j.error || 'We could not submit your verification.');
        return;
      }
      setSuccess(true);
      setMsg('Submitted successfully. Your verification is now pending admin review.');
      setTimeout(() => router.push('/dashboard/seller'), 1200);
    } catch (err) {
      setMsg(err instanceof DOMException && err.name === 'AbortError'
        ? 'The upload took too long. Please check that Vercel Blob storage is configured, then try again.'
        : 'Something went wrong while submitting. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="container-x max-w-2xl py-12">
    <div className="card p-7 sm:p-10">
      <p className="text-sm font-bold uppercase tracking-wider text-green">Seller verification</p>
      <h1 className="mt-2 text-3xl font-black">Tell us about your shop</h1>
      {rejection && <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm text-red-700"><strong>Previous application feedback:</strong> {rejection}<br/>You can correct your details and resubmit below.</div>}<p className="mt-3 text-black/60">Your identity document is private and only accessible to authorized Fuguaa administrators.</p>
      <form onSubmit={submit} className="mt-8 space-y-5">
        <input name="shopName" required placeholder="Shop name" className="field" />
        <textarea name="story" rows={5} placeholder="Your story (optional)" className="field" />
        <div><label className="label">Country</label><select name="country" className="field" value={country} onChange={e=>setCountry(e.target.value)}>{countries.map(c=><option key={c.code} value={c.name}>{c.name}</option>)}</select></div><div><label className="label">Region / State / Province</label><select name="region" className="field" defaultValue=""><option value="">Select region</option>{selected.regions.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
        <div><label className="label">Identity document type</label><select name="documentType" className="field">{country==='Ghana'?<option value="GHANA_CARD">Ghana Card</option>:<option value="PASSPORT">Passport</option>}<option value="OTHER">Other ID</option></select></div>
        <label className="block rounded-2xl border border-dashed border-black/15 bg-cream/50 p-5"><span className="font-bold">Seller profile photo</span><span className="mt-1 block text-sm text-black/50">A clear face photo helps our verification team confirm the seller identity (max 4MB).</span><input name="sellerPhoto" required type="file" accept="image/jpeg,image/png,image/webp" className="mt-4 block w-full text-sm" /></label>
        <input name="documentNumber" required placeholder={country==='Ghana'?'Ghana Card number':'Passport / ID number'} className="field" />
        <label className="block rounded-2xl border border-dashed border-black/15 bg-cream/50 p-5">
          <span className="font-bold">Upload identity document</span>
          <span className="mt-1 block text-sm text-black/50">Choose a JPG, PNG or PDF from your device (max 5MB).</span>
          <input name="document" required type="file" accept="image/*,.pdf" className="mt-4 block w-full text-sm" />
        </label>
        {msg && <div className={`rounded-2xl p-4 text-sm ${success ? 'bg-green/10 text-green' : 'bg-red-50 text-red-700'}`}>{msg}</div>}
        <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Uploading & submitting…' : 'Submit for verification'}</button>
      </form>
    </div>
  </main>;
}
