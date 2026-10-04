export async function initializePaystack(email: string, amount: number, reference: string) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is missing');
  const r = await fetch('https://api.paystack.co/transaction/initialize', { method: 'POST', headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, amount: Math.round(amount * 100), currency: 'GHS', reference, callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success?reference=${encodeURIComponent(reference)}` }) });
  if (!r.ok) throw new Error('Paystack initialization failed');
  return r.json();
}
export async function verifyPaystack(ref: string) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is missing');
  const r = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
  if (!r.ok) throw new Error('Paystack verification failed');
  return r.json();
}
export async function refundPaystack(reference: string, amountGhs?: number) {
  if (!process.env.PAYSTACK_SECRET_KEY) throw new Error('PAYSTACK_SECRET_KEY is missing');
  const body: Record<string, unknown> = { transaction: reference };
  if (amountGhs !== undefined) body.amount = Math.round(amountGhs * 100);
  const r = await fetch('https://api.paystack.co/refund', { method: 'POST', headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.status === false) throw new Error(data.message || 'Paystack refund failed');
  return data;
}
