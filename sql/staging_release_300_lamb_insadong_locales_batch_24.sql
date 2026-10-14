-- Staging only. Four-locale source-backed editorial promotion for two conflict-free venues.
WITH edits(restaurant_id,locale,display_name,short_description,source_notes) AS (VALUES
('26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,'ko','명가양갈비','서울 종로구 삼일대로17길 42-1의 양갈비 전문점입니다. 명가양갈비, 프렌치랙, 양갈비살 등 양고기 메뉴와 마라샹궈가 안내되어 있습니다.','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact branch description cross-check 2026-10-14'),
('26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,'en','Myeongga Lamb Ribs','A lamb restaurant on Samil-daero 17-gil in Jongno. Its listed dishes include signature lamb ribs, French racks of lamb, boneless lamb rib meat, and mala xiang guo.','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact branch description cross-check 2026-10-14'),
('26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,'ja','名家ヤンカルビ','ソウル・鍾路区三一路17ギルにあるラム料理店。ラムカルビ、フレンチラック、骨なしラムカルビ、マーラーシャングオなどがメニューに掲載されています。','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact branch description cross-check 2026-10-14'),
('26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,'zh-CN','Myeongga 羊排','位于首尔钟路区三一路17街的羊肉餐厅。公开菜单包括招牌羊排、法式羊排、去骨羊肋肉和麻辣香锅。','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact branch description cross-check 2026-10-14'),
('b3e49c75-c416-4331-bad4-49e533bd2528'::uuid,'ko','인사동6842 고기밥상','서울 종로구 인사동길 30-14에 있는 숯불 고기정식 식당입니다. 참숯 돼지불고기 정식, 매콤 제육볶음 정식, 소불고기·갈비 정식 등을 안내하고 있습니다.','https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 | https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE | exact branch description cross-check 2026-10-14'),
('b3e49c75-c416-4331-bad4-49e533bd2528'::uuid,'en','Insadong 6842 Gogi Bapsang','A charcoal-grilled meat set-meal restaurant on Insadong-gil in Jongno. Listed set meals include pork bulgogi, spicy stir-fried pork, beef bulgogi, and grilled pork or beef ribs.','https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 | https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE | exact branch description cross-check 2026-10-14'),
('b3e49c75-c416-4331-bad4-49e533bd2528'::uuid,'ja','仁寺洞6842 コギパプサン','ソウル・鍾路区仁寺洞ギルにある炭火焼き肉定食の店。豚プルコギ、辛口豚肉炒め、牛プルコギ、豚・牛カルビの定食が掲載されています。','https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 | https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE | exact branch description cross-check 2026-10-14'),
('b3e49c75-c416-4331-bad4-49e533bd2528'::uuid,'zh-CN','仁寺洞6842烤肉套餐店','位于首尔钟路区仁寺洞街的炭火烤肉套餐店。菜单包括猪肉烤肉套餐、辣炒猪肉套餐、牛肉烤肉套餐以及烤猪排骨和牛排骨套餐。','https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 | https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE | exact branch description cross-check 2026-10-14')
)
UPDATE restaurant_localizations l SET display_name=e.display_name,short_description=e.short_description,source_notes=e.source_notes,publication_state='review',updated_at=now()
FROM edits e WHERE l.restaurant_id=e.restaurant_id AND l.locale=e.locale AND l.publication_state='draft'
 AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%';

UPDATE restaurant_localizations l SET publication_state='published',verified_at=now(),updated_at=now()
WHERE l.restaurant_id IN ('26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,'b3e49c75-c416-4331-bad4-49e533bd2528'::uuid) AND l.publication_state='review'
AND (SELECT COUNT(DISTINCT loc.locale) FROM restaurant_localizations loc WHERE loc.restaurant_id=l.restaurant_id AND loc.publication_state='review'
 AND loc.locale IN('ko','en','ja','zh-CN') AND loc.source_notes LIKE '%https://%'
 AND NULLIF(BTRIM(loc.display_name),'') IS NOT NULL AND NULLIF(BTRIM(loc.short_description),'') IS NOT NULL)=4
AND (SELECT count(*) FROM restaurant_menus m WHERE m.restaurant_id=l.restaurant_id AND m.publication_state='published' AND m.price_krw IS NOT NULL AND m.evidence_ref LIKE '%https://%')>=3
AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=l.restaurant_id AND q.review_state IN('pending','confirmed_hold'));

UPDATE whateato_release_cohort_300_v1 c SET review_state='approved',reviewed_at=now(),
reviewer_note='AI-assisted exact branch menus and translated descriptions source-checked 2026-10-14. Price is an observed listing, not a real-time promise. Staging only.'
WHERE c.restaurant_id IN ('26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,'b3e49c75-c416-4331-bad4-49e533bd2528'::uuid) AND c.review_state='pending'
AND (SELECT COUNT(DISTINCT locale) FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id
 AND l.publication_state='published' AND l.locale IN('ko','en','ja','zh-CN'))=4
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published')>=3
AND NOT EXISTS (SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=c.restaurant_id AND q.review_state IN('pending','confirmed_hold'))
AND NOT EXISTS(SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published'
 AND (SELECT COUNT(DISTINCT ml.locale) FROM restaurant_menu_localizations ml WHERE ml.menu_id=m.id AND ml.locale IN('ko','en','ja','zh-CN'))<>4);
