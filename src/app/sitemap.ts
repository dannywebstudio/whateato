import type {MetadataRoute} from 'next';
import {getPool} from '@/lib/db';
import {getRestaurantCatalogDetail} from '@/lib/restaurant-catalog';
import {seoPublicEnabled,SEO_CANONICAL_ORIGIN,SEO_RESTAURANT_IDS} from '@/lib/public-seo';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// SEO is independent of the preview release flag. Never enumerate the full
// restaurant database here: three fixed restaurant IDs are the entire whitelist.
// Blog posts are automatically included ONLY after the CMS publishes them.
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  if(!seoPublicEnabled())return [];
  const pages:MetadataRoute.Sitemap=[
    {url:SEO_CANONICAL_ORIGIN+'/',changeFrequency:'weekly',priority:1}
  ];

  for(const id of SEO_RESTAURANT_IDS){
    try{
      // Reuse the same eligibility/readiness gate as the actual public detail API.
      const detail=await getRestaurantCatalogDetail(id,'ko');
      if(!detail?.restaurant.short_description?.trim() ||
         detail.restaurant.short_description.trim().length<35)continue;
      pages.push({url:SEO_CANONICAL_ORIGIN+'/restaurant/'+id,
        changeFrequency:'monthly',priority:0.6});
    }catch{
      // Failing closed is safer than publishing an unavailable restaurant.
    }
  }

  const pool=getPool();
  if(!pool)return pages;
  try{
    const blog=await pool.query<{slug:string;published_at:Date}>(`
      SELECT p.slug,u.published_at FROM whateato_blog_publications u
      JOIN whateato_blog_posts p ON p.id=u.post_id
      WHERE u.is_visible=true
        AND NULLIF(BTRIM(u.snapshot->'translations'->'en'->>'title'),'') IS NOT NULL
      ORDER BY u.published_at DESC LIMIT 2000`);
    if(blog.rows.length)pages.push({
      url:SEO_CANONICAL_ORIGIN+'/blog',changeFrequency:'weekly',priority:0.8
    });
    for(const item of blog.rows){
      pages.push({url:SEO_CANONICAL_ORIGIN+'/blog/'+item.slug,
        lastModified:item.published_at,changeFrequency:'monthly',priority:0.7});
    }
  }catch{
    // Missing blog CMS migrations, outages or unapproved drafts never leak URLs.
  }
  return pages;
}
