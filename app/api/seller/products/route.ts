import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(4000).optional().default(''),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
  images: z.array(z.string().url()).min(1).max(8),
  sizes: z.array(z.string().trim()).default([]),
  colors: z.array(z.string().trim()).default([]),
  fabricType: z.string().trim().max(100).optional().default(''),
  occasionTags: z.array(z.enum(['wedding','funeral','festival','everyday','children'])).default([]),
  sizeGuide: z.string().trim().max(2000).optional().default(''),
  publish: z.boolean().default(false),
});

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SELLER') return NextResponse.json({ error: 'Seller access required.' }, { status: 403 });
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!seller) return NextResponse.json({ error: 'Seller profile not found.' }, { status: 404 });
  if (seller.verificationStatus !== 'VERIFIED') return NextResponse.json({ error: 'Your seller account must be verified before publishing products.' }, { status: 403 });
  try {
    const data = schema.parse(await req.json());
    const base = slugify(data.title) || `product-${Date.now()}`;
    const slug = `${base}-${Math.random().toString(36).slice(2,7)}`;
    const product = await prisma.product.create({ data: {
      sellerId: seller.id, title: data.title, slug, description: data.description,
      price: data.price, stock: data.stock, status: data.publish ? 'ACTIVE' : 'DRAFT',
      sizes: data.sizes.filter(Boolean), colors: data.colors.filter(Boolean), fabricType: data.fabricType,
      occasionTags: data.occasionTags, sizeGuide: data.sizeGuide,
      images: { create: data.images.map((url, index) => ({ url, sortOrder: index, altText: data.title })) },
    }});
    return NextResponse.json({ id: product.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof z.ZodError ? 'Please check all product fields.' : 'Unable to create product.' }, { status: 400 });
  }
}
