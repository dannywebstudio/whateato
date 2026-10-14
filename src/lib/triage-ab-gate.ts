// Enforced server-side visibility: ONLY curated 300 cohort A/B restaurants.
// Unselected businesses, C flags and holds must never be publicly queried.
// No opt-out flag. Missing Neon tables -> fail closed, not all results.
export function triageABPublicWhere():string {
 return `
   AND EXISTS (
     SELECT 1
     FROM whateato_release_cohort_300_v1 selected
     JOIN whateato_restaurant_triage_v1 triage
       ON triage.restaurant_id=selected.restaurant_id
     WHERE selected.restaurant_id=r.id
       AND selected.review_state NOT IN ('hold')
       AND triage.grade IN ('A','B')
       AND triage.visibility IN ('full','basic_map','basic_search_only')
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
