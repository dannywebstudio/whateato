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
  return pages;
}
