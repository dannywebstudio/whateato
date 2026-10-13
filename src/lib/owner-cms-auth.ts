import {auth,authReady} from '@/auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import type {NextRequest} from 'next/server';

export type StaffRole='owner'|'editor'|'moderator';
export type Staff={accountId:string;role:StaffRole};
export async function currentStaff():Promise<Staff|null>{
  if(process.env.WHATEATO_OWNER_CMS_ENABLED!=='true'||!authReady())return null;
  const session=await auth();
  const id=session?.user?.id;
  if(!isUuid(id))return null;
  const pool=getPool();
  if(!pool)return null;
  try{
    const result=await pool.query<{role:StaffRole}>(`
      SELECT role FROM whateato_admin_accounts WHERE account_id=$1 AND enabled=true
      AND role IN ('owner','editor','moderator') LIMIT 1`,[id]);
    return result.rows[0]?{accountId:id,role:result.rows[0].role}:null;
  }catch{return null}
}
export function hasPermission(staff:Staff,capability:'edit'|'publish'|'moderate'){
  if(capability==='publish')return staff.role==='owner';
  if(capability==='edit')return staff.role==='owner'||staff.role==='editor';
  return staff.role==='owner'||staff.role==='moderator';
}
export function safeSameOrigin(req:NextRequest){
  const origin=req.headers.get('origin');
  // A browser Origin must agree with a trusted, server-configured deployment URL.
  // Do not use request Host/Forwarded headers as the CSRF trust anchor; proxies
  // can rewrite them (and can differ from NextRequest.nextUrl.origin).
  const configured=process.env.WHATEATO_OWNER_CANONICAL_ORIGIN
    ||process.env.NEXT_PUBLIC_SITE_URL||process.env.AUTH_URL||'';
  if(!origin||!configured)return false;
  try{
    const expected=new URL(configured);
    if(expected.protocol!=='https:'&&
      !(expected.protocol==='http:'&&['localhost','127.0.0.1'].includes(expected.hostname)))return false;
    return new URL(origin).origin===expected.origin;
  }catch{return false}
}
export const ownerHeaders={
  'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'
} as const;
