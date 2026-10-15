import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {validBlogSlug} from '@/lib/blog-model';
import {boundedJson} from '@/lib/bulk-content-admin';
import {getPool} from '@/lib/db';
export const runtime='nodejs';export const dynamic='force-dynamic';
const respond=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:ownerHeaders});
export async function GET(req:NextRequest){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'edit'))return respond({error:'forbidden'},403);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const q=(req.nextUrl.searchParams.get('q')||'').slice(0,80).trim();
 try{
  const r=await pool.query(`
    SELECT p.id::text,p.slug,d.revision,d.category,
      coalesce(d.translations->'en'->>'title','') AS title,
      CASE WHEN u.is_visible=true THEN 'published'
        WHEN d.review_requested_at IS NOT NULL THEN 'review_requested' ELSE 'draft' END AS state,
      d.updated_at::text,u.published_at::text
    FROM whateato_blog_posts p
    JOIN whateato_blog_drafts d ON d.post_id=p.id
    LEFT JOIN whateato_blog_publications u ON u.post_id=p.id
    WHERE $1='' OR p.slug ILIKE '%'||$1||'%' OR d.translations->'en'->>'title' ILIKE '%'||$1||'%'
    ORDER BY d.updated_at DESC,p.id DESC LIMIT 60`,[q.replace(/[\\%_]/g,'\\$&')]);
  return respond({items:r.rows});
 }catch{return respond({error:'blog_listing_unavailable'},503)}
}
export async function POST(req:NextRequest){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'edit'))return respond({error:'forbidden'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const parsed=await boundedJson(req,1024);
 if(!parsed.ok)return respond({error:parsed.error},parsed.status);
 const p=parsed.value;
 if(!p||typeof p!=='object'||Array.isArray(p)||
   Object.keys(p).some(k=>k!=='slug')||!validBlogSlug((p as Record<string,unknown>).slug))
   return respond({error:'invalid_blog_slug'},400);
 const slug=(p as {slug:string}).slug;
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const id=randomUUID();
  await client.query('INSERT INTO whateato_blog_posts(id,slug,created_by) VALUES($1,$2,$3)',
   [id,slug,staff.accountId]);
  await client.query('INSERT INTO whateato_blog_drafts(post_id,updated_by) VALUES($1,$2)',
   [id,staff.accountId]);
  await client.query(`
   INSERT INTO whateato_blog_audit(post_id,actor_id,action,revision)
   VALUES($1,$2,'created',1)`,[id,staff.accountId]);
  await client.query('COMMIT');
  return respond({id,slug,revision:1},201);
 }catch(e){
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:e instanceof Error&&'code'in e&&e.code==='23505'?
   'slug_already_exists':'blog_create_unavailable'},e instanceof Error&&'code'in e&&e.code==='23505'?409:503);
 }finally{client.release()}
}
