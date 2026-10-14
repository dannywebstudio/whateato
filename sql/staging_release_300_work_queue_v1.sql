-- Read-only staging queue. Deterministic next work by identity, menu evidence, four locale drafts; no deletion or artificial approval.
CREATE OR REPLACE VIEW whateato_release_300_work_queue_v1 AS
SELECT
 c.cohort_rank,c.restaurant_id,c.district,c.category_bucket,c.review_state AS cohort_state,
 r.name_ko AS original_name,r.category_code AS source_category,
 COALESCE(NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) AS address_ko,
 ready.published_verified_menu_count,
 COALESCE(m.priced_dishes,0)::integer AS priced_dishes,
 COALESCE(loc.loc_published,0)::integer AS locale_published,
 COALESCE(loc.loc_review,0)::integer AS locale_review,
 COALESCE(loc.loc_draft,0)::integer AS locale_draft,
 COALESCE(quality.issue_count,0)::integer AS pending_identity_issues,
 COALESCE(research.source_count,0)::integer AS research_source_count,
 CASE
  WHEN c.review_state='hold' THEN 'hold_verify_identity_or_closure'
  WHEN COALESCE(quality.issue_count,0)>0 THEN 'resolve_identity_or_category'
  WHEN ready.published_verified_menu_count=0 THEN 'research_exact_branch_menu_and_prices'
  WHEN COALESCE(loc.loc_published,0)<4 THEN 'review_four_restaurant_locales'
  WHEN NOT ready.has_four_locales THEN 'repair_localization_consistency'
  WHEN c.review_state<>'approved' THEN 'final_branch_and_publication_qa'
  ELSE 'release_gate_eligible' END AS next_action,
 CASE
  WHEN c.review_state='hold' THEN 9
  WHEN COALESCE(quality.issue_count,0)>0 THEN 8
  WHEN ready.published_verified_menu_count=0 AND COALESCE(research.source_count,0)>0 THEN 1
  WHEN ready.published_verified_menu_count=0 THEN 2
  WHEN COALESCE(loc.loc_review,0)>0 THEN 3
  WHEN ready.published_verified_menu_count>0 THEN 4
  ELSE 5 END AS work_priority
FROM whateato_release_cohort_300_v1 c JOIN restaurants r ON r.id=c.restaurant_id
JOIN whateato_release_cohort_readiness_v1 ready ON ready.restaurant_id=c.restaurant_id
LEFT JOIN LATERAL(
 SELECT COUNT(*) FILTER(WHERE price_krw IS NOT NULL AND publication_state='published') AS priced_dishes
 FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id
) m ON true
LEFT JOIN LATERAL(
 SELECT COUNT(*) FILTER(WHERE publication_state='published') AS loc_published,
 COUNT(*) FILTER(WHERE publication_state='review') AS loc_review,
 COUNT(*) FILTER(WHERE publication_state='draft') AS loc_draft
 FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id
) loc ON true
LEFT JOIN LATERAL(
 SELECT COUNT(*) AS issue_count FROM restaurant_data_quality_reviews q
 WHERE q.restaurant_id=c.restaurant_id AND q.review_state IN ('pending','confirmed_hold')
) quality ON true
LEFT JOIN LATERAL(
 SELECT COUNT(*) AS source_count FROM restaurant_external_research e
 WHERE e.restaurant_id=c.restaurant_id AND
 (jsonb_typeof(e.research_sources)='array' AND jsonb_array_length(e.research_sources)>0)
) research ON true;
