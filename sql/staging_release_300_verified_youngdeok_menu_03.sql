-- STAGING ONLY: two independent restaurant-specific listings matched.
-- Verified venue identity: 영덕막회, 서울 중구 을지로3길 33, 3층.
-- Sources show exactly 물회/회덮밥/고등어초절임; preserve NULL prices.
-- Verified means corroborated listings, not guaranteed in-stock today.
UPDATE restaurant_menus m
SET publication_state='published',
 evidence_ref='https://www.tabling.co.kr/place/677cccf366de5f069880117d | https://polle.com/place/23aK92/영덕막회 | cross-checked 2026-10-14 at 을지로3길 33'
WHERE m.restaurant_id='e368e24d-a125-463b-80ba-2b3b90184f5e'::uuid
 AND m.id IN (
   '92b5c0f2-a5ab-4a33-a7ad-f6fc0e0a2713'::uuid,
   '1f82c693-0a6f-463e-a786-41a6b3aa9316'::uuid,
   '07b699fa-8b7c-4bb6-84dd-6aa3cfa73fe8'::uuid
 )
 AND m.publication_state='draft'
 AND (SELECT count(DISTINCT ml.locale)
      FROM restaurant_menu_localizations ml
      WHERE ml.menu_id=m.id AND ml.locale IN('ko','en','ja','zh-CN')
      AND nullif(btrim(ml.name),'') IS NOT NULL)=4;
