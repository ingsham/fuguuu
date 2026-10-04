'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ListingActions({ productId, status }: { productId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function act(action: string) {
    if (action === 'delete' && !confirm('Delete this listing permanently?')) return;
    setBusy(true);
    const res = await fetch(`/api/seller/products/${productId}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
    if (!res.ok) alert((await res.json()).error || 'Action failed');
    router.refresh();
    setBusy(false);
  }
  return <div className="flex gap-2">{status === 'HIDDEN' ? <button disabled={busy} onClick={() => act('unhide')} className="btn btn-outline bg-white text-xs">Unhide</button> : <button disabled={busy} onClick={() => act('hide')} className="btn btn-outline bg-white text-xs">Hide</button>}<button disabled={busy} onClick={() => act('delete')} className="btn bg-red-50 text-xs text-red-700">Delete</button></div>;
}
