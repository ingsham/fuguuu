'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Success() {
  const [state,setState]=useState<'checking'|'paid'|'pending'|'error'>('checking');
  useEffect(()=>{const ref=new URLSearchParams(window.location.search).get('reference'); if(!ref){setState('pending');return;} fetch('/api/payments/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({reference:ref})}).then(async r=>{const j=await r.json();setState(r.ok&&j.paid?'paid':'pending')}).catch(()=>setState('error'))},[]);
  return <main className="container-x py-24 text-center"><div className="mx-auto max-w-lg card p-10"><div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green text-2xl text-white">{state==='paid'?'✓':'…'}</div><h1 className="mt-6 text-3xl font-black">{state==='paid'?'Payment received':'Payment verification'}</h1><p className="mt-3 text-black/60">{state==='paid'?'Your payment has been verified and your order is being prepared.':state==='error'?'We could not verify the payment yet. Your Paystack payment is not charged again by this page.': 'We are checking your Paystack payment. Your order will appear in your account once confirmed.'}</p><div className="mt-7 flex justify-center gap-3"><Link href="/orders" className="btn btn-primary">View orders</Link><Link href="/shop" className="btn btn-outline">Continue shopping</Link></div></div></main>;
}
