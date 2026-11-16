import type {MetadataRoute} from 'next';
import {getPool} from '@/lib/db';
import {getRestaurantCatalogDetail} from '@/lib/restaurant-catalog';
import {approvedSeoRestaurantIds,seoPublicEnabled,SEO_CANONICAL_ORIGIN} from '@/lib/public-seo';
import {SEO_LOCALES,type SeoLocale,blogArticlePath,blogIndexPath,restaurantPath,absoluteSeoUrl,localizedAlternates} from '@/lib/seo-locales';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Only approved restaurants and visible CMS publications are eligible. Language
// variants must have real, published translations; fallback content is not SEO.
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 if(!seoPublicEnabled())return [];
 const pages:MetadataRoute.Sitemap=[{url:SEO_CANONICAL_ORIGIN+'/'}];
 const pool=getPool();
 if(!pool)return pages;

 // Owner approval is the existing hard gate, independent of import cohort.
 const ids=await approvedSeoRestaurantIds();
 let localizationRows:{restaurant_id:string;locale:SeoLocale;updated_at:Date}[]=[];
 if(ids.length){
  try{
   const res=await pool.query<{restaurant_id:string;locale:SeoLocale;updated_at:Date}>(`
    SELECT l.restaurant_id::text AS restaurant_id,l.locale,l.updated_at
    FROM restaurant_localizations l
    WHERE l.restaurant_id=ANY($1::uuid[])
      AND l.locale IN ('en','ko','ja','zh-CN')
      AND l.publication_state='published'
      AND l.verified_at IS NOT NULL
      AND length(BTRIM(l.short_description))>=35
    ORDER BY l.restaurant_id,l.locale
   `,[ids]);
   localizationRows=res.rows;
  }catch{
   // Missing/unavailable locale evidence means do not enumerate restaurants.
  }
 }
 for(const id of ids){
  const localizations=localizationRows.filter(row=>row.restaurant_id===id);
  const locales=SEO_LOCALES.filter(locale=>localizations.some(row=>row.locale===locale));
  // Preserve the existing Korean editorial readiness gate.
  if(!locales.includes('ko'))continue;
  try{
   const detail=await getRestaurantCatalogDetail(id,'ko');
   if(!detail?.restaurant.short_description?.trim()||
      detail.restaurant.short_description.trim().length<35)continue;
   const languages=localizedAlternates(locale=>restaurantPath(id,locale),locales,'ko');
   for(const locale of locales){
    const row=localizations.find(item=>item.locale===locale)!;
    pages.push({
     url:absoluteSeoUrl(restaurantPath(id,locale)),
     lastModified:row.updated_at,
     alternates:{languages}
    });
   }
  }catch{
   // Never leak unavailable, blocked or unapproved restaurant URLs.
  }
 }

 try{
  const blog=await pool.query<{
   slug:string;published_at:Date;
   has_en:boolean;has_ko:boolean;has_ja:boolean;has_zh_cn:boolean
  }>(`
   SELECT p.slug,u.published_at,
    NULLIF(BTRIM(u.snapshot->'translations'->'en'->>'title'),'') IS NOT NULL AS has_en,
    NULLIF(BTRIM(u.snapshot->'translations'->'ko'->>'title'),'') IS NOT NULL AS has_ko,
    NULLIF(BTRIM(u.snapshot->'translations'->'ja'->>'title'),'') IS NOT NULL AS has_ja,
    NULLIF(BTRIM(u.snapshot->'translations'->'zh-CN'->>'title'),'') IS NOT NULL AS has_zh_cn
   FROM whateato_blog_publications u
   JOIN whateato_blog_posts p ON p.id=u.post_id
   WHERE u.is_visible=true
   ORDER BY u.published_at DESC LIMIT 2000
  `);
  const availableForIndex=new Set<SeoLocale>();
  for(const item of blog.rows){
   const locales=SEO_LOCALES.filter(locale=>
    locale==='en'?item.has_en:
    locale==='ko'?item.has_ko:
    locale==='ja'?item.has_ja:item.has_zh_cn);
   if(!locales.includes('en'))continue;
   for(const locale of locales)availableForIndex.add(locale);
   const languages=localizedAlternates(locale=>blogArticlePath(item.slug,locale),locales,'en');
   for(const locale of locales){
    pages.push({
     url:absoluteSeoUrl(blogArticlePath(item.slug,locale)),
     lastModified:item.published_at,
     alternates:{languages}
    });
   }
  }
  const indexLocales=SEO_LOCALES.filter(locale=>availableForIndex.has(locale));
  if(indexLocales.includes('en')){
   const languages=localizedAlternates(blogIndexPath,indexLocales,'en');
   for(const locale of indexLocales){
    pages.push({url:absoluteSeoUrl(blogIndexPath(locale)),alternates:{languages}});
   }
  }
 }catch{
  // Drafts, invisible publications and database failures never become SEO URLs.
 }
 return pages;
}
