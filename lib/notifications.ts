import { prisma } from '@/lib/prisma';

export type NotificationInput = {
  userId: string;
  type: string;
  subject: string;
  message: string;
  email?: string | null;
  phone?: string | null;
  smsBody?: string;
  productImageUrl?: string | null;
  productTitle?: string | null;
  productId?: string | null;
  orderId?: string | null;
  sellerShopName?: string | null;
};

export async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return { skipped: true };
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }) });
  return { ok: r.ok, skipped: false };
}

export async function sendSms(to: string, body: string) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) return { skipped: true };
  const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
  const p = new URLSearchParams({ To: to, From: process.env.TWILIO_PHONE_NUMBER, Body: body });
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, { method: 'POST', headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: p });
  return { ok: r.ok, skipped: false };
}

export async function notify(input: NotificationInput) {
  const pref = await prisma.notificationPreference.upsert({ where: { userId: input.userId }, update: {}, create: { userId: input.userId } });
  const tasks: Promise<unknown>[] = [];
  if (pref.inApp) tasks.push(prisma.notification.create({ data: { userId: input.userId, type: input.type, channel: 'IN_APP', subject: input.subject, message: input.message, status: 'UNREAD', productImageUrl: input.productImageUrl || null, productTitle: input.productTitle || null, productId: input.productId || null, orderId: input.orderId || null, sellerShopName: input.sellerShopName || null } }));
  if (pref.email && input.email) tasks.push(sendEmail(input.email, input.subject, input.message));
  if (pref.sms && input.phone) tasks.push(sendSms(input.phone, input.smsBody || input.message));
  await Promise.allSettled(tasks);
}

export async function notifyAdmin(subject: string, message: string, type: string, details?: Pick<NotificationInput, 'productImageUrl' | 'productTitle' | 'productId' | 'orderId' | 'sellerShopName'>) {
  if (!process.env.ADMIN_EMAIL) return;
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true, email: true, phone: true } });
  await Promise.allSettled(admins.map(a => notify({ userId: a.id, type, subject, message, email: a.email, phone: a.phone, ...details })));
  if (!admins.length) await sendEmail(process.env.ADMIN_EMAIL, subject, message);
}
