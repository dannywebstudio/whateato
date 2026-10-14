import {reviewScoreSql} from '@/lib/review-categories';
import type {Pool} from 'pg';
export type PublicRating={rating:number;source:'naver'|'google';source_url:string};
export type WhatEatORating={rating:number;review_count:number};
export type RatingDisplay={external:PublicRating|null;whateato:WhatEatORating|null};
type ExternalRow={restaurant_id:string;provider:'naver'|'google';rating:number;source_url:string};
type OwnRow={restaurant_id:string;review_count:string;rating:string|null};
/**
 * Returns only explicitly approved external scores and real published user reviews.
 * It does NOT infer fake ratings or blend Google and Naver data.
 */
export async function loadRatingDisplays(pool:Pool,ids:string[]):Promise<Record<string,RatingDisplay>>{
 if(!ids.length)return {};
 const [external,own]=await Promise.all([
  pool.query<ExternalRow>(`SELECT DISTINCT ON (restaurant_id) restaurant_id::text,provider,rating::float8,source_url
     FROM restaurant_external_ratings WHERE restaurant_id=ANY($1::uuid[])
      AND publication_state='published' AND approved_at IS NOT NULL
      AND NULLIF(BTRIM(publication_permission_ref),'') IS NOT NULL
     ORDER BY restaurant_id, CASE WHEN provider='naver' THEN 0 ELSE 1 END`,[ids]),
  pool.query<OwnRow>(`SELECT r.restaurant_id::text,count(*)::text AS review_count,
      round(avg(${reviewScoreSql})::numeric,1)::text AS rating
     FROM whateato_user_reviews r
     LEFT JOIN whateato_review_category_scores s ON s.review_id=r.id
     WHERE r.restaurant_id=ANY($1::uuid[]) AND r.moderation_status='published'
     GROUP BY r.restaurant_id HAVING count(*)>0`,[ids])
 ]);
 const result:Record<string,RatingDisplay>={};
 for(const id of ids)result[id]={external:null,whateato:null};
 for(const x of external.rows)if(result[x.restaurant_id])result[x.restaurant_id].external={rating:x.rating,source:x.provider,source_url:x.source_url};
 for(const x of own.rows)if(result[x.restaurant_id]&&x.rating!==null)result[x.restaurant_id].whateato={rating:Number(x.rating),review_count:Number(x.review_count)};
 return result;
}
