// A restaurant is public ONLY after an explicit owner approval record.
// An existing 'published' flag, release cohort membership or data import alone is insufficient.
export function triageABPublicWhere():string {
 return `
   AND EXISTS (
     SELECT 1 FROM whateato_restaurant_public_approvals_v1 approval
     WHERE approval.restaurant_id=r.id AND approval.is_visible=true
   )
   -- Existing three Map venues remain grandfathered. Every NEW approval must
   -- pass the owner-defined text-only, three-language publication checklist.
   AND (
     EXISTS (
       SELECT 1 FROM whateato_restaurant_public_approvals_v1 existing
       WHERE existing.restaurant_id=r.id AND existing.is_visible=true
         AND existing.approval_source='baseline'
     )
     OR (
       NULLIF(BTRIM(r.name_ko),'') IS NOT NULL
       AND COALESCE(NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) IS NOT NULL
       AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
       AND (
         SELECT COUNT(DISTINCT l.locale) FROM restaurant_localizations l
         WHERE l.restaurant_id=r.id AND l.locale IN ('en','ja','zh-CN')
           AND l.publication_state='published' AND l.verified_at IS NOT NULL
           AND NULLIF(BTRIM(l.display_name),'') IS NOT NULL
       )=3
       AND (
         SELECT COUNT(DISTINCT a.locale) FROM restaurant_address_localizations_v1 a
         WHERE a.restaurant_id=r.id AND a.locale IN ('en','ja','zh-CN')
           AND a.verified_at IS NOT NULL
           AND NULLIF(BTRIM(a.display_address),'') IS NOT NULL
       )=3
       AND EXISTS (
         SELECT 1 FROM restaurant_menus m
         WHERE m.restaurant_id=r.id AND m.publication_state='published'
           AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL
           AND (
             SELECT COUNT(DISTINCT ml.locale) FROM restaurant_menu_localizations ml
             WHERE ml.menu_id=m.id AND ml.locale IN ('en','ja','zh-CN')
               AND NULLIF(BTRIM(ml.name),'') IS NOT NULL
           )=3
       )
     )
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
