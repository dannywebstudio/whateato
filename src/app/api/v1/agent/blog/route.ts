import {NextRequest,NextResponse} from 'next/server';
import {randomUUID} from 'node:crypto';
import {authorizedBlogAgent} from '@/lib/agent-blog-auth';
import {ownerHeaders} from '@/lib/owner-cms-auth';
import {parseBlogDraft,publishableBlog,validBlogSlug} from '@/lib/blog-model';
import {boundedJson} from '@/lib/bulk-content-admin';
import {getPool} from '@/lib/db';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:ownerHeaders});

function publicUrls(slug:string){
  const origin=(process.env.NEXT_PUBLIC_SITE_URL||'https://whateato.com').replace(/\/$/,'');
  const base=origin+'/blog/'+slug;
  return {en:base,ko:base+'?hl=ko',ja:base+'?hl=ja','zh-CN':base+'?hl=zh-CN'};
}

/** Check the actual publication row, rather than assuming a successful request is live. */
export async function GET(req:NextRequest){
  if(!await authorizedBlogAgent(req))return respond({error:'unauthorized'},401);
  const slug=req.nextUrl.searchParams.get('slug');
  if(!validBlogSlug(slug))return respond({error:'invalid_slug'},400);
  const pool=getPool();
  if(!pool)return respond({error:'database_unavailable'},503);
  try{
    const r=await pool.query<{
      id:string;revision:number;published_revision:number|null;
      is_visible:boolean|null;published_at:string|null;
    }>(`
      SELECT p.id::text,d.revision,u.revision AS published_revision,
        u.is_visible,u.published_at::text
      FROM whateato_blog_posts p
      JOIN whateato_blog_drafts d ON d.post_id=p.id
      LEFT JOIN whateato_blog_publications u ON u.post_id=p.id
      WHERE p.slug=$1 LIMIT 1`,[slug]);
    if(!r.rowCount)return respond({error:'not_found'},404);
    const row=r.rows[0];
    return respond({
      slug,id:row.id,revision:row.revision,
      published_revision:row.published_revision,
      published:row.is_visible===true,published_at:row.published_at,
      urls:publicUrls(slug)
    });
  }catch{return respond({error:'blog_status_unavailable'},503)}
}

/**
 * Publish a validated 4-locale blog atomically through the CMS tables.
 * For updates, expected_revision is mandatory (optimistic concurrency).
 * Can also save a draft, leaving the last public snapshot intact.
 */
