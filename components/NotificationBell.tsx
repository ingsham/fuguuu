'use client';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function NotificationBell() {
  const [items,setItems]=useState<any[]>([]); const [unread,setUnread]=useState(0); const [open,setOpen]=useState(false);
  async function load(){ const r=await fetch('/api/notifications',{cache:'no-store'}); if(!r.ok)return; const j=await r.json(); setItems(j.items||[]); setUnread(j.unread||0); }
  useEffect(()=>{load(); const id=setInterval(load,30000); return()=>clearInterval(id)},[]);
  async function mark(id?:string){ await fetch('/api/notifications',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(id?{id}:{all:true})}); load(); }
  return <div className="relative"><button aria-label="Notifications" onClick={()=>{setOpen(v=>!v); if(!open&&unread)mark()}} className="relative rounded-full border p-2 hover:bg-cream"><Bell className="h-5 w-5"/>{unread>0&&<span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-terracotta px-1 text-center text-[10px] font-black text-white">{unread>99?'99+':unread}</span>}</button>{open&&<div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border bg-white shadow-xl"><div className="flex items-center justify-between border-b p-4"><div><div className="font-black">Notifications</div><div className="text-xs text-black/50">Updates about your Fuguaa activity</div></div><Link onClick={()=>setOpen(false)} className="text-xs font-bold text-terracotta" href="/notifications">View all</Link></div><div className="max-h-80 overflow-auto">{items.slice(0,6).map(n=><button key={n.id} onClick={()=>mark(n.id)} className="block w-full border-b p-4 text-left hover:bg-cream/50"><div className="flex gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.status==='UNREAD'?'bg-terracotta':'bg-black/10'}`}/><div><div className="text-sm font-bold">{n.subject}</div><div className="mt-1 text-xs leading-5 text-black/60">{n.message}</div><div className="mt-2 text-[10px] text-black/40">{new Date(n.createdAt).toLocaleString()}</div></div></div></button>)}{!items.length&&<div className="p-8 text-center text-sm text-black/50">You’re all caught up.</div>}</div></div>}</div>
}
