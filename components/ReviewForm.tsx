'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReviewForm({ orderId, productId }: { orderId: string; productId: string }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function submit() {
    setBusy(true);
    const res = await fetch('/api/reviews', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ orderId, productId, rating, comment }),
    });
    const body = await res.json();
    if (!res.ok) alert(body.error || 'Unable to submit review');
    else { setDone(true); router.refresh(); }
    setBusy(false);
  }

  if (done) return <p className="text-sm font-bold text-green">Review submitted. Thank you.</p>;
  return <div className="mt-4 rounded-2xl bg-cream p-4">
    <p className="text-sm font-black">Leave a review</p>
    <div className="mt-2 flex gap-1" aria-label="Rating">
      {[1,2,3,4,5].map(n => <button type="button" key={n} onClick={() => setRating(n)} className={`text-xl ${n <= rating ? 'text-gold' : 'text-black/20'}`}>★</button>)}
    </div>
    <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={1000} className="field mt-2 min-h-20" placeholder="How was your smock?" />
    <button disabled={busy} onClick={submit} className="btn btn-primary mt-2 text-xs">{busy ? 'Submitting...' : 'Submit review'}</button>
  </div>;
}
