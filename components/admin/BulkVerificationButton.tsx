'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BulkVerificationButton({ sellerIds }: { sellerIds: string[] }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function approveAll() {
    if (!sellerIds.length || !confirm(`Approve all ${sellerIds.length} pending seller applications?`)) return;
    setBusy(true);
    try {
      const r = await fetch('/api/admin/verification', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'bulkApprove', sellerIds }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Unable to approve applications.');
      router.refresh();
    } catch (e: any) { alert(e.message || 'Unable to approve applications.'); }
    finally { setBusy(false); }
  }
  return <button disabled={busy || !sellerIds.length} onClick={approveAll} className="btn btn-primary">{busy ? 'Approving…' : `Approve all pending (${sellerIds.length})`}</button>;
}
