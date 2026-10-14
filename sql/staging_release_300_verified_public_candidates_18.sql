-- VERIFIED-ONLY STAGING PUBLIC CANDIDATES, NOT A PRODUCTION DEPLOY OR OWNER'S FINAL LAUNCH.
-- Two newly evidence-reviewed venue localizations: DO NOT touch others.
UPDATE restaurant_localizations l SET publication_state='published',verified_at=now(),updated_at=now()
FROM whateato_release_cohort_300_v1 c
JOIN restaurants r ON r.id=c.restaurant_id
WHERE l.restaurant_id=c.restaurant_id
AND c.restaurant_id IN ('7f4cea98-3a10-4588-954b-85e1e5f58b0f'::uuid,'ae7cd325-e248-4962-9f5f-f374071cb940'::uuid)
AND c.review_state='pending'
AND l.publication_state='review'
AND 
r.publication_status='published' AND r.business_status='active'
AND r.latitude BETWEEN 33 AND 39.5 AND r.longitude BETWEEN 124 AND 132
AND COALESCE(NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=r.id
  AND q.review_state IN ('pending','confirmed_hold')
)
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=r.id
 AND m.publication_state='published' AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL)>=2
AND NOT EXISTS (SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=r.id AND m.publication_state='published'
 AND (m.evidence_ref IS NULL OR
 (SELECT COUNT(DISTINCT ml.locale) FROM restaurant_menu_localizations ml WHERE ml.menu_id=m.id
 AND ml.locale IN('ko','en','ja','zh-CN') AND NULLIF(BTRIM(ml.name),'') IS NOT NULL)<>4)
)
AND (SELECT COUNT(DISTINCT l.locale) FROM restaurant_localizations l WHERE l.restaurant_id=r.id
 AND l.locale IN('ko','en','ja','zh-CN')
 AND l.publication_state IN('review','published')
 AND NULLIF(BTRIM(l.display_name),'') IS NOT NULL
 AND NULLIF(BTRIM(l.short_description),'') IS NOT NULL)=4

AND l.source_notes LIKE '%https://%'
AND (SELECT COUNT(DISTINCT loc.locale) FROM restaurant_localizations loc WHERE loc.restaurant_id=r.id
 AND loc.publication_state='review'
 AND loc.source_notes LIKE '%https://%'
 AND loc.locale IN('ko','en','ja','zh-CN'))=4;

-- Approval is staging-only, never deployment. User explicitly authorized verified-only promotion.
UPDATE whateato_release_cohort_300_v1 c
SET review_state='approved',reviewed_at=now(),
 reviewer_note='AI-assisted source corroboration and 4-locale editorial QA completed 2026-10-14. Staging public candidate only; prices sourced snapshots, operations not real-time verified.'
FROM restaurants r
WHERE c.restaurant_id=r.id AND c.restaurant_id IN ('16918f58-4e63-4e49-a013-aad17e499ad4'::uuid,'6cc37914-1bb8-406e-a365-34c897b4f26f'::uuid,'2daa58f1-6360-4ddb-a27f-6e6d1437a122'::uuid,'7f4cea98-3a10-4588-954b-85e1e5f58b0f'::uuid,'ae7cd325-e248-4962-9f5f-f374071cb940'::uuid)
AND c.review_state='pending'
AND 
r.publication_status='published' AND r.business_status='active'
AND r.latitude BETWEEN 33 AND 39.5 AND r.longitude BETWEEN 124 AND 132
AND COALESCE(NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=r.id
  AND q.review_state IN ('pending','confirmed_hold')
)
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=r.id
 AND m.publication_state='published' AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL)>=2
AND NOT EXISTS (SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=r.id AND m.publication_state='published'
 AND (m.evidence_ref IS NULL OR
 (SELECT COUNT(DISTINCT ml.locale) FROM restaurant_menu_localizations ml WHERE ml.menu_id=m.id
 AND ml.locale IN('ko','en','ja','zh-CN') AND NULLIF(BTRIM(ml.name),'') IS NOT NULL)<>4)
)
AND (SELECT COUNT(DISTINCT l.locale) FROM restaurant_localizations l WHERE l.restaurant_id=r.id
 AND l.locale IN('ko','en','ja','zh-CN')
 AND l.publication_state ='published'
 AND NULLIF(BTRIM(l.display_name),'') IS NOT NULL
 AND NULLIF(BTRIM(l.short_description),'') IS NOT NULL)=4
;
