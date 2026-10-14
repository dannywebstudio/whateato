// Strictly opt-in publication gate for the fast-track A/B catalog.
// Run staging_fast_track_9998_schema_v1.sql and classify_v1.sql on the
// target DB before enabling. C_REVIEW and C_CONFIRMED are always hidden.
// A: source-reviewed menus and four-language copy.
// B: sourced permit identity/address; missing optional data stays absent.
// This is separate from the earlier 300-verified-only gate.
// If both switches are ON, their intersection applies (i.e. stricter result).
export function triageABPublicWhere():string {
 if(process.env.WHATEATO_TRIAGE_AB_CATALOG_ONLY!=='true')return '';
 return `
   AND EXISTS (
     SELECT 1 FROM whateato_restaurant_triage_v1 t
     WHERE t.restaurant_id=r.id
       AND t.grade IN ('A','B')
       AND t.visibility IN ('full','basic_map','basic_search_only')
   )
   AND NOT EXISTS (
     SELECT 1 FROM restaurant_data_quality_reviews dq
     WHERE dq.restaurant_id=r.id
       AND dq.review_state='confirmed_hold'
   )`;
}
// Hide dubious legal permit cuisine from consumers while we review it.
// Raw category_code stays unchanged in the source table.
export function triageDisplayCategorySql():string {
 if(process.env.WHATEATO_TRIAGE_AB_CATALOG_ONLY!=='true')return 'r.category_code';
 return `CASE
   WHEN EXISTS(
     SELECT 1 FROM restaurant_data_quality_reviews qc
     WHERE qc.restaurant_id=r.id
       AND qc.issue_code='PERMIT_CATEGORY_CONFLICT'
       AND qc.review_state IN('pending','confirmed_hold')
   ) THEN NULL
   ELSE r.category_code END`;
}
