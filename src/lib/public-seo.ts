import {getPool} from '@/lib/db';

export const SEO_CANONICAL_ORIGIN='https://whateato.com';

// Search Console indexing is separate from launch readiness and CMS switches.
export function seoPublicEnabled():boolean{
 return process.env.WHATEATO_SEO_PUBLIC_ENABLED==='true'
   && (process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'')===SEO_CANONICAL_ORIGIN;
}

// There is NO automatic promotion based on cohort membership, imported CSVs,
// or a generic publication_status. Membership comes only from owner approvals.
export async function approvedSeoRestaurantIds():Promise<string[]>{
 if(!seoPublicEnabled())return [];
 const pool=getPool();
 if(!pool)return [];
 try{
  const rows=await pool.query<{id:string}>(`
    SELECT a.restaurant_id::text AS id
    FROM whateato_restaurant_public_approvals_v1 a
    JOIN restaurants r ON r.id=a.restaurant_id
    WHERE a.is_visible=true AND r.publication_status='published'
      AND r.business_status='active'
    ORDER BY a.approved_at,a.restaurant_id LIMIT 2000`);
  return rows.rows.map(r=>r.id);
 }catch{
  // Fail closed if the migration is not applied or database is unavailable.
  return [];
 }
}
