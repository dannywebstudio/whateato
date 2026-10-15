import {seoPublicEnabled,SEO_RESTAURANT_IDS} from '@/lib/public-seo';
// Enforced server-side visibility: ONLY curated 300 cohort A/B restaurants.
// Unselected businesses, C flags and holds must never be publicly queried.
// No opt-out flag. Verified published weekly opening intervals with a source are mandatory.
// Restaurants with unknown hours remain in database but are hidden from public listings.
export function triageABPublicWhere():string {
 return `
   ${seoPublicEnabled()?`AND r.id IN (${SEO_RESTAURANT_IDS.map(id=>`'${id}'::uuid`).join(',')})`:''}
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
