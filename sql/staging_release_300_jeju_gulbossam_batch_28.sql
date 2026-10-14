-- STAGING ONLY. Three independent sources identified restaurant at Supyo-ro 20-gil 34.
-- Separate exact branch price observations. Do not modify ratings/photos/production.
INSERT INTO restaurant_menus(id,restaurant_id,price_krw,position,publication_state,evidence_ref)
SELECT d.id::uuid,'882bd924-0808-4bbb-910c-f8b1d0d07c9c'::uuid,d.price_krw,d.position,'published','https://www.diningcode.com/profile.php?rid=GjDI9LnISr49 | https://dokdokplace.kr/stores/i2/i201/i20103/seoul/jongno-gu/%EC%A2%85%EB%A1%9C1.2.3.4%EA%B0%80%EB%8F%99/ | source identity verified at 34 Supyo-ro 20-gil, 2026-10-14; price snapshot not real-time guarantee'
FROM (VALUES ('7af19320-2b1e-4f8b-9b6f-900202610001',44000,100),('7af19320-2b1e-4f8b-9b6f-900202610002',44000,101),('7af19320-2b1e-4f8b-9b6f-900202610003',45000,102),('7af19320-2b1e-4f8b-9b6f-900202610004',35000,103)) d(id,price_krw,position)
WHERE EXISTS(SELECT 1 FROM whateato_release_cohort_300_v1 c JOIN restaurants r ON r.id=c.restaurant_id
 WHERE c.restaurant_id='882bd924-0808-4bbb-910c-f8b1d0d07c9c'::uuid AND c.review_state='pending'
 AND r.name_ko='제주 굴 보쌈' AND r.road_address_ko LIKE '%수표로20길 34%')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
SELECT d.menu_id::uuid,d.locale,d.name
FROM (VALUES ('7af19320-2b1e-4f8b-9b6f-900202610001','ko','굴보쌈 대'),
('7af19320-2b1e-4f8b-9b6f-900202610001','en','Oyster bossam, large'),
('7af19320-2b1e-4f8b-9b6f-900202610001','ja','牡蠣ポッサム（大）'),
('7af19320-2b1e-4f8b-9b6f-900202610001','zh-CN','生蚝菜包肉（大份）'),
('7af19320-2b1e-4f8b-9b6f-900202610002','ko','족발 대'),
('7af19320-2b1e-4f8b-9b6f-900202610002','en','Braised pork trotters, large'),
('7af19320-2b1e-4f8b-9b6f-900202610002','ja','チョッパル（大）'),
('7af19320-2b1e-4f8b-9b6f-900202610002','zh-CN','韩式酱猪蹄（大份）'),
('7af19320-2b1e-4f8b-9b6f-900202610003','ko','족발+보쌈'),
('7af19320-2b1e-4f8b-9b6f-900202610003','en','Pork trotters and bossam platter'),
('7af19320-2b1e-4f8b-9b6f-900202610003','ja','チョッパルとポッサムの盛り合わせ'),
('7af19320-2b1e-4f8b-9b6f-900202610003','zh-CN','韩式猪蹄与菜包肉拼盘'),
('7af19320-2b1e-4f8b-9b6f-900202610004','ko','아구찜 소'),
('7af19320-2b1e-4f8b-9b6f-900202610004','en','Spicy braised monkfish, small'),
('7af19320-2b1e-4f8b-9b6f-900202610004','ja','アグチム（アンコウの辛蒸し・小）'),
('7af19320-2b1e-4f8b-9b6f-900202610004','zh-CN','辣炖安康鱼（小份）')) d(menu_id,locale,name)
JOIN restaurant_menus m ON m.id=d.menu_id::uuid AND m.restaurant_id='882bd924-0808-4bbb-910c-f8b1d0d07c9c'::uuid
ON CONFLICT(menu_id,locale) DO NOTHING;

