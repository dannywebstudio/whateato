import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {blogCategorySlug} from '@/lib/blog-model';
import {validateBlogCategoryNames} from '@/lib/blog-categories';
import {boundedJson} from '@/lib/bulk-content-admin';
import {getPool} from '@/lib/db';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Context={params:Promise<{slug:string}>};
const respond=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:ownerHeaders});
export async function PATCH(req:NextRequest,{params}:Context){
 const staff=await currentStaff();if(!staff||staff.role!=='owner')return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {slug}=await params;if(!blogCategorySlug(slug))return respond({error:'invalid_slug'},400);
 const p=await boundedJson(req,2048);
 if(!p.ok)return respond({error:p.error},p.status);
 if(!p.value||typeof p.value!=='object'||Array.isArray(p.value))return respond({error:'invalid_change'},400);
 const data=p.value as Record<string,unknown>;
 if(Object.keys(data).some(k=>!['names','position','is_active','parent_slug'].includes(k))||
   !Object.keys(data).length)return respond({error:'invalid_change'},400);
 const names=data.names===undefined?undefined:validateBlogCategoryNames(data.names);
 if(data.names!==undefined&&!names)return respond({error:'invalid_names'},400);
 if(data.position!==undefined&&(!Number.isInteger(data.position)||Number(data.position)<0||Number(data.position)>10000))
   return respond({error:'invalid_position'},400);
 if(data.is_active!==undefined&&typeof data.is_active!=='boolean')return respond({error:'invalid_status'},400);
 if(data.parent_slug!==undefined&&!(data.parent_slug===null||blogCategorySlug(data.parent_slug)))
  return respond({error:'invalid_parent'},400);
 if(data.parent_slug===slug)return respond({error:'cyclic_parent'},409);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(95431001)');
  const old=await client.query<{parent_slug:string|null;is_active:boolean}>(`
    SELECT parent_slug,is_active FROM whateato_blog_categories WHERE slug=$1 FOR UPDATE`,[slug]);
  if(!old.rowCount){await client.query('ROLLBACK');return respond({error:'not_found'},404)}
  const targetParent=data.parent_slug===undefined?old.rows[0].parent_slug:data.parent_slug;
  const targetStatus=data.is_active===undefined?old.rows[0].is_active:data.is_active;
  if(targetParent!==null){
   const parent=await client.query<{parent_slug:string|null;is_active:boolean}>(`
     SELECT parent_slug,is_active FROM whateato_blog_categories WHERE slug=$1 FOR UPDATE`,[targetParent]);
   if(!parent.rowCount||parent.rows[0].parent_slug!==null||
     (targetStatus&&!parent.rows[0].is_active)){
    await client.query('ROLLBACK');return respond({error:'parent_must_be_active_root'},409);
   }
   const children=await client.query('SELECT 1 FROM whateato_blog_categories WHERE parent_slug=$1 LIMIT 1',[slug]);
   if(children.rowCount){
    await client.query('ROLLBACK');return respond({error:'category_with_children_cannot_be_nested'},409);
   }
  }
  if(!targetStatus){
   const activeChild=await client.query(`
     SELECT 1 FROM whateato_blog_categories WHERE parent_slug=$1 AND is_active LIMIT 1`,[slug]);
   if(activeChild.rowCount){
    await client.query('ROLLBACK');return respond({error:'deactivate_children_first'},409);
   }
  }
  // Existing published snapshots keep their immutable category slug; no hard deletes.
  await client.query(`
    UPDATE whateato_blog_categories SET
      names=COALESCE($2::jsonb,names),
      position=COALESCE($3::integer,position),
      is_active=COALESCE($4::boolean,is_active),
      parent_slug=$5::text,updated_at=now()
    WHERE slug=$1`,[
    slug,names?JSON.stringify(names):null,
    data.position===undefined?null:data.position,
    data.is_active===undefined?null:data.is_active,targetParent]);
  await client.query('COMMIT');
  return respond({updated:true,slug});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:'category_update_unavailable'},503);
 }finally{client.release()}
}
