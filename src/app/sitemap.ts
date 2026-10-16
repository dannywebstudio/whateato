import type {MetadataRoute} from 'next';
import {getPool} from '@/lib/db';
import {getRestaurantCatalogDetail} from '@/lib/restaurant-catalog';
import {approvedSeoRestaurantIds,seoPublicEnabled,SEO_CANONICAL_ORIGIN} from '@/lib/public-seo';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Live sitemap: homepage, only manually approved/eligible restaurants, and
// only actual owner-published visible blog articles. No redeploy needed.
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if(!seoPublicEnabled())return [];
 const pages:MetadataRoute.Sitemap=[
  {url:SEO_CANONICAL_ORIGIN+'/',changeFrequency:'weekly',priority:1}
 ];
 const ids=await approvedSeoRestaurantIds();
 for(const id of ids){
  try{
   const detail=await getRestaurantCatalogDetail(id,'ko');
   if(!detail?.restaurant.short_description?.trim() ||
      detail.restaurant.short_description.trim().length<35)continue;
   pages.push({url:SEO_CANONICAL_ORIGIN+'/restaurant/'+id,
     changeFrequency:'monthly',priority:0.6});
  }catch{
   // Cannot index an unavailable or quality-held restaurant.
  }
 }
 const pool=getPool();if(!pool)return pages;
 try{
  const blog=await pool.query<{slug:string;published_at:Date;has_japanese:boolean}>(`
   SELECT p.slug,u.published_at, NULLIF(BTRIM(u.snapshot->'translations'->'ja'->>'title'),'') IS NOT NULL AS has_japanese FROM whateato_blog_publications u
   JOIN whateato_blog_posts p ON p.id=u.post_id
   WHERE u.is_visible=true
     AND NULLIF(BTRIM(u.snapshot->'translations'->'en'->>'title'),'') IS NOT NULL
   ORDER BY u.published_at DESC LIMIT 2000`);
  if(blog.rows.length)pages.push({
   url:SEO_CANONICAL_ORIGIN+'/blog',changeFrequency:'weekly',priority:0.8
  });
  for(const item of blog.rows){
   pages.push({url:SEO_CANONICAL_ORIGIN+'/blog/'+item.slug,
     lastModified:item.published_at,changeFrequency:'monthly',priority:0.7,
     alternates:item.has_japanese?{languages:{en:SEO_CANONICAL_ORIGIN+'/blog/'+item.slug,ja:SEO_CANONICAL_ORIGIN+'/ja/blog/'+item.slug}}:undefined});
   if(item.has_japanese)pages.push({url:SEO_CANONICAL_ORIGIN+'/ja/blog/'+item.slug,
     lastModified:item.published_at,changeFrequency:'monthly',priority:0.7,
     alternates:{languages:{en:SEO_CANONICAL_ORIGIN+'/blog/'+item.slug,ja:SEO_CANONICAL_ORIGIN+'/ja/blog/'+item.slug}}});
  }
 }catch{
  // Unknown, unapproved and draft articles never enter the public sitemap.
 }
 return pages;
}
