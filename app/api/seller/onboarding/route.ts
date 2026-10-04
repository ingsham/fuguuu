export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { encryptSensitive } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    const s = await getServerSession(authOptions);
    if (!s?.user || (s.user as any).role !== 'SELLER') {
      return NextResponse.json({ error: 'Please log in with your seller account first.' }, { status: 401 });
    }
    if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
      return NextResponse.json({ error: 'NEXTAUTH_SECRET is not configured in Vercel.' }, { status: 503 });
    }
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json({ error: 'Seller document storage is not configured yet. Add BLOB_READ_WRITE_TOKEN in Vercel.' }, { status: 503 });
    }

    const f = await req.formData();
    const file = f.get('document') as File | null;
    if (!file) return NextResponse.json({ error: 'Identity document is required.' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Maximum document size is 5MB.' }, { status: 400 });
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Unsupported document type. Use JPG, PNG or PDF.' }, { status: 400 });

    const sellerId = (s.user as any).id as string;
    const u = await prisma.user.findUnique({ where: { id: sellerId }, include: { sellerProfile: true } });
    if (!u?.sellerProfile) return NextResponse.json({ error: 'Seller profile not found. Please contact Fuguaa support.' }, { status: 404 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const blob = await put(`seller-verification/${sellerId}-${Date.now()}-${safeName}`, file, { access: 'public', addRandomSuffix: true });

    await prisma.$transaction([
      prisma.sellerProfile.update({
        where: { id: u.sellerProfile.id },
        data: {
          shopName: String(f.get('shopName') || '').trim(),
          bio: String(f.get('story') || '').trim(),
          region: String(f.get('region') || '').trim(),
          country: String(f.get('country') || '').trim(),
          verificationStatus: 'PENDING',
        },
      }),
      prisma.sellerVerification.upsert({
        where: { sellerId: u.sellerProfile.id },
        update: {
          documentType: String(f.get('documentType')) as any,
          documentNumberEncrypted: encryptSensitive(String(f.get('documentNumber') || '')),
          documentUrl: blob.url,
          status: 'PENDING',
          submittedAt: new Date(),
          reviewedAt: null,
          rejectionReason: null,
        },
        create: {
          sellerId: u.sellerProfile.id,
          documentType: String(f.get('documentType')) as any,
          documentNumberEncrypted: encryptSensitive(String(f.get('documentNumber') || '')),
          documentUrl: blob.url,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SELLER_ONBOARDING_ERROR', e);
    return NextResponse.json({ error: 'Unable to save verification. Check the Vercel database and Blob settings.' }, { status: 500 });
  }
}
