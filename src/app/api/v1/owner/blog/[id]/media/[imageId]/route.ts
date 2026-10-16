import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {photoExists} from '@/lib/cms-object-storage';
import {boundedJson} from '@/lib/bulk-content-admin';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string;imageId:string}>};
const respond=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:ownerHeaders});
export async function PATCH(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();if(!staff||!hasPermission(staff,'publish'))
  return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id,imageId}=await params;
 if(!isUuid(id)||!isUuid(imageId))return respond({error:'invalid_id'},400);
 const body=await boundedJson(req,1024);
 if(!body.ok)return respond({error:body.error},body.status);
 if(!body.value||typeof body.value!=='object'||Array.isArray(body.value)||
   Object.keys(body.value).some(k=>k!=='decision'))
   return respond({error:'invalid_decision'},400);
 const action=(body.value as {decision?:unknown}).decision;
 if(!['approve','reject','hide'].includes(String(action)))
   return respond({error:'invalid_decision'},400);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const current=await client.query<{storage_key:string;rights_status:string}>(`
    SELECT storage_key,rights_status FROM whateato_blog_media
    WHERE id=$1 AND post_id=$2 FOR UPDATE`,[imageId,id]);
  if(!current.rowCount){await client.query('ROLLBACK');return respond({error:'image_not_found'},404)}
  if(action==='approve'&&current.rows[0].rights_status!=='pending'){
    await client.query('ROLLBACK');return respond({error:'image_not_pending'},409);
  }
  if(action==='approve')await photoExists(current.rows[0].storage_key);
  const status=action==='approve'?'approved':'rejected';
  await client.query(`
    UPDATE whateato_blog_media SET rights_status=$2,
      approved_at=CASE WHEN $2='approved' THEN now() ELSE NULL END,
      approved_by=CASE WHEN $2='approved' THEN $3::uuid ELSE NULL END
    WHERE id=$1`,[imageId,status,staff.accountId]);
  await client.query(`
    INSERT INTO whateato_blog_audit(post_id,actor_id,action)
    VALUES($1,$2,$3)`,[id,staff.accountId,
    action==='approve'?'image_approved':'image_rejected']);
  await client.query('COMMIT');
  return respond({id:imageId,status});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:'image_approval_unavailable'},503)
 }finally{client.release()}
}

/** Delete only unused images. Never break drafts or already published articles. */
export async function DELETE(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'publish'))return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id,imageId}=await params;
 if(!isUuid(id)||!isUuid(imageId))return respond({error:'invalid_id'},400);
 if(req.headers.get('x-whateato-confirm-delete')!==imageId)
  return respond({error:'image_delete_confirmation_required'},409);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();
 let key:string|null=null;
 try{
  await client.query('BEGIN');
  const found=await client.query<{storage_key:string}>(`
   SELECT storage_key FROM whateato_blog_media WHERE id=$1 AND post_id=$2 FOR UPDATE`,[imageId,id]);
  if(!found.rowCount){await client.query('ROLLBACK');return respond({error:'image_not_found'},404)}
  const used=await client.query(`
   SELECT EXISTS(
    SELECT 1 FROM whateato_blog_drafts WHERE post_id=$1 AND translations::text LIKE $2
    UNION ALL
    SELECT 1 FROM whateato_blog_publications WHERE post_id=$1 AND snapshot::text LIKE $2
   ) AS referenced`,[id,'%'+imageId+'%']);
  if(used.rows[0]?.referenced){
   await client.query('ROLLBACK');
   return respond({error:'image_used_in_article_remove_from_body_first'},409);
  }
  await client.query('DELETE FROM whateato_blog_media WHERE id=$1 AND post_id=$2',[imageId,id]);
  await client.query('COMMIT');
  key=found.rows[0].storage_key;
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:'image_delete_unavailable'},503);
 }finally{client.release()}
 if(key){
  const {deletePhoto}=await import('@/lib/cms-object-storage');
  await deletePhoto(key).catch(()=>{});
 }
 return respond({deleted:true});
}
