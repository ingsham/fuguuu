import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
export async function GET(){const s=await getServerSession(authOptions);if(!s?.user)return NextResponse.json({error:'Sign in required.'},{status:401});const userId=(s.user as any).id;const p=await prisma.notificationPreference.upsert({where:{userId},update:{},create:{userId}});return NextResponse.json(p)}
export async function PATCH(req:Request){const s=await getServerSession(authOptions);if(!s?.user)return NextResponse.json({error:'Sign in required.'},{status:401});const userId=(s.user as any).id;const b=await req.json();const data:any={};for(const k of ['inApp','email','sms'])if(typeof b[k]==='boolean')data[k]=b[k];const p=await prisma.notificationPreference.upsert({where:{userId},update:data,create:{userId,...data}});return NextResponse.json(p)}
