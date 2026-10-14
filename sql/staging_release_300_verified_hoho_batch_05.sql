-- STAGING ONLY: official brand dishes plus same-address, same-branch Polle corroboration. No prices.
INSERT INTO restaurant_menus(id,restaurant_id,price_krw,position,publication_state,evidence_ref) VALUES
('a2c68d97-b095-445a-8b34-562040f42a2e'::uuid,'58a03e79-6fe5-4076-a097-367caf150dec'::uuid,NULL,11,'published','https://hohosikdang.com/메뉴-소개/ | https://polle.com/place/3hH2R0/호호식당 | branch 대학로9길 35 verified 2026-10-14'),
('e98a9442-f1b3-413a-9767-1d77e6150720'::uuid,'58a03e79-6fe5-4076-a097-367caf150dec'::uuid,NULL,12,'published','https://hohosikdang.com/메뉴-소개/ | https://polle.com/place/3hH2R0/호호식당 | branch 대학로9길 35 verified 2026-10-14')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name) VALUES
('a2c68d97-b095-445a-8b34-562040f42a2e'::uuid,'ko','사케동'),
('a2c68d97-b095-445a-8b34-562040f42a2e'::uuid,'en','Salmon rice bowl'),
('a2c68d97-b095-445a-8b34-562040f42a2e'::uuid,'ja','サーモン丼（サケ丼）'),
('a2c68d97-b095-445a-8b34-562040f42a2e'::uuid,'zh-CN','三文鱼盖饭'),
('e98a9442-f1b3-413a-9767-1d77e6150720'::uuid,'ko','오므라이스'),
('e98a9442-f1b3-413a-9767-1d77e6150720'::uuid,'en','Omurice (omelet rice)'),
('e98a9442-f1b3-413a-9767-1d77e6150720'::uuid,'ja','オムライス'),
('e98a9442-f1b3-413a-9767-1d77e6150720'::uuid,'zh-CN','蛋包饭')
ON CONFLICT(menu_id,locale) DO NOTHING;

UPDATE restaurant_menus m SET publication_state='published',evidence_ref='https://hohosikdang.com/메뉴-소개/ | https://polle.com/place/3hH2R0/호호식당 | branch 대학로9길 35 verified 2026-10-14'
WHERE m.restaurant_id='58a03e79-6fe5-4076-a097-367caf150dec'::uuid
 AND m.id IN ('87abc6f0-a1e5-4566-a7ea-d4168d473a8f'::uuid,'75c273fe-2f39-4f15-abd6-e1185370714d'::uuid)
 AND m.publication_state='draft'
 AND (SELECT count(distinct ml.locale) FROM restaurant_menu_localizations ml
 WHERE ml.menu_id=m.id AND nullif(btrim(ml.name),'') IS NOT NULL)=4;

UPDATE whateato_release_menu_candidate_v1 candidate
SET branch_verified=true,review_state='verified_for_branch',
evidence_note=candidate.evidence_note||' / 2026-10-14 branch menu independently corroborated with official Hoho brand + same-address Polle listing; price remains unverified'
WHERE candidate.restaurant_id='58a03e79-6fe5-4076-a097-367caf150dec'::uuid
 AND candidate.menu_name_ko IN ('로스가츠정식','오므라이스','사케동')
 AND candidate.review_state='pending'
 AND EXISTS(SELECT 1 FROM restaurant_menus m JOIN restaurant_menu_localizations ml
 ON ml.menu_id=m.id AND ml.locale='ko'
 WHERE m.restaurant_id=candidate.restaurant_id AND m.publication_state='published' AND ml.name=candidate.menu_name_ko);
