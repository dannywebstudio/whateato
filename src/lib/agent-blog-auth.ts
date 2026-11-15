import {createHash,timingSafeEqual} from 'node:crypto';
import type {NextRequest} from 'next/server';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';

/**
 * Server-to-server blog publisher only. Never accepts a browser session cookie,
 * Origin header, password in a URL, or unconfigured credentials.
 *
 * Create a random 32-byte token and store it exclusively in server secrets.
 */
export async function authorizedBlogAgent(req:NextRequest):Promise<string|null>{
  const expected=process.env.WHATEATO_BLOG_AGENT_TOKEN;
  const ownerId=process.env.WHATEATO_BLOG_AGENT_ACCOUNT_ID;
  const auth=req.headers.get('authorization')||'';
  const match=/^Bearer ([A-Za-z0-9_-]{40,200})$/.exec(auth);
  if(!expected||expected.length<40||!ownerId||!isUuid(ownerId)||
     !match||req.headers.has('origin'))return null;

  const digest=(text:string)=>createHash('sha256').update(text).digest();
  if(!timingSafeEqual(digest(expected),digest(match[1])))return null;

  const pool=getPool();
  if(!pool)return null;
  try{
    const result=await pool.query(`
      SELECT 1 FROM whateato_admin_accounts
      WHERE account_id=$1 AND role='owner' AND enabled=true LIMIT 1`,[ownerId]);
    return result.rowCount?ownerId:null;
  }catch{return null}
}
