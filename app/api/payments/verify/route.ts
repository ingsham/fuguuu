import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { verifyPaystack } from '@/lib/paystack';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'BUYER') return NextResponse.json({ error: 'Buyer access required.' }, { status: 403 });
  try {
    const { reference } = await req.json();
    if (!reference || typeof reference !== 'string') return NextResponse.json({ error: 'Payment reference required.' }, { status: 400 });
    const checkout = await prisma.checkout.findFirst({ where: { reference, buyerId: (s.user as any).id }, include: { payment: true, orders: { include: { items: true } } } });
    if (!checkout) return NextResponse.json({ error: 'Checkout not found.' }, { status: 404 });
    const verified = await verifyPaystack(reference);
    if (verified.data?.status !== 'success') return NextResponse.json({ paid: false, status: verified.data?.status || 'pending' });
    if (checkout.payment?.status !== 'SUCCESS') {
      await prisma.$transaction(async tx => {
        const claimed = await tx.payment.updateMany({ where: { checkoutId: checkout.id, status: 'PENDING' }, data: { status: 'SUCCESS' } });
        if (claimed.count !== 1) return;
        for (const order of checkout.orders) await tx.order.update({ where: { id: order.id }, data: { status: 'PAID', paymentStatus: 'SUCCESS' } });
        for (const order of checkout.orders) for (const item of order.items) {
          const updated = await tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
          if (!updated.count) throw new Error(`Insufficient stock for ${item.productId}`);
        }
      });
    }
    return NextResponse.json({ paid: true, reference });
  } catch (e) {
    console.error('PAYMENT_VERIFY_ERROR', e);
    return NextResponse.json({ error: 'Payment verification failed. Please wait a moment and check your orders.' }, { status: 400 });
  }
}
