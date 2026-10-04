import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const schema = z.object({
  orderId: z.string().min(1),
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
});

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'BUYER') {
    return NextResponse.json({ error: 'Buyer access required.' }, { status: 401 });
  }
  try {
    const data = schema.parse(await req.json());
    const buyerId = (session.user as any).id;
    const order = await prisma.order.findFirst({
      where: { id: data.orderId, buyerId, status: 'COMPLETED' },
      include: { items: true },
    });
    if (!order || !order.items.some((item) => item.productId === data.productId)) {
      return NextResponse.json({ error: 'You can review only products from completed orders.' }, { status: 403 });
    }
    const review = await prisma.review.create({
      data: {
        orderId: data.orderId,
        productId: data.productId,
        buyerId,
        rating: data.rating,
        comment: data.comment || null,
        photos: [],
      },
    });
    return NextResponse.json({ ok: true, review });
  } catch (error: any) {
    if (error?.code === 'P2002') return NextResponse.json({ error: 'You have already reviewed this product for this order.' }, { status: 409 });
    return NextResponse.json({ error: error?.message || 'Unable to submit review.' }, { status: 400 });
  }
}
