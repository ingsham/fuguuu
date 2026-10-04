import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyPaystack, refundPaystack } from '@/lib/paystack';
import { sendEmail, sendSms } from '@/lib/notifications';

export async function POST(req: Request) {
  const raw = await req.text();
  const sig = req.headers.get('x-paystack-signature') || '';
  if (!process.env.PAYSTACK_SECRET_KEY) return new NextResponse('not configured', { status: 503 });
  const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(raw).digest('hex');
  if (!sig || hash.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(sig))) return new NextResponse('invalid signature', { status: 401 });
  let event: any;
  try { event = JSON.parse(raw); } catch { return new NextResponse('invalid json', { status: 400 }); }
  if (event.event === 'charge.success') {
    const ref = event.data?.reference;
    if (!ref) return NextResponse.json({ received: true });
    const verified = await verifyPaystack(ref);
    if (verified.data?.status === 'success') {
      const checkout = await prisma.checkout.findUnique({ where: { reference: ref }, include: { orders: { include: { items: true, seller: { include: { user: true } } } }, payment: true, buyer: true } });
      if (checkout && checkout.payment?.status !== 'SUCCESS') {
        if (verified.data?.currency !== 'GHS' || Number(verified.data?.amount) !== Math.round(Number(checkout.total) * 100)) {
          console.error('PAYMENT_AMOUNT_MISMATCH', { ref, expected: Number(checkout.total) * 100, received: verified.data?.amount, currency: verified.data?.currency });
          return NextResponse.json({ received: true, rejected: true });
        }
        try {
          await prisma.$transaction(async tx => {
            const claimed = await tx.payment.updateMany({ where: { checkoutId: checkout.id, status: 'PENDING' }, data: { status: 'SUCCESS' } });
            if (claimed.count !== 1) return;
            for (const o of checkout.orders) {
              await tx.order.update({ where: { id: o.id }, data: { status: 'PAID', paymentStatus: 'SUCCESS' } });
              for (const i of o.items) {
                const changed = await tx.product.updateMany({ where: { id: i.productId, stock: { gte: i.quantity } }, data: { stock: { decrement: i.quantity } } });
                if (!changed.count) throw new Error(`Insufficient stock for ${i.productId}`);
              }
            }
          });
        } catch (stockError) {
          console.error('PAYMENT_STOCK_CONFLICT', stockError);
          await refundPaystack(ref);
          await prisma.$transaction([
            prisma.payment.update({ where: { checkoutId: checkout.id }, data: { status: 'REFUNDED' } }),
            ...checkout.orders.map(o => prisma.order.update({ where: { id: o.id }, data: { status: 'CANCELLED', paymentStatus: 'REFUNDED', escrowStatus: 'REFUNDED' } }))
          ]);
          return NextResponse.json({ received: true, refunded: true });
        }
        for (const o of checkout.orders) {
          const message = `New Fuguaa order ${o.orderNumber}: GHS ${Number(o.total).toFixed(2)}.`;
          await Promise.all([
            sendEmail(o.seller.user.email, 'New Fuguaa order', message),
            o.seller.user.phone ? sendSms(o.seller.user.phone, message) : Promise.resolve(),
            prisma.notification.create({ data: { userId: o.seller.userId, type: 'NEW_ORDER', channel: 'EMAIL', subject: 'New Fuguaa order', message, status: 'SENT', sentAt: new Date() } })
          ]);
          if (process.env.ADMIN_EMAIL) await sendEmail(process.env.ADMIN_EMAIL, 'New Fuguaa order', message);
        }
        await sendEmail(checkout.buyer.email, 'Fuguaa payment confirmed', `Your payment ${ref} was confirmed and your order is now being prepared.`);
        if (checkout.buyer.phone) await sendSms(checkout.buyer.phone, `Fuguaa payment confirmed: ${ref}`);
      }
    }
  }
  return NextResponse.json({ received: true });
}
