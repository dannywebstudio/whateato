import {getPool} from './db';
import {getScheduleStatus,type HourInterval,type HourOverride} from './hours';
export type RestaurantDetail={
  id:string;name_ko:string;road_address_ko:string|null;lot_address_ko:string|null;
  region_sido:string|null;region_sigungu:string|null;category_code:string|null;
  latitude:number|null;longitude:number|null;business_status:string;
  ai_rating:{score:number;confidence:'medium'|'high';evaluated_at:string;evidence_urls:string[]}|null;
  hours:{state:'unknown'|'estimated_open'|'estimated_closed';label:string;closesAt?:string;source_url?:string;verified_at?:string};
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function getRestaurantDetail(id:string):Promise<RestaurantDetail|null>{
  const db=getPool();if(!db||!uuid.test(id))return null;
  const base=await db.query<{
    id:string;name_ko:string;road_address_ko:string|null;lot_address_ko:string|null;
    region_sido:string|null;region_sigungu:string|null;category_code:string|null;
    latitude:number|null;longitude:number|null;business_status:string;
    rating_id:string|null;ai_score:number|null;ai_confidence:'medium'|'high'|null;ai_evaluated_at:string|null;
  }>(`SELECT r.id,r.name_ko,r.road_address_ko,r.lot_address_ko,r.region_sido,r.region_sigungu,r.category_code,
    r.latitude,r.longitude,r.business_status,
    a.id AS rating_id,a.score::float AS ai_score,a.confidence AS ai_confidence,a.evaluated_at::text AS ai_evaluated_at
    FROM restaurants r LEFT JOIN LATERAL (
      SELECT ar.id,ar.score,ar.confidence,ar.evaluated_at FROM restaurant_ai_ratings ar
      WHERE ar.restaurant_id=r.id AND ar.review_status='approved'
        AND ar.confidence IN ('medium','high') AND ar.reviewed_at IS NOT NULL
        AND (SELECT COUNT(DISTINCT e.publisher_id) FROM restaurant_rating_evidence e
          WHERE e.rating_id=ar.id AND e.verifies_food_quality=true AND e.review_status='verified') >= 2
      ORDER BY ar.evaluated_at DESC LIMIT 1
    ) a ON true WHERE r.id=$1 AND r.publication_status='published' AND r.business_status <> 'closed'`,[id]);
  if(!base.rowCount)return null;
  const r=base.rows[0];
  const [source,intervals,overrides,evidence]=await Promise.all([
    db.query<{verified_at:string;source_url:string}>(`SELECT verified_at::text,source_url FROM restaurant_hour_sources WHERE restaurant_id=$1`,[id]),
    db.query<HourInterval>(`SELECT weekday,opens_minute,closes_minute FROM restaurant_open_intervals WHERE restaurant_id=$1`,[id]),
    db.query<HourOverride>(`SELECT service_date::text,is_closed,intervals FROM restaurant_hour_exceptions WHERE restaurant_id=$1 AND service_date BETWEEN ((now() AT TIME ZONE 'Asia/Seoul')::date-1) AND ((now() AT TIME ZONE 'Asia/Seoul')::date)`,[id]),
    r.rating_id ? db.query<{source_url:string}>(`SELECT source_url FROM restaurant_rating_evidence WHERE rating_id=$1 AND verifies_food_quality=true AND review_status='verified' ORDER BY source_url LIMIT 5`,[r.rating_id]) : Promise.resolve({rows:[] as {source_url:string}[]})
  ]);
  const hours=getScheduleStatus(new Date(),source.rows[0]?.verified_at||null,intervals.rows,overrides.rows);
  return {
    id:r.id,name_ko:r.name_ko,road_address_ko:r.road_address_ko,lot_address_ko:r.lot_address_ko,
    region_sido:r.region_sido,region_sigungu:r.region_sigungu,category_code:r.category_code,
    latitude:r.latitude,longitude:r.longitude,business_status:r.business_status,
    ai_rating:r.rating_id&&r.ai_score!==null&&r.ai_confidence&&r.ai_evaluated_at?{
      score:r.ai_score,confidence:r.ai_confidence,evaluated_at:r.ai_evaluated_at,evidence_urls:evidence.rows.map(x=>x.source_url)
    }:null,
    hours:{...hours,...(source.rows[0]?{source_url:source.rows[0].source_url,verified_at:source.rows[0].verified_at}:{})}
  };
}
