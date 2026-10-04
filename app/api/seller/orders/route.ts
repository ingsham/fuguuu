import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, sendSms } from '@/lib/notifications';

const transitions: Record<string, string[]> = {
  PAID: ['CONFIRMED'],
  CONFIRMED: ['PROCESSING'],
  PROCESSING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SELLER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { orderId, status } = await req.json();
    if (!orderId || !status) return NextResponse.json({ error: 'Order and status are required' }, { status: 400 });

    const seller = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
    if (!seller) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });

    const order = await prisma.order.findFirst({
      where: { id: orderId, sellerId: seller.id },
      include: { buyer: true, items: { include: { product: true } } },
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    const allowed = transitions[order.status] || [];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: `Cannot move an order from ${order.status} to ${status}` }, { status: 400 });
    }

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        status,
        deliveredAt: status === 'DELIVERED' ? new Date() : order.deliveredAt,
      },
    });

    const subject = `Fuguaa order ${order.orderNumber} is ${status.toLowerCase()}`;
    const message = `Your Fuguaa order ${order.orderNumber} from ${seller.shopName} is now ${status.toLowerCase()}.`;
    await sendEmail(order.buyer.email, subject, `<p>${message}</p>`);
    if (order.buyer.phone) await sendSms(order.buyer.phone, message);

    return NextResponse.json({ ok: true, order: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unable to update order' }, { status: 400 });
  }
}
