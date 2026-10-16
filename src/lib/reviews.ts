import {getPool} from '@/lib/db';
import {reviewScoreSql} from '@/lib/review-categories';

export type PublicReview={id:string;rating:number;body:string;created_at:string;
 categories:{taste:number;service:number|null;tourist_friendliness:number|null;value_for_money:number|null;cleanliness:number|null}|null;
 photos:{id:string;url:string}[]};
import {isUuid} from '@/lib/platform-v1';
export function validUuid(id:string){return isUuid(id)}
export function validateReview(rating:unknown,body:unknown):string|null{
  if(!Number.isInteger(rating)||Number(rating)<1||Number(rating)>5)return 'rating_must_be_1_to_5';
  if(typeof body!=='string'||body.trim().length<30||body.trim().length>1500)
    return 'body_must_be_30_to_1500_chars';
  if(/[\u0000-\u0008\u000B-\u001F\u007F]/.test(body))return 'invalid_control_characters';
  return null;
}
/** No fabricated star ratings, and no definitive restaurant-quality assertions. */
export function publicInsight(
  reviewCount:number, serviceComplaintCount:number, servicePraiseCount:number
):string|null{
  if(reviewCount<3||serviceComplaintCount+servicePraiseCount===0)return null;
  if(serviceComplaintCount>0&&servicePraiseCount>0)
    return '일부 승인된 이용자 리뷰에서 직원 응대에 관한 긍정적 의견과 불만이 모두 언급됐습니다.';
  if(serviceComplaintCount>0)
    return '일부 승인된 이용자 리뷰에서 직원 응대에 관한 불만이 언급됐습니다.';
  return '일부 승인된 이용자 리뷰에서 직원 응대에 관한 긍정적 의견이 언급됐습니다.';
}
export async function getPublicReviews(restaurantId:string,locale='ko'){
  if(!validUuid(restaurantId))return [];
  const pool=getPool();
  if(!pool)return [];
  const result=await pool.query<PublicReview>(`
    SELECT r.id::text,round((${reviewScoreSql})::numeric,1)::float8 AS rating,
      COALESCE(NULLIF(tr.bodies->>$2,''),r.body) AS body,r.created_at::text,
      CASE WHEN s.review_id IS NULL THEN NULL ELSE jsonb_build_object(
        'taste',s.taste,'service',s.service,'tourist_friendliness',s.tourist_friendliness,
        'value_for_money',s.value_for_money,'cleanliness',s.cleanliness) END AS categories,
      coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id',p.id::text,'url','/api/review-photos/'||p.id::text) ORDER BY p.position)
        FROM whateato_review_photo_assets p WHERE p.review_id=r.id
          AND p.scan_state='passed' AND p.rights_state='approved'
          AND p.moderation_state='approved'),'[]'::jsonb) AS photos
    FROM whateato_user_reviews r
    LEFT JOIN whateato_review_category_scores s ON s.review_id=r.id
    LEFT JOIN whateato_review_translations tr ON tr.review_id=r.id
    WHERE r.restaurant_id=$1 AND r.moderation_status='published'
    ORDER BY r.created_at DESC LIMIT 20`,[restaurantId,locale]);
  return result.rows;
}
export async function getLicensedReviewInsights(restaurantId:string){
  if(!validUuid(restaurantId))return [];
  const pool=getPool();
  if(!pool)return [];
  const result=await pool.query<{
    provider_label:string;total:string;service_negative:string;service_positive:string;
  }>(
    "SELECT l.provider_label,count(*)::text AS total,"+
    "count(*) FILTER(WHERE s.service_negative)::text AS service_negative,"+
    "count(*) FILTER(WHERE s.service_positive)::text AS service_positive "+
    "FROM whateato_licensed_review_signals s "+
    "JOIN whateato_review_licenses l ON l.id=s.license_id "+
    "WHERE s.restaurant_id=$1 AND s.expires_at>now() "+
    "AND l.approval_status='approved' AND l.permitted_for_derived_analytics=true "+
    "AND l.approved_at IS NOT NULL AND (l.valid_until IS NULL OR l.valid_until>now()) "+
    "GROUP BY l.id,l.provider_label HAVING count(DISTINCT s.source_item_digest)>=3 "+
    "ORDER BY l.provider_label",[restaurantId]);
  return result.rows.map(row=>({
    provider:row.provider_label,reviewCount:Number(row.total),
    serviceConcernMentions:Number(row.service_negative),
    servicePraiseMentions:Number(row.service_positive),
    note:'적법하게 허가된 외부 리뷰 신호의 요약입니다. 주관적인 이용자 경험이며 사실이 독립적으로 입증된 것은 아닙니다.'
  }));
}


export async function getOwnReviewSummary(restaurantId:string){
  if(!validUuid(restaurantId))return null;
  const pool=getPool();
  if(!pool)return null;
  const result=await pool.query<{review_count:string;average_rating:string}>(
    `SELECT count(*)::text AS review_count,
      round(avg(${reviewScoreSql})::numeric,1)::text AS average_rating
      FROM whateato_user_reviews r
      LEFT JOIN whateato_review_category_scores s ON s.review_id=r.id
      WHERE r.restaurant_id=$1 AND r.moderation_status='published'`,
    [restaurantId]
  );
  const count=Number(result.rows[0]?.review_count||0);
  if(count===0)return null;
  return {
    reviewCount:count,averageRating:Number(result.rows[0].average_rating),
    disclaimer:'WhatEatO에서 승인된 이용자 리뷰에 기반한 평균이며 객관적인 식당 품질 판정이 아닙니다.'
  };
}
