export const runtime = 'nodejs';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { put } from '@vercel/blob';
import { encryptSensitive, encryptBuffer } from '@/lib/encryption';
import { notify, notifyAdmin } from '@/lib/notifications';

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
    const shopName = String(f.get('shopName') || '').trim();
    const country = String(f.get('country') || '').trim();
    const region = String(f.get('region') || '').trim();
    const documentType = String(f.get('documentType') || '').trim();
    const documentNumber = String(f.get('documentNumber') || '').trim();
    if (shopName.length < 2 || shopName.length > 120) return NextResponse.json({ error: 'Shop name is required.' }, { status: 400 });
    if (!country || !region) return NextResponse.json({ error: 'Country and region are required.' }, { status: 400 });
    if (!documentNumber || documentNumber.length > 120) return NextResponse.json({ error: 'A valid identity document number is required.' }, { status: 400 });
    if (country === 'Ghana' && documentType !== 'GHANA_CARD') return NextResponse.json({ error: 'Ghana sellers must submit a Ghana Card.' }, { status: 400 });
    if (country !== 'Ghana' && documentType !== 'PASSPORT') return NextResponse.json({ error: 'International sellers must submit a passport.' }, { status: 400 });
    const file = f.get('document') as File | null;
    const photo = f.get('sellerPhoto') as File | null;
    if (!file) return NextResponse.json({ error: 'Identity document is required.' }, { status: 400 });
    if (!photo) return NextResponse.json({ error: 'A clear seller profile photo is required for verification.' }, { status: 400 });
    if (photo.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'Maximum seller photo size is 4MB.' }, { status: 400 });
    if (!['image/jpeg','image/png','image/webp'].includes(photo.type)) return NextResponse.json({ error: 'Seller photo must be JPG, PNG or WebP.' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Maximum document size is 5MB.' }, { status: 400 });
    const allowed = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) return NextResponse.json({ error: 'Unsupported document type. Use JPG, PNG or PDF.' }, { status: 400 });

    const sellerId = (s.user as any).id as string;
    const u = await prisma.user.findUnique({ where: { id: sellerId }, include: { sellerProfile: true } });
    if (!u?.sellerProfile) return NextResponse.json({ error: 'Seller profile not found. Please contact Fuguaa support.' }, { status: 404 });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const encrypted = encryptBuffer(Buffer.from(await file.arrayBuffer()));
    const blob = await put(`seller-verification/${sellerId}-${Date.now()}-${safeName}.enc`, encrypted, { access: 'public', addRandomSuffix: true });
    const photoName = photo.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const photoBlob = await put(`seller-profiles/${sellerId}-${Date.now()}-${photoName}`, photo, { access: 'public', addRandomSuffix: true });

    await prisma.$transaction([
      prisma.sellerProfile.update({
        where: { id: u.sellerProfile.id },
        data: {
          shopName,
          bio: String(f.get('story') || '').trim(),
          region,
          country,
          verificationStatus: 'PENDING',
          photoUrl: photoBlob.url,
        },
      }),
      prisma.sellerVerification.upsert({
        where: { sellerId: u.sellerProfile.id },
        update: {
          documentType: documentType as any,
          documentNumberEncrypted: encryptSensitive(documentNumber),
          documentUrl: blob.url,
          documentMimeType: file.type,
          status: 'PENDING',
          submittedAt: new Date(),
          reviewedAt: null,
          rejectionReason: null,
        },
        create: {
          sellerId: u.sellerProfile.id,
          documentType: documentType as any,
          documentNumberEncrypted: encryptSensitive(documentNumber),
          documentUrl: blob.url,
          documentMimeType: file.type,
        },
      }),
    ]);

    await notify({ userId: sellerId, type: 'SELLER_VERIFICATION_SUBMITTED', subject: 'Verification submitted', message: `Your seller verification for ${shopName} has been submitted and is awaiting review.`, email: u.email, phone: u.phone });
    await notifyAdmin('New seller verification', `${shopName} submitted seller verification and is awaiting review.`, 'NEW_SELLER_VERIFICATION');
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('SELLER_ONBOARDING_ERROR', e);
    return NextResponse.json({ error: 'Unable to save verification. Check the Vercel database and Blob settings.' }, { status: 500 });
  }
}
