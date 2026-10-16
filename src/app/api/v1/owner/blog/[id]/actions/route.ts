import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {parseBlogDraft,publishableBlog,type BlogDraft} from '@/lib/blog-model';
import {isUuid} from '@/lib/platform-v1';
import {boundedJson} from '@/lib/bulk-content-admin';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const respond=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:ownerHeaders});
export async function POST(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();if(!staff||!hasPermission(staff,'edit'))
  return respond({error:'forbidden'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id}=await params;if(!isUuid(id))return respond({error:'invalid_id'},400);
 const parsed=await boundedJson(req,1024);
 if(!parsed.ok)return respond({error:parsed.error},parsed.status);
 const raw=parsed.value;
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||
   Object.keys(raw).some(k=>!['action','expected_revision'].includes(k)))
   return respond({error:'invalid_action'},400);
 const p=raw as {action?:unknown;expected_revision?:unknown};
 if(!['submit','publish','unpublish'].includes(String(p.action))||
   !Number.isInteger(p.expected_revision)||Number(p.expected_revision)<1)
   return respond({error:'invalid_action_or_revision'},400);
 const action=p.action as 'submit'|'publish'|'unpublish';
 if(action!=='submit'&&!hasPermission(staff,'publish'))return respond({error:'owner_required'},403);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const rs=await client.query<{revision:number;review_requested_at:string|null;
   category:string;tags:string[];related_restaurant_ids:string[];translations:unknown}>(`
    SELECT revision,review_requested_at::text,category,tags,
       related_restaurant_ids,translations
    FROM whateato_blog_drafts WHERE post_id=$1 FOR UPDATE`,[id]);
  if(!rs.rowCount){await client.query('ROLLBACK');return respond({error:'not_found'},404)}
  const data=rs.rows[0];
  if(data.revision!==p.expected_revision){
   await client.query('ROLLBACK');return respond({error:'draft_revision_conflict_reload_first'},409);
  }
  if(action!=='unpublish'){
    const cat=await client.query(`
      SELECT 1 FROM whateato_blog_categories c
      WHERE c.slug=$1 AND c.is_active=true
        AND (c.parent_slug IS NULL OR EXISTS(
         SELECT 1 FROM whateato_blog_categories root
         WHERE root.slug=c.parent_slug AND root.is_active=true)) LIMIT 1`,[data.category]);
    if(!cat.rowCount){await client.query('ROLLBACK');return respond({error:'category_inactive_or_missing'},409)}
  }
  if(action==='submit'){
    const draft=parseBlogDraft({
      category:data.category,tags:data.tags,related_restaurant_ids:data.related_restaurant_ids,
      translations:data.translations
    });
    const fail=draft&&publishableBlog(draft);
    if(!draft||fail){await client.query('ROLLBACK');return respond({error:fail||'invalid_draft'},409)}
    await client.query('UPDATE whateato_blog_drafts SET review_requested_at=now() WHERE post_id=$1',[id]);
    await client.query(`
      INSERT INTO whateato_blog_audit(post_id,actor_id,action,revision)
      VALUES($1,$2,'review_requested',$3)`,[id,staff.accountId,data.revision]);
  }else if(action==='publish'){
    if(!data.review_requested_at){
      await client.query('ROLLBACK');return respond({error:'request_review_before_publishing'},409);
    }
    const draft=parseBlogDraft({
      category:data.category,tags:data.tags,related_restaurant_ids:data.related_restaurant_ids,
      translations:data.translations
    });
    const fail=draft&&publishableBlog(draft);
    if(!draft||fail){await client.query('ROLLBACK');return respond({error:fail||'invalid_draft'},409)}
    // Every restaurant included in the published snapshot must be a live
    // validated directory row, never an arbitrary UUID.
    if(draft.related_restaurant_ids.length){
      const valid=await client.query<{n:number}>(`
        SELECT count(DISTINCT id)::int AS n FROM restaurants
        WHERE id=ANY($1::uuid[]) AND business_status='active'
        AND publication_status='published'`,[draft.related_restaurant_ids]);
      if(valid.rows[0].n!==draft.related_restaurant_ids.length){
        await client.query('ROLLBACK');return respond({error:'related_restaurant_not_public'},409);
      }
    }
    const refs=new Set<string>();
    for(const trans of Object.values(draft.translations)){
      for(const block of trans?.blocks||[]){
        if(block.type==='image'&&block.image_id)refs.add(block.image_id);
      }
    }
    if(refs.size){
      const approved=await client.query<{id:string}>(`
        SELECT id::text FROM whateato_blog_media
        WHERE post_id=$1 AND rights_status='approved' AND id=ANY($2::uuid[])`,[id,[...refs]]);
      if(approved.rowCount!==refs.size){
        await client.query('ROLLBACK');return respond({error:'image_not_rights_approved'},409);
      }
    }
    // The first image in the article becomes its card cover, regardless of upload role.
    const firstImage=(['en','ko','ja','zh-CN'] as const)
      .flatMap(locale=>draft.translations[locale]?.blocks||[])
      .find(block=>block.type==='image'&&block.image_id)?.image_id||null;
    const cover=await client.query<{id:string}>(`
      SELECT id::text FROM whateato_blog_media
      WHERE post_id=$1 AND rights_status='approved'
      AND ($2::uuid IS NULL OR id=$2::uuid)
      ORDER BY created_at ASC LIMIT 1`,[id,firstImage]);
    const snapshot={...draft,cover_image_id:cover.rows[0]?.id||null};
    await client.query(`
      INSERT INTO whateato_blog_publications
        (post_id,snapshot,revision,published_by,published_at,is_visible)
      VALUES($1,$2::jsonb,$3,$4,now(),true)
      ON CONFLICT(post_id) DO UPDATE SET snapshot=EXCLUDED.snapshot,revision=EXCLUDED.revision,
        published_by=EXCLUDED.published_by,published_at=now(),is_visible=true`,
      [id,JSON.stringify(snapshot),data.revision,staff.accountId]);
    await client.query('UPDATE whateato_blog_drafts SET review_requested_at=NULL WHERE post_id=$1',[id]);
    await client.query(`
      INSERT INTO whateato_blog_audit(post_id,actor_id,action,revision)
      VALUES($1,$2,'published',$3)`,[id,staff.accountId,data.revision]);
  }else{
    const visible=await client.query(`
      UPDATE whateato_blog_publications SET is_visible=false
      WHERE post_id=$1 AND is_visible=true RETURNING post_id`,[id]);
    if(!visible.rowCount){await client.query('ROLLBACK');return respond({error:'post_not_published'},409)}
    await client.query(`
      INSERT INTO whateato_blog_audit(post_id,actor_id,action,revision)
      VALUES($1,$2,'unpublished',$3)`,[id,staff.accountId,data.revision]);
  }
  await client.query('COMMIT');
  return respond({success:true,action,revision:data.revision});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:'blog_action_unavailable'},503)
 }finally{client.release()}
}
