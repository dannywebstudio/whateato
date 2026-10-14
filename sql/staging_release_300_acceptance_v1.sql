-- READ ONLY. Staging cohort release acceptance. 300 candidates are NOT
-- automatically approved just because they appear in this report.
WITH c AS (
 SELECT count(*) AS n,
  count(*) FILTER (WHERE district='종로구') AS jongno,
  count(*) FILTER (WHERE district='중구') AS jung,
  count(*) FILTER (WHERE review_state='approved') AS approved
 FROM whateato_release_cohort_300_v1
), q AS (
 SELECT
 count(*) FILTER (WHERE display_address_ko IS NULL) AS missing_address,
 count(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS missing_coordinates,
 count(*) FILTER (WHERE address_state='lot_address_fallback') AS lot_fallback,
 count(*) FILTER (WHERE published_verified_menu_count>0) AS with_menus,
 count(*) FILTER (WHERE has_four_locales) AS four_locales,
 count(*) FILTER (WHERE review_state='approved' AND published_verified_menu_count>0 AND has_four_locales
 AND NOT EXISTS(
 SELECT 1 FROM whateato_release_cohort_locale_tasks_v1 x
 WHERE x.restaurant_id=whateato_release_cohort_readiness_v1.restaurant_id
 AND (x.locale_state<>'published' OR x.verified_menu_translations<x.verified_korean_menus)
 )) AS launch_ready
 FROM whateato_release_cohort_readiness_v1
), m AS (
 SELECT
 count(*) FILTER(WHERE menu_task='need_branch_menu_source') AS need_menu_source,
 count(*) FILTER(WHERE menu_task IN ('research_candidate_review','source_candidate_review')) AS reviewable_menu_candidates
 FROM whateato_release_cohort_menu_tasks_v1
), l AS (
 SELECT
 count(*) FILTER(WHERE locale_state='missing') AS locale_records_missing,
 count(*) FILTER(WHERE locale_state='needs_locale_review') AS locale_records_in_review,
 count(*) FILTER(WHERE locale_state='published') AS locale_records_published
 FROM whateato_release_cohort_locale_tasks_v1
), k AS (
 SELECT count(DISTINCT c.restaurant_id) AS unresolved_quality_cases
 FROM whateato_release_cohort_300_v1 c
 JOIN restaurant_data_quality_reviews q ON q.restaurant_id=c.restaurant_id
 WHERE q.review_state='pending'
 AND q.issue_code NOT IN ('COORDINATES_MISSING')
)
SELECT
 c.n AS cohort_count,c.jongno,c.jung,c.approved,
 q.missing_address,q.missing_coordinates,q.lot_fallback,
 q.with_menus,q.four_locales,q.launch_ready,
 m.need_menu_source,m.reviewable_menu_candidates,
 l.locale_records_missing,l.locale_records_in_review,l.locale_records_published,
 k.unresolved_quality_cases,
 CASE WHEN c.n=300 AND c.jongno=180 AND c.jung=120
 AND q.missing_address=0 AND q.missing_coordinates=0 THEN 'PASS' ELSE 'FAIL' END cohort_selection_gate,
 CASE WHEN q.launch_ready=300 AND c.approved=300 THEN 'PASS' ELSE 'BLOCKED' END public_release_gate
FROM c,q,m,l,k;
