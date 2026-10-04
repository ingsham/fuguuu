'use client';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SignupForm({ seller = false }: { seller?: boolean }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const f = new FormData(e.currentTarget);
      const body = Object.fromEntries(f.entries());
      const r = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...body, role: seller ? 'SELLER' : 'BUYER' }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(j.error || 'Unable to create account. Please try again.');
        return;
      }
      const login = await signIn('credentials', {
        email: body.email,
        password: body.password,
        redirect: false,
      });
      if (login?.ok) router.push(seller ? '/seller-onboarding' : '/');
      else setError('Account created, but automatic login failed. Please log in manually.');
    } catch {
      setError('We could not reach Fuguaa. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={submit} className="mt-7 space-y-4">
    <input name="name" required placeholder="Full name" className="field" />
    <input name="email" type="email" required placeholder="Email" className="field" />
    <input name="password" type="password" minLength={8} required placeholder="Password (8+ characters)" className="field" />
    <input name="phone" required placeholder="Phone number" className="field" />
    <select name="country" className="field" defaultValue="Ghana">
      <option>Ghana</option><option>Nigeria</option><option>United States</option><option>United Kingdom</option><option>Other</option>
    </select>
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
    <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Creating account…' : 'Create account'}</button>
  </form>;
}