INSERT INTO whateato_menu_price_observations_v1(menu_id,source_url,price_krw,checked_on,observation_note)
SELECT d.menu_id::uuid,'https://www.diningcode.com/profile.php?rid=GjDI9LnISr49',d.price_krw,'2026-10-14'::date,
'Exact same-address dining listing; snapshot price may differ from the store today'
FROM (VALUES ('7af19320-2b1e-4f8b-9b6f-900202610001',44000),('7af19320-2b1e-4f8b-9b6f-900202610002',44000),('7af19320-2b1e-4f8b-9b6f-900202610003',45000),('7af19320-2b1e-4f8b-9b6f-900202610004',35000)) d(menu_id,price_krw)
JOIN restaurant_menus m ON m.id=d.menu_id::uuid AND m.restaurant_id='882bd924-0808-4bbb-910c-f8b1d0d07c9c'::uuid
ON CONFLICT(menu_id,source_url) DO NOTHING;

WITH e(locale,display_name,short_description) AS (VALUES
('ko','제주 굴 보쌈','서울 종로구 수표로20길 34의 굴보쌈·족발 전문 식당입니다. 공개 메뉴에는 굴보쌈, 족발, 보쌈과 매콤한 아구찜 등이 안내되어 있습니다.'),
('en','Jeju Gul Bossam','A Korean bossam and pork-trotter restaurant at 34 Supyo-ro 20-gil in Jongno. Listings for this exact address include oyster bossam, pork trotters, a mixed platter and spicy braised monkfish.'),
('ja','チェジュ・クルポッサム','ソウル・鍾路区水標路20ギル34にあるポッサムと豚足料理の店。同じ住所のメニューには牡蠣ポッサム、チョッパル、盛り合わせ、アンコウの辛蒸しなどがあります。'),
('zh-CN','Jeju Gul Bossam','位于首尔钟路区水标路20街34号的韩式菜包肉和猪蹄餐厅。该地址公开菜单包括生蚝菜包肉、韩式猪蹄、拼盘及辣炖安康鱼。')
)
UPDATE restaurant_localizations l SET display_name=e.display_name,short_description=e.short_description,
publication_state='review',source_notes='https://www.diningcode.com/profile.php?rid=GjDI9LnISr49 | https://dokdokplace.kr/stores/i2/i201/i20103/seoul/jongno-gu/%EC%A2%85%EB%A1%9C1.2.3.4%EA%B0%80%EB%8F%99/ | source identity verified at 34 Supyo-ro 20-gil, 2026-10-14; price snapshot not real-time guarantee',updated_at=now()
FROM e WHERE l.restaurant_id='882bd924-0808-4bbb-910c-f8b1d0d07c9c'::uuid AND l.locale=e.locale
AND l.publication_state='draft'
AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%';

UPDATE restaurant_localizations l SET publication_state='published',verified_at=now(),updated_at=now()
WHERE l.restaurant_id='882bd924-0808-4bbb-910c-f8b1d0d07c9c'::uuid AND l.publication_state='review'
AND (SELECT COUNT(DISTINCT locale) FROM restaurant_localizations x
 WHERE x.restaurant_id=l.restaurant_id AND x.locale IN('ko','en','ja','zh-CN')
 AND x.publication_state='review' AND x.source_notes LIKE '%https://%'
 AND NULLIF(BTRIM(x.display_name),'') IS NOT NULL AND NULLIF(BTRIM(x.short_description),'') IS NOT NULL)=4
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=l.restaurant_id AND m.publication_state='published' AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL)=4
AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q
 WHERE q.restaurant_id=l.restaurant_id AND q.review_state IN('pending','confirmed_hold'));

UPDATE whateato_release_cohort_300_v1 c
SET review_state='approved',reviewed_at=now(),reviewer_note='Staging-only AI-assisted source validation 2026-10-14: matching official store address + branch-priced menu listing, four-language descriptions. No live availability/price guarantee.'
WHERE c.restaurant_id='882bd924-0808-4bbb-910c-f8b1d0d07c9c'::uuid AND c.review_state='pending'
AND (SELECT COUNT(*) FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id AND l.publication_state='published' AND l.locale IN('ko','en','ja','zh-CN'))=4
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published')=4
AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=c.restaurant_id AND q.review_state IN('pending','confirmed_hold'));
