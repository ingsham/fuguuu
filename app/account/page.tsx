'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {signOut} from 'next-auth/react';

export default function Account(){
 const [a,setA]=useState<any>(null);
 useEffect(()=>{fetch('/api/account',{cache:'no-store'}).then(r=>r.json()).then(setA).catch(()=>{})},[]);
 if(a?.authenticated===false)return <main className="container-x py-20 text-center"><h1 className="text-3xl font-black">Sign in to your account</h1><Link href="/auth/login?next=%2Faccount" className="btn btn-primary mt-6">Log in</Link></main>;
 if(!a)return <main className="container-x py-20 text-center">Loading account…</main>;
 const first=String(a.name||'there').split(/\s+/)[0];
 return <main className="container-x max-w-4xl py-12">
   <div className="card overflow-hidden">
     <div className="woven p-8 sm:p-10">
       <p className="text-sm font-bold uppercase tracking-[.18em] text-terracotta">Your account</p>
       <h1 className="mt-2 text-4xl font-black">Hello, {first}</h1>
       <p className="mt-3 max-w-2xl text-black/60">View your orders, manage your saved items, and keep your personal details up to date.</p>
     </div>
     <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
       <Link href="/account/profile" className="group rounded-2xl border border-[#eadfd1] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg">
         <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-wider text-terracotta">Personal details</p><h2 className="mt-2 text-2xl font-black">View / Edit Profile</h2><p className="mt-2 text-sm leading-6 text-black/55">Update your name, phone number, and country.</p></div><span className="text-2xl text-terracotta transition group-hover:translate-x-1">→</span></div>
       </Link>
       <Link href="/orders" className="group rounded-2xl border border-[#eadfd1] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"><p className="text-sm font-bold uppercase tracking-wider text-terracotta">Purchases</p><h2 className="mt-2 text-2xl font-black">My Orders</h2><p className="mt-2 text-sm leading-6 text-black/55">Track orders and confirm delivery.</p><span className="mt-4 inline-block font-bold text-terracotta">View orders →</span></Link>
       <Link href="/favorites" className="group rounded-2xl border border-[#eadfd1] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"><p className="text-sm font-bold uppercase tracking-wider text-terracotta">Saved</p><h2 className="mt-2 text-2xl font-black">Saved Items</h2><p className="mt-2 text-sm leading-6 text-black/55">Return to the smocks you love.</p><span className="mt-4 inline-block font-bold text-terracotta">View saved items →</span></Link>
       {a.role==='SELLER'&&<Link href={a.onboardingComplete&&a.verificationStatus==='VERIFIED'?'/dashboard/seller':'/seller-onboarding'} className="group rounded-2xl border border-[#eadfd1] bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-lg"><p className="text-sm font-bold uppercase tracking-wider text-terracotta">Seller</p><h2 className="mt-2 text-2xl font-black">{a.onboardingComplete&&a.verificationStatus==='VERIFIED'?'Seller Dashboard':'Seller Verification'}</h2><p className="mt-2 text-sm leading-6 text-black/55">{a.onboardingComplete&&a.verificationStatus==='VERIFIED'?'Manage your shop and listings.':'Complete or review your seller verification.'}</p><span className="mt-4 inline-block font-bold text-terracotta">Continue →</span></Link>}
     </div>
   </div>
   <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-cream p-5"><p className="text-sm text-black/70"><strong className="text-ink">Account security:</strong> Never share your password or payment details.</p><button onClick={()=>signOut({callbackUrl:'/'})} className="btn btn-outline">Sign out</button></div>
 </main>
}
