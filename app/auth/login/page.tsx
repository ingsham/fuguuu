'use client';

import { FormEvent, Suspense, useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/';

  useEffect(() => {
    if (params.get('created') === '1') {
      setError('Account created successfully. Please log in to continue.');
    }
  }, [params]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      const f = new FormData(e.currentTarget);
      const r = await signIn('credentials', {
        email: f.get('email'),
        password: f.get('password'),
        redirect: false,
      });

      if (r?.ok) {
        router.push(next);
        router.refresh();
        return;
      }

      const message = String(r?.error || '').toLowerCase();
      if (message.includes('configuration')) {
        setError('Fuguaa authentication is not configured. Check NEXTAUTH_SECRET and NEXTAUTH_URL in Vercel, then redeploy.');
      } else if (message.includes('database')) {
        setError('Fuguaa could not reach the database. Check DATABASE_URL and DIRECT_URL in Vercel.');
      } else {
        setError('Invalid email or password.');
      }
    } catch {
      setError('The login service is not configured correctly. Check NEXTAUTH_SECRET, NEXTAUTH_URL and DATABASE_URL in Vercel.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container-x max-w-md py-16">
      <div className="card p-7">
        <p className="text-sm font-bold text-terracotta">Welcome back</p>
        <h1 className="mt-2 text-3xl font-black">Log in to Fuguaa</h1>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <input name="email" type="email" required placeholder="Email" autoComplete="email" className="w-full rounded-xl border p-3" />
          <input name="password" type="password" required placeholder="Password" autoComplete="current-password" className="w-full rounded-xl border p-3" />
          {error && <p className="rounded-xl bg-cream p-3 text-sm text-red-700">{error}</p>}
          <button disabled={busy} className="btn btn-primary w-full">{busy ? 'Logging in…' : 'Log in'}</button>
        </form>
        <p className="mt-5 text-center text-sm text-black/60">
          New to Fuguaa? <Link className="font-bold text-terracotta" href="/signup">Create a buyer account</Link>
        </p>
      </div>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <main className="container-x max-w-md py-16">
        <div className="card p-7 text-center">Loading login…</div>
      </main>
    }>
      <LoginForm />
    </Suspense>
  );
}
