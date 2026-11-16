import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import type {SeoLocale} from '@/lib/seo-locales';

export type SeoRestaurantLocalization={
 restaurant_id:string;
 locale:SeoLocale;
 updated_at:Date;
};

/** Only owner-approved, live restaurants with verified native-language copy.
 * Never treat a Korean fallback as an English/Japanese/Chinese translation.
 */
export async function approvedSeoRestaurantLocalizations(
 ids:readonly string[]
):Promise<SeoRestaurantLocalization[]>{
 if(!ids.length||ids.length>2000||ids.some(id=>!isUuid(id)))return [];
 const pool=getPool();if(!pool)return [];
 try{
  const rows=await pool.query<SeoRestaurantLocalization>(`
   SELECT l.restaurant_id::text AS restaurant_id,l.locale,l.updated_at
   FROM restaurant_localizations l
   JOIN restaurants r ON r.id=l.restaurant_id
   JOIN whateato_restaurant_public_approvals_v1 a
    ON a.restaurant_id=r.id AND a.is_visible=true
   WHERE l.restaurant_id=ANY($1::uuid[])
     AND r.publication_status='published' AND r.business_status='active'
     AND l.locale IN ('en','ko','ja','zh-CN')
     AND l.publication_state='published'
     AND l.verified_at IS NOT NULL
     AND length(BTRIM(l.short_description))>=35
   ORDER BY l.restaurant_id,l.locale
  `,[ids]);
  return rows.rows;
 }catch{
  // Database or approval failures must not leak unpublished pages.
  return [];
 }
}
