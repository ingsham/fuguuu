export const dynamic = 'force-dynamic';
export const revalidate = 0;

import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { money } from '@/lib/utils';

const steps = ['PAID', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'];

function stepState(status: string, step: string) {
  const a = steps.indexOf(status);
  const b = steps.indexOf(step);
  if (status === 'REFUNDED' || status === 'CANCELLED' || status === 'DISPUTED') return status === step ? 'current' : 'idle';
  if (a > b) return 'done';
  if (a === b) return 'current';
  return 'idle';
}

export default async function AdminOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'ADMIN') {
    return <main className="container-x py-20 text-center">Administrator access is required.</main>;
  }

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      buyer: true,
      seller: true,
      items: { include: { product: true } },
    },
  });

  return (
    <main className="container-x py-10">
      <Link href="/dashboard/admin" className="text-sm font-bold text-terracotta">← Admin</Link>
      <div className="mt-3">
        <p className="text-sm font-bold uppercase tracking-wider text-terracotta">Marketplace operations</p>
        <h1 className="mt-2 text-4xl font-black">Orders & delivery tracking</h1>
        <p className="mt-2 max-w-3xl text-black/60">Track every paid order from the moment the customer pays until the customer confirms receipt. You can see the seller, buyer, delivery address, carrier and tracking number here.</p>
      </div>

      <div className="mt-8 space-y-5">
        {orders.map(order => (
          <article key={order.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
              <div>
                <p className="text-sm font-bold text-terracotta">{order.orderNumber}</p>
                <h2 className="mt-1 text-xl font-black">{order.seller.shopName}</h2>
                <p className="text-sm text-black/50">Buyer: {order.buyer.name} · {order.buyer.email}{order.buyer.phone ? ` · ${order.buyer.phone}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">{money(Number(order.total))}</p>
                <p className="text-sm font-bold uppercase tracking-wide text-black/50">{order.status}</p>
                <p className="text-xs text-black/45">Payment: {order.paymentStatus}</p>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto pb-2">
              <div className="flex min-w-[680px] items-start">
                {steps.map((step, index) => {
                  const state = stepState(order.status, step);
                  return <div key={step} className="flex flex-1 items-start">
                    <div className="min-w-0 flex-1 text-center">
                      <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-black ${state === 'done' ? 'bg-green text-white' : state === 'current' ? 'bg-terracotta text-white' : 'bg-cream text-black/40'}`}>{state === 'done' ? '✓' : index + 1}</div>
                      <p className={`mt-2 text-[11px] font-bold uppercase tracking-wide ${state === 'idle' ? 'text-black/35' : 'text-black/70'}`}>{step}</p>
                    </div>
                    {index < steps.length - 1 && <div className={`mt-4 h-1 flex-1 rounded ${steps.indexOf(order.status) > index ? 'bg-green' : 'bg-cream'}`} />}
                  </div>;
                })}
              </div>
            </div>

            {(order.status === 'DISPUTED' || order.status === 'REFUNDED' || order.status === 'CANCELLED') && (
              <div className="mt-4 rounded-xl bg-cream p-4 text-sm font-bold">Order status: {order.status}. Review the Disputes section if customer support action is required.</div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-cream/60 p-4 text-sm">
                <p className="font-black">Items</p>
                {order.items.map(item => <p key={item.id} className="mt-1">{item.product.title} × {item.quantity}{item.size ? ` · ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''}</p>)}
              </div>
              <div className="rounded-xl bg-cream/60 p-4 text-sm">
                <p className="font-black">Delivery</p>
                <p className="mt-1">{order.shippingName} · {order.shippingPhone}</p>
                <p>{order.shippingAddress1}{order.shippingAddress2 ? `, ${order.shippingAddress2}` : ''}, {order.shippingCity}, {order.shippingRegion}, {order.shippingCountry}{order.shippingPostalCode ? ` · ${order.shippingPostalCode}` : ''}</p>
                {order.shippingCarrier && <p className="mt-2"><strong>Carrier:</strong> {order.shippingCarrier}</p>}
                {order.trackingNumber && <p><strong>Tracking:</strong> {order.trackingNumber}</p>}
                {order.deliveredAt && <p className="mt-2"><strong>Delivered:</strong> {order.deliveredAt.toLocaleString()}</p>}
                {order.completedAt && <p><strong>Customer received:</strong> {order.completedAt.toLocaleString()}</p>}
              </div>
            </div>

            <p className="mt-4 border-t pt-4 text-xs text-black/45">Order placed {order.createdAt.toLocaleString()}</p>
          </article>
        ))}
        {!orders.length && <div className="card p-10 text-center text-black/60">No orders yet.</div>}
      </div>
    </main>
  );
}
