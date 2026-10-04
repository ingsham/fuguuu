import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { refundPaystack } from '@/lib/paystack';

export async function POST(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user || (s.user as any).role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { disputeId, action, note } = await req.json();
  const d = await prisma.dispute.findUnique({ where: { id: disputeId }, include: { order: true } });
  if (!d) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
  if (!['refund','release'].includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  if (d.status === 'RESOLVED_REFUND' || d.status === 'RESOLVED_RELEASE') return NextResponse.json({ error: 'This dispute is already resolved.' }, { status: 409 });
  try {
    if (action === 'refund') {
      if (!d.order.paystackReference) return NextResponse.json({ error: 'No Paystack reference is attached to this order.' }, { status: 400 });
      await refundPaystack(d.order.paystackReference, Number(d.order.total));
    }
    const status = action === 'refund' ? 'RESOLVED_REFUND' : 'RESOLVED_RELEASE';
    await prisma.$transaction([
      prisma.dispute.update({ where: { id: disputeId }, data: { status, resolutionNote: note || null, resolvedById: (s.user as any).id, resolvedAt: new Date() } }),
      prisma.order.update({ where: { id: d.orderId }, data: { status: action === 'refund' ? 'REFUNDED' : 'COMPLETED', paymentStatus: action === 'refund' ? 'REFUNDED' : 'SUCCESS', escrowStatus: action === 'refund' ? 'REFUNDED' : 'RELEASED' } }),
      prisma.auditLog.create({ data: { adminId: (s.user as any).id, action: `DISPUTE_${action.toUpperCase()}`, targetType: 'DISPUTE', targetId: disputeId, metadata: { note: note || null } } })
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) { console.error('DISPUTE_RESOLUTION_ERROR', e); return NextResponse.json({ error: e.message || 'Unable to resolve dispute.' }, { status: 400 }); }
}