export async function POST(req:NextRequest){
  const agentOwnerId=await authorizedBlogAgent(req);
  if(!agentOwnerId)return respond({error:'unauthorized'},401);
  const body=await boundedJson(req,180000);
  if(!body.ok)return respond({error:body.error},body.status);
  const raw=body.value;
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||
     Object.keys(raw).some(k=>!['slug','draft','mode','expected_revision'].includes(k)))
    return respond({error:'invalid_request'},400);
  const input=raw as Record<string,unknown>;
  if(!validBlogSlug(input.slug)||!['draft','publish'].includes(String(input.mode)))
    return respond({error:'invalid_slug_or_mode'},400);

  const slug=input.slug;
  const mode=input.mode as 'draft'|'publish';
  if(mode==='publish'&&process.env.WHATEATO_BLOG_AGENT_ALLOW_PUBLISH!=='true')
    return respond({error:'publishing_disabled'},403);
  if(input.expected_revision!==undefined&&
     (!Number.isInteger(input.expected_revision)||Number(input.expected_revision)<1))
    return respond({error:'invalid_expected_revision'},400);

  const draft=parseBlogDraft(input.draft);
  if(!draft)return respond({error:'invalid_article_or_blocks'},400);
  const failure=mode==='publish'?publishableBlog(draft):null;
  if(failure)return respond({error:failure},409);

  const pool=getPool();
  if(!pool)return respond({error:'database_unavailable'},503);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const category=await client.query(`
      SELECT 1 FROM whateato_blog_categories c
      WHERE c.slug=$1 AND c.is_active=true
      AND (c.parent_slug IS NULL OR EXISTS(
        SELECT 1 FROM whateato_blog_categories parent
        WHERE parent.slug=c.parent_slug AND parent.is_active=true))
      LIMIT 1`,[draft.category]);
    if(!category.rowCount){
      await client.query('ROLLBACK');
      return respond({error:'category_inactive_or_missing'},409);
    }
    const match=await client.query<{id:string;revision:number}>(`
      SELECT p.id::text,d.revision FROM whateato_blog_posts p
      JOIN whateato_blog_drafts d ON d.post_id=p.id
      WHERE p.slug=$1 FOR UPDATE OF d`,[slug]);

    let postId:string,revision:number,created=false;
    if(match.rowCount){
      const article=match.rows[0];
      if(input.expected_revision!==article.revision){
        await client.query('ROLLBACK');
        return respond({error:'revision_conflict_reload_first',
          current_revision:article.revision},409);
      }
      postId=article.id;
      const saved=await client.query<{revision:number}>(`
        UPDATE whateato_blog_drafts SET category=$2,tags=$3,
          related_restaurant_ids=$4,translations=$5::jsonb,
          revision=revision+1,review_requested_at=NULL,
          updated_by=$6,updated_at=now()
        WHERE post_id=$1 RETURNING revision`,[
        postId,draft.category,draft.tags,draft.related_restaurant_ids,
        JSON.stringify(draft.translations),agentOwnerId]);
      revision=saved.rows[0].revision;
    }else{
      if(input.expected_revision!==undefined){
        await client.query('ROLLBACK');
        return respond({error:'article_not_found_for_revision'},409);
      }
      created=true;
      postId=randomUUID();
      revision=1;
      await client.query(`
        INSERT INTO whateato_blog_posts (id,slug,created_by) VALUES($1,$2,$3)`,
        [postId,slug,agentOwnerId]);
      await client.query(`
        INSERT INTO whateato_blog_drafts
          (post_id,category,tags,related_restaurant_ids,translations,revision,updated_by)
        VALUES($1,$2,$3,$4,$5::jsonb,$6,$7)`,[
        postId,draft.category,draft.tags,draft.related_restaurant_ids,
        JSON.stringify(draft.translations),revision,agentOwnerId]);
      await client.query(`
        INSERT INTO whateato_blog_audit (post_id,actor_id,action,revision)
        VALUES($1,$2,'created',$3)`,[postId,agentOwnerId,revision]);
    }
    await client.query(`
      INSERT INTO whateato_blog_audit (post_id,actor_id,action,revision)
      VALUES($1,$2,'draft_saved',$3)`,[postId,agentOwnerId,revision]);

    if(mode==='publish'){
      if(draft.related_restaurant_ids.length){
        const valid=await client.query<{n:number}>(`
          SELECT count(DISTINCT id)::int AS n FROM restaurants
          WHERE id=ANY($1::uuid[]) AND business_status='active'
          AND publication_status='published'`,[draft.related_restaurant_ids]);
        if(valid.rows[0].n!==draft.related_restaurant_ids.length){
          await client.query('ROLLBACK');
          return respond({error:'related_restaurant_not_public'},409);
        }
      }
      const refs=new Set<string>();
      for(const t of Object.values(draft.translations)){
        for(const b of t?.blocks||[]){
          if(b.type==='image'&&b.image_id)refs.add(b.image_id);
        }
      }
      if(refs.size){
        const approved=await client.query(`
          SELECT id FROM whateato_blog_media
          WHERE post_id=$1 AND rights_status='approved'
            AND id=ANY($2::uuid[])`,[postId,[...refs]]);
        if(approved.rowCount!==refs.size){
          await client.query('ROLLBACK');
          return respond({error:'image_not_rights_approved'},409);
        }
      }
      const cover=await client.query<{id:string}>(`
        SELECT id::text FROM whateato_blog_media
        WHERE post_id=$1 AND media_role='cover' AND rights_status='approved'
        ORDER BY approved_at DESC NULLS LAST,created_at DESC LIMIT 1`,[postId]);
      const snapshot={...draft,cover_image_id:cover.rows[0]?.id||null};
      await client.query(`
        UPDATE whateato_blog_drafts SET review_requested_at=now() WHERE post_id=$1`,[postId]);
      await client.query(`
        INSERT INTO whateato_blog_audit (post_id,actor_id,action,revision)
        VALUES($1,$2,'review_requested',$3)`,[postId,agentOwnerId,revision]);
      await client.query(`
        INSERT INTO whateato_blog_publications
          (post_id,snapshot,revision,published_by,published_at,is_visible)
        VALUES($1,$2::jsonb,$3,$4,now(),true)
        ON CONFLICT(post_id) DO UPDATE SET snapshot=EXCLUDED.snapshot,
          revision=EXCLUDED.revision,published_by=EXCLUDED.published_by,
          published_at=now(),is_visible=true`,[
        postId,JSON.stringify(snapshot),revision,agentOwnerId]);
      await client.query(`
        UPDATE whateato_blog_drafts SET review_requested_at=NULL WHERE post_id=$1`,[postId]);
      await client.query(`
        INSERT INTO whateato_blog_audit (post_id,actor_id,action,revision)
        VALUES($1,$2,'published',$3)`,[postId,agentOwnerId,revision]);
    }
    await client.query('COMMIT');
    return respond({success:true,created,slug,id:postId,revision,
      published:mode==='publish',urls:publicUrls(slug)},created?201:200);
  }catch(e){
    await client.query('ROLLBACK').catch(()=>{});
    if((e as {code?:string}).code==='23505')
      return respond({error:'slug_already_exists_retry_status'},409);
    return respond({error:'agent_blog_save_unavailable'},503);
  }finally{client.release()}
}
