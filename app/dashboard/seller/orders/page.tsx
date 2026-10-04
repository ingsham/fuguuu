import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { money } from '@/lib/utils';
import OrderStatusActions from '@/components/seller/OrderStatusActions';

export default async function SellerOrdersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SELLER') {
    return <main className="container-x py-20 text-center">Seller access required.</main>;
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: (session.user as any).id },
    include: {
      sellerOrders: {
        orderBy: { createdAt: 'desc' },
        include: { buyer: true, items: { include: { product: true } } },
      },
    },
  });
  if (!seller) return null;

  return (
    <main className="container-x py-10">
      <Link href="/dashboard/seller" className="text-sm font-bold text-terracotta">← Seller dashboard</Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-bold uppercase tracking-wider text-green">Seller orders</p>
          <h1 className="mt-2 text-4xl font-black">Manage orders</h1>
          <p className="mt-2 text-black/60">Confirm, process, ship and mark delivered orders from one place.</p>
        </div>
      </div>

      <div className="mt-8 space-y-5">
        {seller.sellerOrders.map(order => (
          <article key={order.id} className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
              <div>
                <p className="text-sm font-bold text-terracotta">{order.orderNumber}</p>
                <h2 className="mt-1 text-xl font-black">{order.buyer.name}</h2>
                <p className="text-sm text-black/50">{order.buyer.email}{order.buyer.phone ? ` · ${order.buyer.phone}` : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-black">{money(Number(order.total))}</p>
                <p className="text-sm font-bold uppercase tracking-wide text-black/50">{order.status}</p>
              </div>
            </div>

            <div className="py-5">
              {order.items.map(item => (
                <div key={item.id} className="flex justify-between gap-4 py-2 text-sm">
                  <span>{item.product.title} × {item.quantity}{item.size ? ` · ${item.size}` : ''}{item.color ? ` · ${item.color}` : ''}</span>
                  <span className="font-bold">{money(Number(item.price) * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-5">
              <p className="text-xs text-black/45">Placed {order.createdAt.toLocaleString()}</p>
              <OrderStatusActions orderId={order.id} status={order.status} />
            </div>
          </article>
        ))}
        {!seller.sellerOrders.length && <div className="card p-10 text-center text-black/60">You have no orders yet.</div>}
      </div>
    </main>
  );
}
