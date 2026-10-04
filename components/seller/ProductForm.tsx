'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const occasions = ['wedding','funeral','festival','everyday','children'];
export default function ProductForm() {
  const router = useRouter(); const [busy,setBusy]=useState(false); const [error,setError]=useState(''); const [files,setFiles]=useState<File[]>([]);
  async function uploadFiles() {
    const urls:string[]=[];
    for (const file of files) {
      const fd=new FormData(); fd.append('file',file);
      const r=await fetch('/api/uploads',{method:'POST',body:fd}); const j=await r.json();
      if(!r.ok) throw new Error(j.error||'Image upload failed'); urls.push(j.url);
    }
    return urls;
  }
  async function submit(e:React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if(!files.length) throw new Error('Upload at least one product photo from your device.');
      const f=new FormData(e.currentTarget); const images=await uploadFiles();
      const body={title:f.get('title'),description:f.get('description'),price:f.get('price'),stock:f.get('stock'),images,
        sizes:String(f.get('sizes')||'').split(',').map(x=>x.trim()).filter(Boolean),colors:String(f.get('colors')||'').split(',').map(x=>x.trim()).filter(Boolean),
        fabricType:f.get('fabricType'),occasionTags:f.getAll('occasionTags'),sizeGuide:f.get('sizeGuide'),publish:f.get('publish')==='on'};
      const r=await fetch('/api/seller/products',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}); const j=await r.json();
      if(!r.ok) throw new Error(j.error||'Unable to create listing'); router.push('/dashboard/seller'); router.refresh();
    } catch(e:any){setError(e.message||'Something went wrong.')} finally{setBusy(false)}
  }
  return <form onSubmit={submit} className="space-y-5">
    <div><label className="label">Product title</label><input name="title" required className="field" placeholder="Classic Indigo Smock"/></div>
    <div><label className="label">Description</label><textarea name="description" rows={4} className="field" placeholder="Tell buyers about the piece..."/></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Price (GHS)</label><input name="price" type="number" min="0.01" step="0.01" required className="field"/></div><div><label className="label">Stock</label><input name="stock" type="number" min="0" required className="field"/></div></div>
    <div><label className="label">Product photos</label><input type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={e=>setFiles(Array.from(e.target.files||[]).slice(0,8))} className="field"/><p className="help">Select up to 8 images from your device. Maximum 8MB each.</p></div>
    <div className="grid gap-4 sm:grid-cols-2"><div><label className="label">Sizes</label><input name="sizes" className="field" placeholder="M, L, XL"/></div><div><label className="label">Colors</label><input name="colors" className="field" placeholder="Indigo, Cream"/></div></div>
    <div><label className="label">Fabric type</label><input name="fabricType" className="field" placeholder="Handwoven cotton"/></div>
    <div><label className="label">Occasions</label><div className="flex flex-wrap gap-2">{occasions.map(x=><label key={x} className="rounded-full border px-3 py-2 text-sm"><input type="checkbox" name="occasionTags" value={x} className="mr-2"/>{x}</label>)}</div></div>
    <div><label className="label">Size guide</label><textarea name="sizeGuide" rows={3} className="field" placeholder="Chest: 40–44 inches. Shoulder: 17–19 inches."/></div>
    <label className="flex items-center gap-3 rounded-2xl bg-cream p-4"><input type="checkbox" name="publish"/><span><strong>Publish immediately</strong><span className="block text-sm text-black/60">Only verified sellers can publish.</span></span></label>
    {error&&<p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <button disabled={busy} className="btn btn-primary w-full">{busy?'Uploading and saving…':'Create listing'}</button>
  </form>
}
