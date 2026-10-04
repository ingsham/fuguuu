import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== 'SELLER') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const seller = await prisma.sellerProfile.findUnique({ where: { userId: (session.user as any).id } });
  if (!seller) return NextResponse.json({ error: 'Seller profile not found' }, { status: 404 });
  const product = await prisma.product.findFirst({ where: { id: params.id, sellerId: seller.id } });
  if (!product) return NextResponse.json({ error: 'Listing not found' }, { status: 404 });
  try {
    const { action } = await req.json();
    if (!['hide', 'unhide', 'delete'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    if (action === 'delete') await prisma.product.delete({ where: { id: product.id } });
    else await prisma.product.update({ where: { id: product.id }, data: { status: action === 'hide' ? 'HIDDEN' : 'ACTIVE' } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unable to update listing' }, { status: 400 });
  }
}
