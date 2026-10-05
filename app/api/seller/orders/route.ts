import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { notify, notifyAdmin } from '@/lib/notifications';

const transitions: Record<string, string[]> = { PAID: ['CONFIRMED'], CONFIRMED: ['PROCESSING'], PROCESSING: ['SHIPPED'], SHIPPED: ['DELIVERED'] };

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SELLER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const { orderId, status, carrier, trackingNumber } = await req.json();
    const seller = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
    if (!seller) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
    const order = await prisma.order.findFirst({ where: { id: orderId, sellerId: seller.id }, include: { buyer: true } });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (!status || !transitions[order.status]?.includes(status)) return NextResponse.json({ error: `Cannot move an order from ${order.status} to ${status}` }, { status: 400 });
    if (status === 'SHIPPED' && (!String(carrier || '').trim() || !String(trackingNumber || '').trim())) return NextResponse.json({ error: 'Carrier and tracking number are required before marking an order shipped.' }, { status: 400 });
    const updated = await prisma.order.update({ where: { id: order.id }, data: { status, deliveredAt: status === 'DELIVERED' ? new Date() : order.deliveredAt, shippingCarrier: status === 'SHIPPED' ? String(carrier).trim() : order.shippingCarrier, trackingNumber: status === 'SHIPPED' ? String(trackingNumber).trim() : order.trackingNumber } });
    const subject = `Fuguaa order ${order.orderNumber} is ${status.toLowerCase()}`;
    const message = `Your Fuguaa order ${order.orderNumber} from ${seller.shopName} is now ${status.toLowerCase()}.${status === 'SHIPPED' ? ` Carrier: ${carrier}. Tracking: ${trackingNumber}.` : ''}`;
    await Promise.allSettled([
      notify({ userId: order.buyerId, type: `ORDER_${status}`, subject, message, email: order.buyer.email, phone: order.buyer.phone }),
      notifyAdmin(`Order ${order.orderNumber} is ${status.toLowerCase()}`, `${seller.shopName} moved order ${order.orderNumber} to ${status.toLowerCase()}.${status === 'SHIPPED' ? ` Carrier: ${carrier}. Tracking: ${trackingNumber}.` : ''}`, `ORDER_${status}`),
    ]);
    return NextResponse.json({ ok: true, order: updated });
  } catch (error) { console.error(error); return NextResponse.json({ error: 'Unable to update order' }, { status: 400 }); }
}
