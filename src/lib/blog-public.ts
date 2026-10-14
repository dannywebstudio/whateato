import {getPool} from '@/lib/db';
import {validBlogSlug,parseBlogDraft,type BlogDraft,type BlogLocale,BLOG_LOCALES} from '@/lib/blog-model';
import {isUuid} from '@/lib/platform-v1';

export type BlogPostPublic={
 id:string;slug:string;draft:BlogDraft;cover_image_id:string|null;
 published_at:string;title:string;excerpt:string;locale:BlogLocale;
};
export function blogLocale(raw:unknown):BlogLocale{
 return BLOG_LOCALES.includes(raw as BlogLocale)?raw as BlogLocale:'en';
}
function translationOf(draft:BlogDraft,requested:BlogLocale){
 return {locale:draft.translations[requested]?requested:'en',
  content:draft.translations[requested]||draft.translations.en};
}
export async function listPublishedBlog(input:{q?:string;locale?:string;category?:string;page?:number}){
 const q=(input.q||'').trim().slice(0,90);
 const category=(input.category||'').trim().slice(0,40);
 const page=Math.min(100,Math.max(1,Math.trunc(input.page||1)));
 const locale=blogLocale(input.locale);
 const pool=getPool();if(!pool)return {items:[],more:false,locale,page};
 const rows=await pool.query<{id:string;slug:string;snapshot:BlogDraft&{cover_image_id?:string};
  published_at:string}>(`
  SELECT p.id::text,p.slug,u.snapshot,u.published_at::text
  FROM whateato_blog_publications u
  JOIN whateato_blog_posts p ON p.id=u.post_id
  WHERE u.is_visible=true
   AND ($1='' OR u.snapshot::text ILIKE '%'||$1||'%' ESCAPE '\\')
   AND ($2='' OR u.snapshot->>'category'=$2)
  ORDER BY u.published_at DESC,p.id DESC
  LIMIT 13 OFFSET $3`,[q.replace(/[\\%_]/g,'\\$&'),category,(page-1)*12]);
 const items=rows.rows.slice(0,12).map(r=>{
  const selected=translationOf(r.snapshot,locale);
  return {id:r.id,slug:r.slug,category:r.snapshot.category,
   title:selected.content?.title||'',excerpt:selected.content?.excerpt||'',
   locale:selected.locale,cover_image_id:r.snapshot.cover_image_id||null,
   published_at:r.published_at,tags:r.snapshot.tags||[]};
 });
 return {items,more:rows.rows.length>12,locale,page};
}
export async function findPublishedBlog(slug:string,language:unknown):Promise<BlogPostPublic|null>{
 if(!validBlogSlug(slug))return null;
 const pool=getPool();if(!pool)return null;
 const result=await pool.query<{id:string;slug:string;snapshot:BlogDraft&{cover_image_id?:string};published_at:string}>(`
 SELECT p.id::text,p.slug,u.snapshot,u.published_at::text
 FROM whateato_blog_posts p JOIN whateato_blog_publications u ON u.post_id=p.id
 WHERE p.slug=$1 AND u.is_visible=true LIMIT 1`,[slug]);
 if(!result.rows.length)return null;
 const r=result.rows[0],chosen=translationOf(r.snapshot,blogLocale(language));
 if(!chosen.content||!chosen.content.title)return null;
 return {id:r.id,slug:r.slug,draft:r.snapshot,
  cover_image_id:r.snapshot.cover_image_id||null,
  published_at:r.published_at,locale:chosen.locale,
  title:chosen.content.title,excerpt:chosen.content.excerpt};
}
export async function relatedBlogRestaurants(draft:BlogDraft,locale:BlogLocale){
 const ids=draft.related_restaurant_ids||[];
 if(!ids.length||ids.length>8||!ids.every(isUuid))return [];
 const pool=getPool();if(!pool)return [];
 const r=await pool.query<{id:string;name:string;road_address_ko:string|null}>(`
  SELECT r.id::text,coalesce(l.display_name,en.display_name,r.name_ko) AS name,
    r.road_address_ko
  FROM restaurants r
  LEFT JOIN restaurant_localizations l ON l.restaurant_id=r.id AND l.locale=$2
    AND l.publication_state='published'
  LEFT JOIN restaurant_localizations en ON en.restaurant_id=r.id AND en.locale='en'
    AND en.publication_state='published'
  WHERE r.id=ANY($1::uuid[]) AND r.business_status='active'
    AND r.publication_status='published'`,[ids,locale]);
 return ids.map(id=>r.rows.find(p=>p.id===id)).filter((v):v is typeof r.rows[number]=>!!v);
}
export function blogReadiness(draft:BlogDraft,postId:string){
 if(!isUuid(postId)||!parseBlogDraft(draft))return false;
 return true;
}
