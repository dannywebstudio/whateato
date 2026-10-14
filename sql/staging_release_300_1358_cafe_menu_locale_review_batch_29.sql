-- Staging only, one cafe coffee menu with observed price and 4 locale editorial review. 
-- Hour data suspicious (08:30-09:00) so keep venue pending; no photos/ratings/Google calls.
INSERT INTO restaurant_menus(id,restaurant_id,price_krw,position,publication_state,evidence_ref)
SELECT '5f9d8c72-19ea-43f8-8505-202610140135'::uuid,'e1a72bf5-7698-4136-8952-8cbfc0b5dc6d'::uuid,2500,110,'published','https://www.diningcode.com/profile.php?rid=8zV1q7lmULH6 | https://www.koobig.com/494496 | checked same road address 돈화문로8길 26 on 2026-10-14; current opening hours not verified'
WHERE EXISTS (SELECT 1 FROM whateato_release_cohort_300_v1 c JOIN restaurants r ON c.restaurant_id=r.id
WHERE c.restaurant_id='e1a72bf5-7698-4136-8952-8cbfc0b5dc6d'::uuid AND c.review_state='pending' AND r.name_ko='1358'
 AND r.road_address_ko LIKE '%돈화문로8길 26%')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
SELECT '5f9d8c72-19ea-43f8-8505-202610140135'::uuid,v.locale,v.name
FROM (VALUES ('ko','커피'),('en','Coffee'),('ja','コーヒー'),('zh-CN','咖啡')) v(locale,name)
JOIN restaurant_menus m ON m.id='5f9d8c72-19ea-43f8-8505-202610140135'::uuid AND m.restaurant_id='e1a72bf5-7698-4136-8952-8cbfc0b5dc6d'::uuid
ON CONFLICT(menu_id,locale) DO NOTHING;

INSERT INTO whateato_menu_price_observations_v1(menu_id,source_url,price_krw,checked_on,observation_note)
SELECT '5f9d8c72-19ea-43f8-8505-202610140135'::uuid,'https://www.diningcode.com/profile.php?rid=8zV1q7lmULH6',2500,'2026-10-14'::date,
 'DiningCode single-entry generic coffee price; not a current store price guarantee.'
WHERE EXISTS(SELECT 1 FROM restaurant_menus m WHERE m.id='5f9d8c72-19ea-43f8-8505-202610140135'::uuid AND m.restaurant_id='e1a72bf5-7698-4136-8952-8cbfc0b5dc6d'::uuid)
ON CONFLICT(menu_id,source_url) DO NOTHING;

WITH edits(locale,display_name,short_description) AS(VALUES
('ko','1358','서울 종로구 돈화문로8길 26의 카페입니다. 공개 자료에는 커피 메뉴가 안내되어 있으며, 현재 영업시간과 상세 메뉴는 추가 확인이 필요합니다.'),
('en','1358 Cafe','A café at 26 Donhwamun-ro 8-gil in Jongno, Seoul. Coffee appears in public menu listings; current hours and the full menu still require verification.'),
('ja','1358カフェ','ソウル・鍾路区敦化門路8ギル26にあるカフェ。公開情報にはコーヒーが掲載されていますが、現在の営業時間と詳細メニューは確認中です。'),
('zh-CN','1358 咖啡馆','位于首尔钟路区敦化门路8街26号的咖啡馆。公开菜单资料列有咖啡，现行营业时间及完整菜单仍需进一步核实。')
)
UPDATE restaurant_localizations l SET display_name=e.display_name,short_description=e.short_description,
source_notes='https://www.diningcode.com/profile.php?rid=8zV1q7lmULH6 | https://www.koobig.com/494496 | editorial review, hours not verified',publication_state='review',updated_at=now()
FROM edits e WHERE l.restaurant_id='e1a72bf5-7698-4136-8952-8cbfc0b5dc6d'::uuid AND l.locale=e.locale
AND l.publication_state='draft' AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%';
