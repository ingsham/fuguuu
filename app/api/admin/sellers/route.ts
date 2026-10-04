import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
const schema=z.object({sellerId:z.string(),shopName:z.string().trim().min(2).max(120),bio:z.string().trim().max(4000).optional().default(''),region:z.string().trim().max(100).optional().default('')});
export async function PATCH(req:Request){const s=await getServerSession(authOptions);if(!s?.user||(s.user as any).role!=='ADMIN')return NextResponse.json({error:'Forbidden'},{status:403});try{const b=schema.parse(await req.json());const p=await prisma.sellerProfile.update({where:{id:b.sellerId},data:{shopName:b.shopName,bio:b.bio,region:b.region}});await prisma.auditLog.create({data:{adminId:(s.user as any).id,action:'SELLER_PROFILE_EDIT',targetType:'SELLER',targetId:p.id,metadata:{shopName:p.shopName,region:p.region}}});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'Unable to update seller profile.'},{status:400})}}
