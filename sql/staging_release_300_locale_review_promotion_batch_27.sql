-- STAGING ONLY; review and publish 13 source-backed venues with no identity flags.
-- Concrete Palette (#21) deliberately retained in review due to source-specific price discrepancy.
-- Correct brand-preserving transliterations before publication.
UPDATE restaurant_localizations SET display_name='Yeongdeok Makhoe',updated_at=now()
 WHERE restaurant_id='e368e24d-a125-463b-80ba-2b3b90184f5e'::uuid
 AND locale='zh-CN' AND publication_state='review'
 AND display_name='盈德生鱼片餐馆';

UPDATE restaurant_localizations SET display_name='ハムン・コムボ冷麺',updated_at=now()
 WHERE restaurant_id='1839eefc-25fe-4720-8d23-080ca084f119'::uuid
 AND locale='ja' AND publication_state='review'
 AND display_name='咸興コンボ冷麺';

UPDATE restaurant_localizations SET display_name='On The Border 光化门D塔店',updated_at=now()
 WHERE restaurant_id='b90a773c-e405-423b-ae44-7b340501b024'::uuid
 AND locale='zh-CN' AND publication_state='review'
 AND display_name='On The Border 光化门D Tower店';

-- All four language review rows are source-backed, no outstanding DQ exceptions.
WITH eligible AS (SELECT c.restaurant_id FROM whateato_release_cohort_300_v1 c
 JOIN restaurants r ON r.id=c.restaurant_id
 WHERE c.cohort_rank IN(7,8,11,14,16,19,32,35,40,55,56,87,88) AND c.review_state='pending'
 AND r.publication_status='published' AND r.business_status='active'
 AND coalesce(nullif(btrim(r.road_address_ko),''),nullif(btrim(r.lot_address_ko),'')) IS NOT NULL
 AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
 AND NOT EXISTS (SELECT 1 FROM restaurant_data_quality_reviews dq
   WHERE dq.restaurant_id=c.restaurant_id AND dq.review_state IN('pending','confirmed_hold'))
 AND (SELECT count(distinct l.locale) FROM restaurant_localizations l
  WHERE l.restaurant_id=c.restaurant_id AND l.publication_state='review'
  AND l.locale IN('ko','en','ja','zh-CN')
  AND nullif(btrim(l.display_name),'') IS NOT NULL
  AND nullif(btrim(l.short_description),'') IS NOT NULL
  AND l.source_notes LIKE '%https://%')=4
 AND (SELECT count(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id
   AND m.publication_state='published' AND nullif(btrim(m.evidence_ref),'') IS NOT NULL)>0
 AND NOT EXISTS(SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id
   AND m.publication_state='published' AND (
     nullif(btrim(m.evidence_ref),'') IS NULL
     OR (SELECT count(distinct ml.locale) FROM restaurant_menu_localizations ml
       WHERE ml.menu_id=m.id AND ml.locale IN('ko','en','ja','zh-CN')
       AND nullif(btrim(ml.name),'') IS NOT NULL)<>4
   ))
 )
UPDATE restaurant_localizations l
SET publication_state='published',verified_at=now(),updated_at=now()
FROM eligible e WHERE l.restaurant_id=e.restaurant_id
AND l.publication_state='review' AND l.locale IN('ko','en','ja','zh-CN');

-- Approval is only in Neon Staging. No production change.
WITH eligible AS (
 SELECT c.restaurant_id FROM whateato_release_cohort_300_v1 c
 JOIN restaurants r ON r.id=c.restaurant_id
 WHERE c.cohort_rank IN(7,8,11,14,16,19,32,35,40,55,56,87,88) AND c.review_state='pending'
 AND r.publication_status='published' AND r.business_status='active'
 AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q
   WHERE q.restaurant_id=c.restaurant_id AND q.review_state IN('pending','confirmed_hold'))
 AND (SELECT COUNT(DISTINCT l.locale) FROM restaurant_localizations l
   WHERE l.restaurant_id=c.restaurant_id AND l.publication_state='published'
   AND l.locale IN('ko','en','ja','zh-CN') AND
   nullif(btrim(l.short_description),'') IS NOT NULL)=4
 AND (SELECT count(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published')>0
 AND NOT EXISTS(SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id
  AND m.publication_state='published' AND
  (SELECT COUNT(DISTINCT ml.locale) FROM restaurant_menu_localizations ml
  WHERE ml.menu_id=m.id AND ml.locale IN('ko','en','ja','zh-CN') AND nullif(btrim(ml.name),'') IS NOT NULL)<>4)
)
UPDATE whateato_release_cohort_300_v1 c
SET review_state='approved',reviewed_at=now(),
reviewer_note='2026-10-14 staged source-driven 4-locale editorial review (AI-assisted), exact branch menu names and references; owner/merchant live validation not implied. Price snapshots may change.'
FROM eligible e WHERE c.restaurant_id=e.restaurant_id;
