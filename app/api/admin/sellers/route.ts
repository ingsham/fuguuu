import {NextResponse} from 'next/server';
import {getServerSession} from 'next-auth';
import {authOptions} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {decryptSensitive} from '@/lib/encryption';

async function admin(){const s=await getServerSession(authOptions);return s?.user&&(s.user as any).role==='ADMIN'?s:null}

export async function GET(req:Request){
 const s=await admin(); if(!s)return NextResponse.json({error:'Forbidden'},{status:403});
 const q=(new URL(req.url).searchParams.get('q')||'').trim();
 const rows=await prisma.sellerProfile.findMany({where:q?{OR:[{shopName:{contains:q,mode:'insensitive'}},{region:{contains:q,mode:'insensitive'}},{user:{name:{contains:q,mode:'insensitive'}}},{user:{email:{contains:q,mode:'insensitive'}}},{user:{phone:{contains:q,mode:'insensitive'}}}]}:{},include:{user:true,verification:true},orderBy:{user:{createdAt:'desc'}},take:200});
 return NextResponse.json(rows.map(r=>({id:r.id,shopName:r.shopName,bio:r.bio,region:r.region,country:r.country,photoUrl:r.photoUrl,verificationStatus:r.verificationStatus,user:{id:r.user.id,name:r.user.name,email:r.user.email,phone:r.user.phone,country:r.user.country},verification:r.verification?{documentType:r.verification.documentType,documentNumber:decryptSensitive(r.verification.documentNumberEncrypted),documentUrl:`/api/admin/verification/document?sellerId=${r.id}`,status:r.verification.status,rejectionReason:r.verification.rejectionReason,submittedAt:r.verification.submittedAt}:null}))));
}

export async function PATCH(req:Request){
 const s=await admin();if(!s)return NextResponse.json({error:'Forbidden'},{status:403});
 try{const b=await req.json();if(typeof b.sellerId!=='string')return NextResponse.json({error:'Seller ID required'},{status:400});const data:any={};for(const k of ['shopName','bio','region','country','photoUrl'])if(typeof b[k]==='string')data[k]=b[k].trim();const r=await prisma.sellerProfile.update({where:{id:b.sellerId},data});await prisma.auditLog.create({data:{adminId:(s.user as any).id,action:'SELLER_PROFILE_EDIT',targetType:'SELLER',targetId:r.id,metadata:{fields:Object.keys(data)}}});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:'Unable to update seller profile'},{status:400})}
}
