export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { money } from '@/lib/utils';

export default async function Admin() {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (e) {
    console.error('ADMIN_AUTH_ERROR', e);
    return <main className="container-x py-20"><div className="card mx-auto max-w-2xl p-8 text-center"><p className="text-sm font-bold uppercase tracking-wider text-terracotta">Admin setup</p><h1 className="mt-2 text-3xl font-black">Authentication needs one setting</h1><p className="mt-3 text-black/60">Add NEXTAUTH_SECRET to your Vercel Production environment variables, then redeploy.</p><div className="mt-6 rounded-2xl bg-cream p-4 text-left text-sm"><b>Vercel → Settings → Environment Variables</b><br />Name: <code>NEXTAUTH_SECRET</code><br />Value: a long random secret.</div></div></main>;
  }

  if (!session?.user || (session.user as any).role !== 'ADMIN') return <main className="container-x py-20 text-center"><h1 className="text-3xl font-black">Admin dashboard</h1><p className="mt-2 text-black/60">Administrator access is required.</p><Link href="/auth/login" className="btn btn-primary mt-6">Log in as admin</Link></main>;

  try {
    const [sellers, orders, products, pending, completed] = await Promise.all([
      prisma.sellerProfile.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.order.count({ where: { status: 'COMPLETED' } }),
      prisma.product.count(),
      prisma.sellerProfile.count({ where: { verificationStatus: 'PENDING' } }),
      prisma.order.findMany({ where: { paymentStatus: 'SUCCESS', status: { not: 'REFUNDED' } }, select: { total: true } }),
    ]);
    const gmv = completed.reduce((a, o) => a + Number(o.total), 0);
    return <main className="container-x py-10"><div><p className="text-sm font-bold uppercase tracking-wider text-terracotta">Platform control</p><h1 className="mt-2 text-4xl font-black">Fuguaa Admin</h1></div><div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="card p-6"><p className="text-sm text-black/50">Verified sellers</p><p className="mt-2 text-3xl font-black">{sellers}</p></div><div className="card p-6"><p className="text-sm text-black/50">Completed orders</p><p className="mt-2 text-3xl font-black">{orders}</p></div><div className="card p-6"><p className="text-sm text-black/50">GMV</p><p className="mt-2 text-3xl font-black text-terracotta">{money(gmv)}</p></div></div><div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3"><Link className="card p-6 hover:-translate-y-1 transition" href="/dashboard/admin/verification"><p className="text-sm text-black/50">Verification</p><p className="mt-2 text-2xl font-black">{pending} pending</p></Link><Link className="card p-6 hover:-translate-y-1 transition" href="/dashboard/admin/listings"><p className="text-sm text-black/50">Listings</p><p className="mt-2 text-2xl font-black">{products}</p></Link><Link className="card p-6 hover:-translate-y-1 transition" href="/dashboard/admin/sellers"><p className="text-sm text-black/50">Sellers</p><p className="mt-2 text-2xl font-black">Manage sellers</p></Link><Link className="card p-6 hover:-translate-y-1 transition" href="/dashboard/admin/disputes"><p className="text-sm text-black/50">Disputes</p><p className="mt-2 text-2xl font-black">Review queue</p></Link><Link className="card p-6 hover:-translate-y-1 transition" href="/dashboard/admin/buyers"><p className="text-sm text-black/50">Buyers</p><p className="mt-2 text-2xl font-black">Manage buyers</p></Link><Link className="card p-6 hover:-translate-y-1 transition" href="/dashboard/admin/orders"><p className="text-sm text-black/50">Orders & tracking</p><p className="mt-2 text-2xl font-black">Track every delivery</p></Link><Link className="card p-6 hover:-translate-y-1 transition" href="/dashboard/admin/audit"><p className="text-sm text-black/50">Audit log</p><p className="mt-2 text-2xl font-black">View activity</p></Link></div></main>;
  } catch (e) {
    console.error('ADMIN_DATABASE_ERROR', e);
    return <main className="container-x py-20"><div className="card mx-auto max-w-2xl p-8 text-center"><p className="text-sm font-bold uppercase tracking-wider text-terracotta">Database connection</p><h1 className="mt-2 text-3xl font-black">The admin dashboard could not load</h1><p className="mt-3 text-black/60">The database is not reachable or its schema is not up to date. Check the Vercel deployment logs and the Neon DATABASE_URL/DIRECT_URL settings.</p><Link href="/api/health" className="btn btn-outline mt-6">Check database health</Link></div></main>;
  }
}
