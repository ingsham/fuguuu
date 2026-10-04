import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { initializePaystack } from '@/lib/paystack';
import { shippingSchema } from '@/lib/shipping';
import { rateLimit, requestKey } from '@/lib/rate-limit';
import { z } from 'zod';

const item = z.object({ id: z.string(), quantity: z.number().int().min(1).max(50), size: z.string().max(50).optional(), color: z.string().max(80).optional() });
const bodySchema = z.object({ items: z.array(item).min(1).max(50), shipping: shippingSchema });

export async function POST(req: Request) {
  const limited = rateLimit(requestKey(req, 'checkout'), 10, 60_000);
  if (!limited.ok) return NextResponse.json({ error: `Too many checkout attempts. Try again in ${limited.retryAfter}s.` }, { status: 429 });
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'BUYER') return NextResponse.json({ error: 'Please log in as a buyer before checkout.' }, { status: 401 });
  try {
    const parsed = bodySchema.parse(await req.json());
    const ids = Array.from(new Set(parsed.items.map(x => x.id)));
    const products = await prisma.product.findMany({ where: { id: { in: ids }, status: 'ACTIVE' }, include: { seller: true } });
    if (products.length !== ids.length) return NextResponse.json({ error: 'One or more products are unavailable.' }, { status: 400 });
    const map = new Map(products.map(p => [p.id, p]));
    const requestedByProduct = new Map<string, number>();
    for (const i of parsed.items) requestedByProduct.set(i.id, (requestedByProduct.get(i.id) || 0) + i.quantity);
    for (const [productId, quantity] of Array.from(requestedByProduct.entries())) {
      const p = map.get(productId)!;
      if (quantity > p.stock) return NextResponse.json({ error: `Not enough stock for ${p.title}.` }, { status: 400 });
    }
    for (const i of parsed.items) {
      const p = map.get(i.id)!;
      if (p.sizes.length && i.size && !p.sizes.includes(i.size)) return NextResponse.json({ error: `Selected size is unavailable for ${p.title}.` }, { status: 400 });
      if (p.colors.length && i.color && !p.colors.includes(i.color)) return NextResponse.json({ error: `Selected color is unavailable for ${p.title}.` }, { status: 400 });
    }
    const groups = new Map<string, typeof parsed.items>();
    for (const i of parsed.items) { const p = map.get(i.id)!; const arr = groups.get(p.sellerId) || []; arr.push(i); groups.set(p.sellerId, arr); }
    const total = parsed.items.reduce((sum, i) => sum + Number(map.get(i.id)!.price) * i.quantity, 0);
    const ref = `FUG-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const checkout = await prisma.checkout.create({ data: {
      reference: ref, buyerId: (s.user as any).id, total, currency: 'GHS',
      orders: { create: Array.from(groups.entries()).map(([sellerId, items]) => ({
        orderNumber: `${ref}-${sellerId.slice(-5).toUpperCase()}`, buyerId: (s.user as any).id, sellerId, total: items.reduce((a, i) => a + Number(map.get(i.id)!.price) * i.quantity, 0), status: 'PENDING', paymentStatus: 'PENDING', paystackReference: ref,
        shippingName: parsed.shipping.name, shippingPhone: parsed.shipping.phone, shippingCountry: parsed.shipping.country, shippingRegion: parsed.shipping.region, shippingCity: parsed.shipping.city, shippingAddress1: parsed.shipping.address1, shippingAddress2: parsed.shipping.address2 || null, shippingPostalCode: parsed.shipping.postalCode || null,
        items: { create: items.map(i => { const p = map.get(i.id)!; return { productId: p.id, quantity: i.quantity, price: p.price, size: i.size, color: i.color }; }) }
      })) },
      payment: { create: { reference: ref, amount: total, currency: 'GHS', status: 'PENDING' } }
    } });
    try {
      const pay = await initializePaystack(s.user.email!, total, ref);
      return NextResponse.json({ authorization_url: pay.data.authorization_url, reference: ref, checkoutId: checkout.id });
    } catch (e) {
      await prisma.checkout.delete({ where: { id: checkout.id } }).catch(() => undefined);
      throw e;
    }
  } catch (e: any) {
    return NextResponse.json({ error: e instanceof z.ZodError ? `Please check your delivery details: ${e.issues.map(i => `${i.path.join('.')} ${i.message}`).join('; ')}` : e.message || 'Checkout failed.' }, { status: 400 });
  }
}
