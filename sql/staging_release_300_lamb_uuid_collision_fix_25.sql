-- STAGING ONLY. Repair previously collided fixed UUIDs; INSERT was safely ignored by ON CONFLICT. No existing rows changed.
-- New fixed UUIDs explicitly avoid the Bukchon source menu IDs.
INSERT INTO restaurant_menus(id,restaurant_id,price_krw,position,publication_state,evidence_ref)
VALUES ('00000000-0000-4000-8000-000000009951'::uuid,'26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,32000,60,'published','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact address 삼일대로17길 42-1, listed price checked 2026-10-14'),
('00000000-0000-4000-8000-000000009952'::uuid,'26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,35000,61,'published','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact address 삼일대로17길 42-1, listed price checked 2026-10-14'),
('00000000-0000-4000-8000-000000009953'::uuid,'26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,22000,62,'published','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact address 삼일대로17길 42-1, listed price checked 2026-10-14'),
('00000000-0000-4000-8000-000000009954'::uuid,'26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,32000,63,'published','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact address 삼일대로17길 42-1, listed price checked 2026-10-14')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
VALUES ('00000000-0000-4000-8000-000000009951'::uuid,'ko','명가양갈비'),
('00000000-0000-4000-8000-000000009951'::uuid,'en','Signature lamb ribs'),
('00000000-0000-4000-8000-000000009951'::uuid,'ja','名家ラムカルビ'),
('00000000-0000-4000-8000-000000009951'::uuid,'zh-CN','招牌羊排'),
('00000000-0000-4000-8000-000000009952'::uuid,'ko','프렌치랙'),
('00000000-0000-4000-8000-000000009952'::uuid,'en','French rack of lamb'),
('00000000-0000-4000-8000-000000009952'::uuid,'ja','ラムフレンチラック'),
('00000000-0000-4000-8000-000000009952'::uuid,'zh-CN','法式羊排'),
('00000000-0000-4000-8000-000000009953'::uuid,'ko','양갈비살'),
('00000000-0000-4000-8000-000000009953'::uuid,'en','Boneless lamb rib meat'),
('00000000-0000-4000-8000-000000009953'::uuid,'ja','骨なしラムカルビ'),
('00000000-0000-4000-8000-000000009953'::uuid,'zh-CN','去骨羊肋肉'),
('00000000-0000-4000-8000-000000009954'::uuid,'ko','마라샹궈'),
('00000000-0000-4000-8000-000000009954'::uuid,'en','Mala xiang guo'),
('00000000-0000-4000-8000-000000009954'::uuid,'ja','マーラーシャングオ'),
('00000000-0000-4000-8000-000000009954'::uuid,'zh-CN','麻辣香锅')
ON CONFLICT(menu_id,locale) DO NOTHING;

INSERT INTO whateato_menu_price_observations_v1(menu_id,source_url,price_krw,checked_on,observation_note)
VALUES ('00000000-0000-4000-8000-000000009951'::uuid,'https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84',32000,'2026-10-14','Exact-source listed price; current in-store amount may differ. Reissued distinct menu UUID after collision check.'),
('00000000-0000-4000-8000-000000009952'::uuid,'https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84',35000,'2026-10-14','Exact-source listed price; current in-store amount may differ. Reissued distinct menu UUID after collision check.'),
('00000000-0000-4000-8000-000000009953'::uuid,'https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84',22000,'2026-10-14','Exact-source listed price; current in-store amount may differ. Reissued distinct menu UUID after collision check.'),
('00000000-0000-4000-8000-000000009954'::uuid,'https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84',32000,'2026-10-14','Exact-source listed price; current in-store amount may differ. Reissued distinct menu UUID after collision check.')
ON CONFLICT(menu_id,source_url) DO NOTHING;

UPDATE restaurant_localizations l SET publication_state='published',verified_at=now(),updated_at=now()
WHERE restaurant_id='26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid AND publication_state='review'
AND (SELECT COUNT(DISTINCT locale) FROM restaurant_localizations ll WHERE ll.restaurant_id=l.restaurant_id
AND ll.locale IN('ko','en','ja','zh-CN') AND ll.publication_state='review'
AND ll.source_notes LIKE '%https://%')=4
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=l.restaurant_id AND m.publication_state='published' AND m.price_krw IS NOT NULL)=4
AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=l.restaurant_id AND q.review_state IN('pending','confirmed_hold'));

UPDATE whateato_release_cohort_300_v1 c SET review_state='approved',reviewed_at=now(),
reviewer_note='Exact-address Polle + Tabling corroboration; 4 four-locale menu dishes with price source, localized descriptions reviewed 2026-10-14. Staging only.'
WHERE restaurant_id='26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid AND review_state='pending'
AND (SELECT COUNT(*) FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id
AND l.locale IN('ko','en','ja','zh-CN') AND l.publication_state='published')=4
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published')=4
AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=c.restaurant_id AND q.review_state IN('pending','confirmed_hold'));
