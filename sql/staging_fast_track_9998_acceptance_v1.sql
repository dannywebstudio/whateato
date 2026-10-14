-- STAGING read-only full 9,998-row triage acceptance contract.
WITH grouped AS(
 SELECT
 COUNT(*) AS classified,
 COUNT(*) FILTER(WHERE grade='A') AS grade_a,
 COUNT(*) FILTER(WHERE grade='B' AND visibility='basic_map') AS grade_b_map,
 COUNT(*) FILTER(WHERE grade='B' AND visibility='basic_search_only') AS grade_b_search,
 COUNT(*) FILTER(WHERE grade='C_REVIEW') AS grade_c_review,
 COUNT(*) FILTER(WHERE grade='C_CONFIRMED') AS grade_c_confirmed,
 COUNT(*) FILTER(WHERE grade='C_REVIEW' AND visibility<>'hidden') AS leaked_c,
 COUNT(*) FILTER(WHERE grade='B' AND visibility='basic_map' AND (r.latitude IS NULL OR r.longitude IS NULL)) AS bad_map_pin,
 COUNT(*) FILTER(WHERE grade='B' AND (NULLIF(BTRIM(r.name_ko),'') IS NULL
    OR COALESCE(NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) IS NULL)) AS missing_permit_identity
 FROM whateato_restaurant_triage_v1 t JOIN restaurants r ON r.id=t.restaurant_id
)
SELECT *, (SELECT COUNT(*) FROM restaurants) AS source_rows,
(SELECT COUNT(*) FROM whateato_c_confirmation_v1) AS confirmed_evidence,
(SELECT COUNT(*) FROM whateato_c_delete_archive_v1) AS hard_delete_backups,
CASE WHEN classified=(SELECT COUNT(*) FROM restaurants)
 AND leaked_c=0 AND bad_map_pin=0 AND missing_permit_identity=0 THEN 'PASS' ELSE 'FAIL' END AS first_pass_gate,
CASE WHEN grade_c_confirmed=0 THEN 'NO_PROVEN_C_TO_HARD_DELETE' ELSE 'CONFIRMED_C_REQUIRES_ARCHIVE_AND_RESTRICTED_DELETE' END AS delete_gate
FROM grouped;
