import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const userId = (s.user as any).id;
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 50)));
  const items = await prisma.notification.findMany({ where: { userId, channel: 'IN_APP' }, orderBy: { createdAt: 'desc' }, take: limit });
  const unread = await prisma.notification.count({ where: { userId, channel: 'IN_APP', status: 'UNREAD' } });
  return NextResponse.json({ items, unread });
}

export async function PATCH(req: Request) {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ error: 'Sign in required.' }, { status: 401 });
  const userId = (s.user as any).id;
  const body = await req.json().catch(() => ({}));
  if (body.all) await prisma.notification.updateMany({ where: { userId, channel: 'IN_APP', status: 'UNREAD' }, data: { status: 'READ' } });
  else if (typeof body.id === 'string') await prisma.notification.updateMany({ where: { id: body.id, userId, channel: 'IN_APP' }, data: { status: 'READ' } });
  return NextResponse.json({ ok: true });
}
