import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptBuffer } from '@/lib/encryption';

export async function GET(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return new NextResponse('Forbidden', { status: 403 });
  const sellerId = new URL(req.url).searchParams.get('sellerId');
  if (!sellerId) return new NextResponse('Seller required', { status: 400 });
  const v = await prisma.sellerVerification.findUnique({ where: { sellerId } });
  if (!v) return new NextResponse('Document not found', { status: 404 });
  const r = await fetch(v.documentUrl, { cache: 'no-store' });
  if (!r.ok) return new NextResponse('Document unavailable', { status: 404 });
  try {
    const plain = decryptBuffer(Buffer.from(await r.arrayBuffer()));
    return new NextResponse(plain as any, { headers: { 'Content-Type': v.documentMimeType || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline' } });
  } catch { return new NextResponse('Invalid document', { status: 422 }); }
}
