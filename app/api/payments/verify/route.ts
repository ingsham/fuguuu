import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { refundPaystack, verifyPaystack } from '@/lib/paystack';
import { notify, notifyAdmin } from '@/lib/notifications';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'BUYER') return NextResponse.json({ error: 'Buyer access required.' }, { status: 403 });
  let reference = '';
  try {
    const body = await req.json();
    reference = typeof body.reference === 'string' ? body.reference.trim() : '';
    if (!reference) return NextResponse.json({ error: 'Payment reference required.' }, { status: 400 });

    const checkout = await prisma.checkout.findFirst({
      where: { reference, buyerId: (s.user as any).id },
      include: { payment: true, orders: { include: { items: true, seller: { include: { user: true } } } } },
    });
    if (!checkout) return NextResponse.json({ error: 'Checkout not found.' }, { status: 404 });

    const verified = await verifyPaystack(reference, Number(checkout.total));
    if (verified.data?.status !== 'success') return NextResponse.json({ paid: false, status: verified.data?.status || 'pending' });

    if (checkout.payment?.status !== 'SUCCESS') {
      try {
        await prisma.$transaction(async tx => {
          const claimed = await tx.payment.updateMany({ where: { checkoutId: checkout.id, status: 'PENDING' }, data: { status: 'SUCCESS' } });
          if (claimed.count !== 1) return;
          for (const order of checkout.orders) {
            await tx.order.update({ where: { id: order.id }, data: { status: 'PAID', paymentStatus: 'SUCCESS' } });
            for (const item of order.items) {
              const updated = await tx.product.updateMany({ where: { id: item.productId, stock: { gte: item.quantity } }, data: { stock: { decrement: item.quantity } } });
              if (!updated.count) throw new Error(`Insufficient stock for ${item.productId}`);
            }
          }
        });

        // Payment succeeded and the transaction was claimed. Fan out the sale
        // notification only once, after stock has been reserved successfully.
        await Promise.allSettled([
          notify({
            userId: checkout.buyerId,
            type: 'PAYMENT_SUCCESS',
            subject: 'Payment confirmed',
            message: `Your Fuguaa payment ${reference} was successful. Your order is now being prepared.`,
            email: (s.user as any).email,
            phone: (s.user as any).phone,
          }),
          ...checkout.orders.map(order =>
            notify({
              userId: order.seller.userId,
              type: 'NEW_ORDER',
              subject: `New Fuguaa order ${order.orderNumber}`,
              message: `You have a new paid order ${order.orderNumber} for ${order.total.toFixed(2)} GHS. Please confirm the order and begin processing it.`,
              email: order.seller.user.email,
              phone: order.seller.user.phone,
            })
          ),
          notifyAdmin(
            'New Fuguaa sale',
            `Payment ${reference} was successful. ${checkout.orders.length} seller order${checkout.orders.length === 1 ? '' : 's'} created. Total: ${checkout.total.toFixed(2)} GHS.`,
            'NEW_ORDER'
          ),
        ]);
      } catch (stockError) {
        console.error('PAYMENT_VERIFY_STOCK_CONFLICT', stockError);
        try {
          await refundPaystack(reference, Number(checkout.total));
          await prisma.$transaction([
            prisma.payment.updateMany({ where: { checkoutId: checkout.id }, data: { status: 'REFUNDED' } }),
            ...checkout.orders.map(o => prisma.order.update({ where: { id: o.id }, data: { status: 'REFUNDED', paymentStatus: 'REFUNDED', escrowStatus: 'REFUNDED' } })),
          ]);
          return NextResponse.json({ paid: false, refunded: true, error: 'The payment succeeded but stock changed before confirmation. The payment has been refunded.' }, { status: 409 });
        } catch (refundError) {
          console.error('PAYMENT_VERIFY_REFUND_FAILED', refundError);
          return NextResponse.json({ error: 'Payment succeeded but stock could not be confirmed. Fuguaa support must review this payment.' }, { status: 409 });
        }
      }
    }
    return NextResponse.json({ paid: true, reference });
  } catch (e: any) {
    console.error('PAYMENT_VERIFY_ERROR', e);
    return NextResponse.json({ error: e?.message || 'Payment verification failed. Please wait a moment and check your orders.' }, { status: 400 });
  }
}
