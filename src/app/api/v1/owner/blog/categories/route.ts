import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getBlogCategories,validateBlogCategoryNames} from '@/lib/blog-categories';
import {blogCategorySlug} from '@/lib/blog-model';
import {boundedJson} from '@/lib/bulk-content-admin';
import {getPool} from '@/lib/db';
export const runtime='nodejs';export const dynamic='force-dynamic';
const respond=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:ownerHeaders});
export async function GET(){
 const staff=await currentStaff();
 if(!staff||staff.role==='moderator')return respond({error:'editor_required'},403);
 try{return respond({items:await getBlogCategories(true)})}
 catch{return respond({error:'blog_categories_unavailable'},503)}
}
export async function POST(req:NextRequest){
 const staff=await currentStaff();if(!staff||staff.role!=='owner')return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const body=await boundedJson(req,2048);
 if(!body.ok)return respond({error:body.error},body.status);
 if(!body.value||typeof body.value!=='object'||Array.isArray(body.value))return respond({error:'invalid_category'},400);
 const input=body.value as Record<string,unknown>;
 if(Object.keys(input).some(k=>!['slug','parent_slug','names','position'].includes(k))||
   !blogCategorySlug(input.slug)||!(
     input.parent_slug===null||blogCategorySlug(input.parent_slug)
   )||!Number.isInteger(input.position)||Number(input.position)<0||Number(input.position)>10000)
   return respond({error:'invalid_category'},400);
 const names=validateBlogCategoryNames(input.names);
 if(!names||input.parent_slug===input.slug)return respond({error:'invalid_category_names_or_parent'},400);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  // Serialization avoids two roots racing past the same bounded taxonomy limit.
  await client.query('SELECT pg_advisory_xact_lock(95431001)');
  const count=await client.query<{n:number}>('SELECT count(*)::int AS n FROM whateato_blog_categories');
  if(count.rows[0].n>=200){await client.query('ROLLBACK');return respond({error:'max_200_categories'},409)}
  if(input.parent_slug!==null){
   const parent=await client.query<{parent_slug:string|null;is_active:boolean}>(`
     SELECT parent_slug,is_active FROM whateato_blog_categories
     WHERE slug=$1 FOR UPDATE`,[input.parent_slug]);
   if(!parent.rowCount||parent.rows[0].parent_slug!==null||!parent.rows[0].is_active){
    await client.query('ROLLBACK');return respond({error:'parent_must_be_active_root'},409);
   }
  }
  await client.query(`INSERT INTO whateato_blog_categories
    (slug,parent_slug,names,position) VALUES($1,$2,$3::jsonb,$4)`,[
    input.slug,input.parent_slug,JSON.stringify(names),input.position]);
  await client.query('COMMIT');
  return respond({created:true,slug:input.slug},201);
 }catch(e){
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:e instanceof Error&&'code'in e&&e.code==='23505'?
    'category_slug_exists':'category_create_unavailable'},e instanceof Error&&'code'in e&&e.code==='23505'?409:503);
 }finally{client.release()}
}
