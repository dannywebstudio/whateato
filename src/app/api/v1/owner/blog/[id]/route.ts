import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {parseBlogDraft} from '@/lib/blog-model';
import {boundedJson} from '@/lib/bulk-content-admin';
import {isUuid} from '@/lib/platform-v1';
import {getPool} from '@/lib/db';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const respond=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:ownerHeaders});
export async function GET(_req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();if(!staff||!hasPermission(staff,'edit'))return respond({error:'forbidden'},403);
 const {id}=await params;if(!isUuid(id))return respond({error:'invalid_id'},400);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 try{
  const rows=await pool.query(`
   SELECT p.id::text,p.slug,d.category,d.tags,d.related_restaurant_ids,
      d.translations,d.revision,d.review_requested_at::text,d.updated_at::text,
      u.revision AS published_revision,u.published_at::text,u.is_visible,
      coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id',m.id::text,'media_role',m.media_role,'alt_text',m.alt_text,
        'rights_status',m.rights_status,'source_url',m.source_url,
        'rights_reference',m.rights_reference,
        'image_url','/api/v1/owner/blog/images/'||m.id::text,
        'width',m.width,'height',m.height) ORDER BY m.created_at DESC)
        FROM whateato_blog_media m WHERE m.post_id=p.id),'[]'::jsonb) AS images
   FROM whateato_blog_posts p JOIN whateato_blog_drafts d ON d.post_id=p.id
   LEFT JOIN whateato_blog_publications u ON u.post_id=p.id
   WHERE p.id=$1`,[id]);
  if(!rows.rowCount)return respond({error:'not_found'},404);
  return respond({article:rows.rows[0]});
 }catch{return respond({error:'blog_detail_unavailable'},503)}
}
export async function PUT(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();if(!staff||!hasPermission(staff,'edit'))
  return respond({error:'forbidden'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id}=await params;if(!isUuid(id))return respond({error:'invalid_id'},400);
 const parsed=await boundedJson(req,180000);
 if(!parsed.ok)return respond({error:parsed.error},parsed.status);
 const obj=parsed.value;
 if(!obj||typeof obj!=='object'||Array.isArray(obj)||
   Object.keys(obj).some(k=>!['expected_revision','draft'].includes(k)))
   return respond({error:'invalid_draft'},400);
 const p=obj as Record<string,unknown>;
 if(!Number.isInteger(p.expected_revision)||Number(p.expected_revision)<1)
  return respond({error:'invalid_revision'},400);
 const draft=parseBlogDraft(p.draft);
 if(!draft)return respond({error:'invalid_article_or_blocks'},400);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const validCategory=await client.query(`
    SELECT 1 FROM whateato_blog_categories c
    WHERE c.slug=$1 AND c.is_active=true
      AND (c.parent_slug IS NULL OR EXISTS(
        SELECT 1 FROM whateato_blog_categories parent
        WHERE parent.slug=c.parent_slug AND parent.is_active=true))
    LIMIT 1`,[draft.category]);
  if(!validCategory.rowCount){
    await client.query('ROLLBACK');return respond({error:'category_inactive_or_missing'},409);
  }
  const result=await client.query<{revision:number}>(`
    UPDATE whateato_blog_drafts SET
      category=$2,tags=$3,related_restaurant_ids=$4,translations=$5::jsonb,
      revision=revision+1,review_requested_at=NULL,
      updated_by=$6,updated_at=now()
    WHERE post_id=$1 AND revision=$7 RETURNING revision`,[
    id,draft.category,draft.tags,draft.related_restaurant_ids,
    JSON.stringify(draft.translations),staff.accountId,p.expected_revision]);
  if(!result.rowCount){
   await client.query('ROLLBACK');
   return respond({error:'draft_revision_conflict_reload_first'},409);
  }
  await client.query(`
    INSERT INTO whateato_blog_audit(post_id,actor_id,action,revision)
    VALUES($1,$2,'draft_saved',$3)`,[id,staff.accountId,result.rows[0].revision]);
  await client.query('COMMIT');
  return respond({saved:true,revision:result.rows[0].revision});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:'blog_save_unavailable'},503)
 }finally{client.release()}
}

/** Owner-confirmed permanent removal of blog posts, including publications and private media. */
export async function DELETE(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'publish'))return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id}=await params;if(!isUuid(id))return respond({error:'invalid_id'},400);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const row=await client.query(`SELECT p.id,u.revision AS published_revision
   FROM whateato_blog_posts p LEFT JOIN whateato_blog_publications u ON u.post_id=p.id
   WHERE p.id=$1 FOR UPDATE OF p`,[id]);
  if(!row.rowCount){await client.query('ROLLBACK');return respond({error:'post_not_found'},404)}
  if(row.rows[0].published_revision!==null){
   const confirmation=req.headers.get('x-whateato-confirm-delete');
   if(confirmation!==id){await client.query('ROLLBACK');return respond({error:'published_post_delete_confirmation_required'},409)}
  }
  const media=await client.query<{storage_key:string}>(`SELECT storage_key FROM whateato_blog_media WHERE post_id=$1`,[id]);
  await client.query('DELETE FROM whateato_blog_media WHERE post_id=$1',[id]);
  await client.query('DELETE FROM whateato_blog_audit WHERE post_id=$1',[id]);
  await client.query('DELETE FROM whateato_blog_publications WHERE post_id=$1',[id]);
  await client.query('DELETE FROM whateato_blog_drafts WHERE post_id=$1',[id]);
  await client.query('DELETE FROM whateato_blog_posts WHERE id=$1',[id]);
  await client.query('COMMIT');
  // Storage deletion is best effort after the committed database removal.
  const {deletePhoto}=await import('@/lib/cms-object-storage');
  await Promise.all(media.rows.map(m=>deletePhoto(m.storage_key).catch(()=>{})));
  return respond({deleted:true});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:'blog_delete_unavailable'},503);
 }finally{client.release()}
}
