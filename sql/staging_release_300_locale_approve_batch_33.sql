-- Stage release candidates only: Yeonghwaru, Doenjang Yesulgwa Sul, Modern Gimbap.
-- Food category conflicts and mismatched business address remain NOT approved.
WITH eligible AS (SELECT c.restaurant_id FROM whateato_release_cohort_300_v1 c JOIN restaurants r ON r.id=c.restaurant_id
WHERE c.restaurant_id IN ('7b9cfbb8-83af-4dd9-93e9-1292eb7fb15b'::uuid,'29672a47-4a81-403d-bbf6-c8b3481d46d7'::uuid,'ced7b371-6cd0-4589-ab48-ce6a5881e520'::uuid) AND c.review_state='pending'
AND r.business_status='active' AND r.publication_status='published'
AND coalesce(nullif(btrim(r.road_address_ko),''),nullif(btrim(r.lot_address_ko),'')) IS NOT NULL
AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=c.restaurant_id AND q.review_state IN('pending','confirmed_hold'))
AND (SELECT count(DISTINCT l.locale) FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id
  AND l.locale IN('ko','en','ja','zh-CN') AND l.publication_state='review' AND l.source_notes LIKE '%https://%'
  AND nullif(btrim(l.display_name),'') IS NOT NULL AND nullif(btrim(l.short_description),'') IS NOT NULL)=4
AND (SELECT count(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published'
 AND m.price_krw IS NOT NULL AND nullif(btrim(m.evidence_ref),'') IS NOT NULL)>=3
AND NOT EXISTS(SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published'
 AND (SELECT COUNT(DISTINCT ml.locale) FROM restaurant_menu_localizations ml WHERE ml.menu_id=m.id
 AND ml.locale IN('ko','en','ja','zh-CN') AND nullif(btrim(ml.name),'') IS NOT NULL)<>4))
UPDATE restaurant_localizations l SET publication_state='published',verified_at=now(),updated_at=now()
FROM eligible e WHERE e.restaurant_id=l.restaurant_id AND l.publication_state='review'
AND l.locale IN('ko','en','ja','zh-CN');

UPDATE whateato_release_cohort_300_v1 c SET review_state='approved',reviewed_at=now(),
 reviewer_note='Staging-only AI-assisted source review 2026-10-14: exact branch/address, menu price snapshots, four-language descriptions; no in-person or real-time validation.'
WHERE c.restaurant_id IN('7b9cfbb8-83af-4dd9-93e9-1292eb7fb15b'::uuid,'29672a47-4a81-403d-bbf6-c8b3481d46d7'::uuid,'ced7b371-6cd0-4589-ab48-ce6a5881e520'::uuid) AND c.review_state='pending'
AND (SELECT count(DISTINCT l.locale) FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id AND l.publication_state='published'
 AND l.locale IN('ko','en','ja','zh-CN') AND nullif(btrim(l.short_description),'') IS NOT NULL)=4
AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=c.restaurant_id
 AND q.review_state IN('pending','confirmed_hold'))
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published'
 AND m.price_krw IS NOT NULL)>=3;
