'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

declare global { interface Window { PaystackPop?: any } }

export default function PaystackInlineCheckout({ email, reference, amount, publicKey, onClose }: { email:string; reference:string; amount:number; publicKey:string; onClose:()=>void }) {
  const router=useRouter(); const [loading,setLoading]=useState(true); const [error,setError]=useState('');
  useEffect(()=>{
    let cancelled=false;
    const start=()=>{ if(cancelled)return; const key=publicKey.trim(); if(!key){setError('Secure payment is not configured. Please contact Fuguaa support.');setLoading(false);return} if(!window.PaystackPop){setError('Secure payment could not load. Please try again.');setLoading(false);return}
      const handler=window.PaystackPop.setup({key, email, amount:Math.round(amount*100), currency:'GHS', ref:reference, onClose:()=>{onClose()}, callback:async (response:any)=>{setLoading(true);const r=await fetch('/api/payments/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reference:response.reference})});const j=await r.json();if(!r.ok||!j.paid){setError(j.error||'Payment could not be confirmed.');setLoading(false);return}router.push(`/checkout/success?reference=${encodeURIComponent(response.reference)}`)}});handler.openIframe();setLoading(false)};
    if(window.PaystackPop)start(); else {const s=document.createElement('script');s.src='https://js.paystack.co/v2/inline.js';s.async=true;s.onload=start;s.onerror=()=>{if(!cancelled){setError('Secure payment could not load. Please check your connection and try again.');setLoading(false)}};document.body.appendChild(s)}
    return()=>{cancelled=true};
  },[email,reference,amount,publicKey,onClose,router]);
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm"><div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cream text-terracotta"><span className="text-2xl">₵</span></div><h2 className="mt-4 text-2xl font-black">Secure payment</h2><p className="mt-2 text-sm leading-6 text-black/60">Your payment is being handled securely by Paystack. Your card or mobile-money details never pass through Fuguaa.</p>{loading&&<div className="mt-6 rounded-2xl bg-cream p-4 text-sm font-bold text-ink">Opening secure checkout…</div>}{error&&<div className="mt-6 rounded-2xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}<button onClick={onClose} className="mt-6 text-sm font-bold text-black/50 hover:text-ink">Cancel payment</button></div></div>
}
