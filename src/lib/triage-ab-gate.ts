// A restaurant is public ONLY after an explicit owner approval record.
// An existing 'published' flag, release cohort membership or data import alone is insufficient.
export function triageABPublicWhere():string {
 return `
   AND EXISTS (
     SELECT 1 FROM whateato_restaurant_public_approvals_v1 approval
     WHERE approval.restaurant_id=r.id AND approval.is_visible=true
   )
   AND NOT EXISTS (
     SELECT 1 FROM whateato_restaurant_triage_v1 triage
     WHERE triage.restaurant_id=r.id
       AND (triage.grade='C' OR triage.visibility NOT IN ('full','basic_map','basic_search_only'))
   )
   AND EXISTS (
     SELECT 1 FROM restaurant_opening_hours hours
     WHERE hours.restaurant_id=r.id
       AND hours.publication_state='published'
       AND hours.verified_at IS NOT NULL
       AND NULLIF(BTRIM(hours.source_url),'') IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM restaurant_opening_intervals slots
         WHERE slots.restaurant_id=hours.restaurant_id
           AND slots.weekday BETWEEN 0 AND 6
           AND slots.start_minute>=0
           AND slots.end_minute>slots.start_minute
           AND slots.end_minute<=1440
       )
   )
   AND NOT EXISTS (
     SELECT 1 FROM restaurant_data_quality_reviews dq
     WHERE dq.restaurant_id=r.id
       AND dq.review_state='confirmed_hold'
   )`;
}
export function triageDisplayCategorySql():string {
 return `CASE WHEN EXISTS (
   SELECT 1 FROM restaurant_data_quality_reviews qc
   WHERE qc.restaurant_id=r.id
     AND qc.issue_code='PERMIT_CATEGORY_CONFLICT'
     AND qc.review_state IN('pending','confirmed_hold')
 ) THEN NULL ELSE r.category_code END`;
}
