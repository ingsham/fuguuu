'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const nextStatus: Record<string, { value: string; label: string }> = {
  PAID: { value: 'CONFIRMED', label: 'Confirm order' },
  CONFIRMED: { value: 'PROCESSING', label: 'Start processing' },
  PROCESSING: { value: 'SHIPPED', label: 'Mark shipped' },
  SHIPPED: { value: 'DELIVERED', label: 'Mark delivered' },
};

export default function OrderStatusActions({ orderId, status }: { orderId: string; status: string }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const next = nextStatus[status];
  if (!next) return <span className="text-sm text-black/45">No seller action</span>;

  async function update() {
    setBusy(true);
    const res = await fetch('/api/seller/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId, status: next.value }),
    });
    if (!res.ok) alert((await res.json()).error || 'Unable to update order');
    router.refresh();
    setBusy(false);
  }

  return <button disabled={busy} onClick={update} className="btn btn-primary text-xs">{busy ? 'Updating...' : next.label}</button>;
}
