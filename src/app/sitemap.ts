import type {MetadataRoute} from 'next';
import {getPool} from '@/lib/db';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// No search/filter URLs. Only after launch and only actively published
// restaurants with approved Korean descriptions enter the sitemap.
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
  if(process.env.NEXT_PUBLIC_LAUNCH_READY!=='true')return [];
  const origin=(process.env.NEXT_PUBLIC_SITE_URL||'https://example.com').replace(/\/$/,'');
  const pages:MetadataRoute.Sitemap=[{
    url:origin+'/',changeFrequency:'weekly',priority:1
  }];
  const pool=getPool();
  if(!pool)return pages;
  try{
    const res=await pool.query<{id:string;updated_at:Date}>(`
      SELECT r.id::text AS id,l.updated_at
      FROM restaurants r
      JOIN restaurant_localizations l ON l.restaurant_id=r.id
        AND l.locale='ko' AND l.publication_state='published'
        AND l.verified_at IS NOT NULL
        AND char_length(BTRIM(l.short_description))>=35
      WHERE r.publication_status='published' AND r.business_status='active'
      ORDER BY r.id
      LIMIT 10000`);
    for(const row of res.rows){
      pages.push({
        url:origin+'/restaurant/'+row.id,
        lastModified:row.updated_at,
        changeFrequency:'monthly',
        priority:0.6
      });
    }
  }catch{
    // Never accidentally publish unknown/unreviewed restaurant pages.
    // A failed DB query should not expose unverified or stale records.
  }
  try{
    const blog=await pool.query<{slug:string;published_at:Date}>(`
      SELECT p.slug,u.published_at FROM whateato_blog_publications u
      JOIN whateato_blog_posts p ON p.id=u.post_id
      WHERE u.is_visible=true
      ORDER BY u.published_at DESC LIMIT 2000`);
    if(blog.rows.length)pages.push({
      url:origin+'/blog',changeFrequency:'weekly',priority:0.8
    });
    for(const item of blog.rows){
      pages.push({url:origin+'/blog/'+item.slug,lastModified:item.published_at,
        changeFrequency:'monthly',priority:0.7});
    }
  }catch{
    // Missing CMS migration or DB outages must never expose draft URLs.
  }
  return pages;
}
