import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export const runtime = 'nodejs';
export async function GET() {
  const s = await getServerSession(authOptions);
  if (!s?.user) return NextResponse.json({ authenticated: false });
  const u = await prisma.user.findUnique({ where: { id: (s.user as any).id }, include: { sellerProfile: { include: { verification: true } } } });
  return NextResponse.json({ authenticated: true, id: u?.id, name: u?.name, email: u?.email, phone: u?.phone, country: u?.country || u?.sellerProfile?.country || null, role: (s.user as any).role, onboardingComplete: !!u?.sellerProfile && !!u.sellerProfile.shopName && !!u.sellerProfile.verification && u.sellerProfile.verificationStatus !== 'REJECTED', verificationStatus: u?.sellerProfile?.verificationStatus || null, rejectionReason: u?.sellerProfile?.verification?.rejectionReason || null });
}
const schema=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().min(7).max(30),country:z.string().trim().min(2).max(80)});
export async function PATCH(req:Request){const s=await getServerSession(authOptions);if(!s?.user)return NextResponse.json({error:'Please log in.'},{status:401});try{const b=schema.parse(await req.json());const u=await prisma.user.update({where:{id:(s.user as any).id},data:{name:b.name,phone:b.phone,country:b.country}});return NextResponse.json({ok:true,name:u.name,phone:u.phone,country:u.country});}catch{return NextResponse.json({error:'Please check your profile details.'},{status:400})}}
