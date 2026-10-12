import {timingSafeEqual} from 'node:crypto';
import type {NextRequest} from 'next/server';
import {getPool} from '@/lib/db';

export const noStoreAdmin={
  'Cache-Control':'no-store, private',
  'Vary':'Authorization',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer'
} as const;

export type AdminAccess={ok:true}|{ok:false;status:401|503;error:string};
export function reviewAdminAccess(request:NextRequest):AdminAccess{
  const secret=process.env.WHATEATO_REVIEW_ADMIN_TOKEN||'';
  if(process.env.WHATEATO_REVIEW_MODERATION_ENABLED!=='true'||secret.length<32){
    return {ok:false,status:503,error:'moderation_not_configured'};
  }
  // Admin API is for HTTPS server-side tooling (curl/approved proxy), not
  // browser credential sharing. Cross-site browser requests are denied.
  const origin=request.headers.get('origin');
  if(origin){
    let valid=false;
    try{valid=new URL(origin).origin===request.nextUrl.origin}catch{}
    if(!valid)return {ok:false,status:401,error:'unauthorized'};
  }
  const value=request.headers.get('authorization')||'';
  if(!value.startsWith('Bearer '))return {ok:false,status:401,error:'unauthorized'};
  const supplied=Buffer.from(value.slice(7),'utf8');
  const expected=Buffer.from(secret,'utf8');
  if(supplied.length!==expected.length||!timingSafeEqual(supplied,expected))
    return {ok:false,status:401,error:'unauthorized'};
  return {ok:true};
}
export function reviewAdminPool(){return getPool();}
export const REVIEW_REJECTION_CODES=new Set([
  'spam','abusive','personal_data','off_topic','unverifiable_claim','other'
]);
