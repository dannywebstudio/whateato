-- STAGING ONLY. Classify ALL current localdata records. No deletion here.
-- Permit active + name/address confirms a registry listing, not "open now".
-- Missing coordinates => search only. Unresolved identity/closure/nonfood/
-- exact duplicate => C_REVIEW hidden, NEVER auto-delete.
WITH duplicates AS (
 SELECT r.id,
 COUNT(*) OVER(PARTITION BY regexp_replace(lower(BTRIM(r.name_ko)),
 '[[:space:][:punct:]]','','g'),
 COALESCE(NULLIF(BTRIM(r.road_address_ko),''),
 NULLIF(BTRIM(r.lot_address_ko),''))) AS copy_count
 FROM restaurants r
), flags AS (
 SELECT r.id,
 COALESCE(NULLIF(BTRIM(r.road_address_ko),''),
 NULLIF(BTRIM(r.lot_address_ko),'')) AS address,
 (r.latitude BETWEEN 33 AND 39.5 AND r.longitude BETWEEN 124 AND 132)
 AS good_geo,
 COALESCE(d.copy_count,1)>1 AS duplicate_suspect,
 EXISTS (SELECT 1 FROM restaurant_data_quality_reviews q
  WHERE q.restaurant_id=r.id
  AND q.review_state IN ('pending','confirmed_hold')
  AND q.issue_code IN ('POSSIBLE_CLOSURE','NAME_IDENTITY_MISMATCH',
  'BRANCH_ADDRESS_COLLISION','POSSIBLE_DUPLICATE','OTHER')) AS unresolved_identity,
 EXISTS (SELECT 1 FROM whateato_release_cohort_readiness_v1 ready
  WHERE ready.restaurant_id=r.id AND ready.review_state='approved'
  AND ready.published_verified_menu_count>0 AND ready.has_four_locales)
 AS approved_source_review,
 EXISTS (SELECT 1 FROM whateato_c_confirmation_v1 cv
  WHERE cv.restaurant_id=r.id AND cv.reviewed_at IS NOT NULL
  AND cv.evidence_url LIKE 'https://%') AS confirmed_c,
 (r.publication_status='published' AND r.business_status='active'
  AND NULLIF(BTRIM(r.name_ko),'') IS NOT NULL) AS permit_supported
 FROM restaurants r LEFT JOIN duplicates d ON d.id=r.id
), classification AS(
 SELECT f.id,
 CASE
  WHEN confirmed_c THEN 'C_CONFIRMED'
  WHEN unresolved_identity OR duplicate_suspect
    OR NOT permit_supported OR address IS NULL THEN 'C_REVIEW'
  WHEN approved_source_review AND good_geo THEN 'A'
  ELSE 'B' END grade,
 CASE
  WHEN confirmed_c OR unresolved_identity OR duplicate_suspect
    OR NOT permit_supported OR address IS NULL THEN 'hidden'
  WHEN approved_source_review AND good_geo THEN 'full'
  WHEN good_geo THEN 'basic_map'
  ELSE 'basic_search_only' END visibility,
 CASE
  WHEN confirmed_c THEN 'confirmed_c_with_manual_evidence'
  WHEN unresolved_identity THEN 'unresolved_identity_or_possible_nonfood'
  WHEN duplicate_suspect THEN 'same_name_address_possible_duplicate'
  WHEN NOT permit_supported THEN 'source_status_or_name_unverified'
  WHEN address IS NULL THEN 'address_absent'
  WHEN approved_source_review AND good_geo THEN 'reviewed_localized_food'
  WHEN good_geo IS NOT TRUE THEN 'permit_only_no_map_coordinates'
  ELSE 'permit_verified_name_address_only' END reason_code
 FROM flags f
)
INSERT INTO whateato_restaurant_triage_v1
(restaurant_id,grade,visibility,reason_code,review_required,ruleset_version,classified_at)
SELECT id,grade,visibility,reason_code,grade IN('C_REVIEW','C_CONFIRMED'),
'fast-track-v1',now() FROM classification
ON CONFLICT(restaurant_id) DO UPDATE SET
 grade=EXCLUDED.grade,visibility=EXCLUDED.visibility,
 reason_code=EXCLUDED.reason_code,review_required=EXCLUDED.review_required,
 ruleset_version=EXCLUDED.ruleset_version,classified_at=EXCLUDED.classified_at
WHERE whateato_restaurant_triage_v1.grade<>'C_CONFIRMED'
 OR EXCLUDED.grade='C_CONFIRMED';