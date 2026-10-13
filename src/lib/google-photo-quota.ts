import {getPool} from '@/lib/db';
export type PhotoSku='place_details_photo_metadata'|'place_photo_media';
const ALLOWED=new Set<PhotoSku>(['place_details_photo_metadata','place_photo_media']);
/** Atomic reservation; starts with limit 0 and fails closed.
 * Must be invoked before each chargeable API request.
 * Reservations are counted even if upstream fails; conservative by design.
 */
export async function reserveGooglePhotoQuota(sku:PhotoSku):Promise<boolean>{
  if(!ALLOWED.has(sku)||process.env.WHATEATO_GOOGLE_PHOTO_QUOTA_GUARD_READY!=='true')return false;
  const pool=getPool();
  if(!pool)return false;
  const month=new Date().toISOString().slice(0,7);
  try{
    const r=await pool.query<{used:number}>(`
      UPDATE google_places_photo_quota_v1
      SET used=used+1,updated_at=now()
      WHERE month_key=$1 AND sku=$2 AND used < limit_count
      RETURNING used`,[month,sku]);
    return r.rowCount===1;
  }catch{return false}
}
/** Additional fail closed check; candidate IDs are never considered verified. */
export async function isVerifiedPilotPlace(restaurantId:string,placeId:string):Promise<boolean>{
  if(!/^[a-f0-9-]{36}$/i.test(restaurantId))return false;
  const pool=getPool();if(!pool)return false;
  try{
    const r=await pool.query(`SELECT 1 FROM restaurant_source_match_checkpoints_v1 c
      JOIN restaurant_enrichment_sample_1000 s ON s.restaurant_id=c.restaurant_id
      JOIN google_place_manual_identity_approvals_v1 a ON a.restaurant_id=c.restaurant_id AND a.google_place_id=c.google_place_id
      WHERE c.restaurant_id=$1 AND c.google_place_id=$2 AND s.sample_rank BETWEEN 1 AND 3
        AND a.verified_at IS NOT NULL LIMIT 1`,[restaurantId,placeId]);
    return (r.rowCount||0)>0;
  }catch{return false}
}
