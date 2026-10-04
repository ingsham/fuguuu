import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await req.json();
    if (body.action === 'bulkApprove') {
      const sellerIds = Array.isArray(body.sellerIds) ? body.sellerIds.filter((x: unknown): x is string => typeof x === 'string') : [];
      if (!sellerIds.length || sellerIds.length > 100) return NextResponse.json({ error: 'Select between 1 and 100 pending sellers.' }, { status: 400 });
      const pending = await prisma.sellerProfile.findMany({ where: { id: { in: sellerIds }, verificationStatus: 'PENDING' }, select: { id: true } });
      await prisma.$transaction(async tx => {
        for (const seller of pending) {
          await tx.sellerProfile.update({ where: { id: seller.id }, data: { verificationStatus: 'VERIFIED', verifiedAt: new Date() } });
          await tx.sellerVerification.update({ where: { sellerId: seller.id }, data: { status: 'VERIFIED', reviewedAt: new Date(), rejectionReason: null } });
          await tx.auditLog.create({ data: { adminId: (s.user as any).id, action: 'SELLER_BULK_APPROVE', targetType: 'SELLER', targetId: seller.id } });
        }
      });
      return NextResponse.json({ ok: true, approved: pending.length });
    }

    const { sellerId, action, rejectionReason } = body;
    if (typeof sellerId !== 'string' || !['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Invalid verification request.' }, { status: 400 });
    if (action === 'reject' && !String(rejectionReason || '').trim()) return NextResponse.json({ error: 'A rejection reason is required.' }, { status: 400 });
    const status = action === 'approve' ? 'VERIFIED' : 'REJECTED';
    await prisma.$transaction([
      prisma.sellerProfile.update({ where: { id: sellerId }, data: { verificationStatus: status as any, verifiedAt: action === 'approve' ? new Date() : null } }),
      prisma.sellerVerification.update({ where: { sellerId }, data: { status: status as any, reviewedAt: new Date(), rejectionReason: action === 'reject' ? String(rejectionReason).trim() : null } }),
      prisma.auditLog.create({ data: { adminId: (s.user as any).id, action: `SELLER_${action.toUpperCase()}`, targetType: 'SELLER', targetId: sellerId, metadata: action === 'reject' ? { rejectionReason: String(rejectionReason).trim() } : undefined } }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SELLER_VERIFICATION_ERROR', e);
    return NextResponse.json({ error: 'Unable to update seller verification.' }, { status: 400 });
  }
}
