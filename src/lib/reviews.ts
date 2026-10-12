import {getPool} from '@/lib/db';

export type PublicReview={id:string;rating:number;body:string;created_at:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validUuid(id:string){return uuid.test(id)}
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
export async function getPublicReviews(restaurantId:string){
  if(!validUuid(restaurantId))return [];
  const pool=getPool();
  if(!pool)return [];
  const result=await pool.query<PublicReview>(
    "SELECT id,rating,body,created_at::text FROM whateato_user_reviews WHERE restaurant_id=$1 AND moderation_status='published' ORDER BY created_at DESC LIMIT 20",
    [restaurantId]
  );
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
