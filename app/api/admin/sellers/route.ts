import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { decryptSensitive } from '@/lib/encryption';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user && (session.user as any).role === 'ADMIN' ? session : null;
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const q = (new URL(req.url).searchParams.get('q') || '').trim();
  const where = q
    ? {
        OR: [
          { shopName: { contains: q, mode: 'insensitive' as const } },
          { region: { contains: q, mode: 'insensitive' as const } },
          { user: { name: { contains: q, mode: 'insensitive' as const } } },
          { user: { email: { contains: q, mode: 'insensitive' as const } } },
          { user: { phone: { contains: q, mode: 'insensitive' as const } } },
        ],
      }
    : {};

  const rows = await prisma.sellerProfile.findMany({
    where,
    include: { user: true, verification: true },
    orderBy: { user: { createdAt: 'desc' } },
    take: 200,
  });

  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      shopName: r.shopName,
      bio: r.bio,
      region: r.region,
      country: r.country,
      photoUrl: r.photoUrl,
      verificationStatus: r.verificationStatus,
      user: {
        id: r.user.id,
        name: r.user.name,
        email: r.user.email,
        phone: r.user.phone,
        country: r.user.country,
      },
      verification: r.verification
        ? {
            documentType: r.verification.documentType,
            documentNumber: decryptSensitive(r.verification.documentNumberEncrypted),
            documentUrl: `/api/admin/verification/document?sellerId=${r.id}`,
            status: r.verification.status,
            rejectionReason: r.verification.rejectionReason,
            submittedAt: r.verification.submittedAt,
          }
        : null,
    })),
  );
}

export async function PATCH(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    if (typeof body.sellerId !== 'string') {
      return NextResponse.json({ error: 'Seller ID required' }, { status: 400 });
    }

    const data: Record<string, string> = {};
    for (const key of ['shopName', 'bio', 'region', 'country', 'photoUrl']) {
      if (typeof body[key] === 'string') data[key] = body[key].trim();
    }

    const seller = await prisma.sellerProfile.update({
      where: { id: body.sellerId },
      data,
    });

    await prisma.auditLog.create({
      data: {
        adminId: (session.user as any).id,
        action: 'SELLER_PROFILE_EDIT',
        targetType: 'SELLER',
        targetId: seller.id,
        metadata: { fields: Object.keys(data) },
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Unable to update seller profile' }, { status: 400 });
  }
}
