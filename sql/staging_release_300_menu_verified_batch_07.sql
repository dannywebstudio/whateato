-- Staging only. 2 independent address-matching sources/restaurant.
-- Validated candidate menus are NOT an assertion of today's stock or verified price.
-- Existing Seo-chon draft dishes upgrade only when all 4 translations exist.
-- All newly registered dishes have price_krw=NULL (no guesswork).
-- Three existing Seo-chon Myeongga drafts: Seoul municipal restaurant directory confirms all three.
UPDATE restaurant_menus m SET publication_state='published', evidence_ref='https://fsi.seoul.go.kr/front/M0000011/foodsafety/foodMapGuide.do?pageIndex=1&searchKeyword=&srcCggCode=-1&srcCrtfcGbn=20 | https://www.diningcode.com/profile.php?rid=DbMRM7W6D6sl | same-address 자하문로 112, 2026-10-14'
WHERE m.restaurant_id='8c28bddb-8739-42db-a4c5-748b12cdf913'::uuid
 AND m.publication_state='draft'
 AND m.id IN ('b3fb0c4d-ca0c-4ca8-be03-9128c8825615'::uuid,'c9629c5e-45a0-491e-a821-c7e5dfa840a0'::uuid,'aa772940-4a79-446b-893e-d4d75d4d086b'::uuid)
 AND (SELECT COUNT(DISTINCT ml.locale) FROM restaurant_menu_localizations ml
 WHERE ml.menu_id=m.id AND ml.locale IN('ko','en','ja','zh-CN') AND nullif(btrim(ml.name),'') IS NOT NULL)=4;

INSERT INTO restaurant_menus (id,restaurant_id,price_krw,position,publication_state,evidence_ref) VALUES
('00000000-0000-4000-8000-000000009201'::uuid,'f4ff3489-28f9-472d-8d3b-85077809c327'::uuid,NULL,11,'published','https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809 | https://www.diningcode.com/profile.php?rid=poa37lBmMHv3 | branch 새문안로5길 8-1 checked 2026-10-14'),
('00000000-0000-4000-8000-000000009202'::uuid,'f4ff3489-28f9-472d-8d3b-85077809c327'::uuid,NULL,12,'published','https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809 | https://www.diningcode.com/profile.php?rid=poa37lBmMHv3 | branch 새문안로5길 8-1 checked 2026-10-14'),
('00000000-0000-4000-8000-000000009203'::uuid,'f4ff3489-28f9-472d-8d3b-85077809c327'::uuid,NULL,13,'published','https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809 | https://www.diningcode.com/profile.php?rid=poa37lBmMHv3 | branch 새문안로5길 8-1 checked 2026-10-14'),
('00000000-0000-4000-8000-000000009204'::uuid,'cf066202-160e-47fe-a8b2-38697508b857'::uuid,NULL,11,'published','https://www.tabling.co.kr/place/677cd44466de5f06988d183d | https://polle.com/place/2Tq0db/%EC%B9%B4%EB%A6%B0%EC%A7%80%20%EB%A6%B0%EA%B0%80%EB%84%A4 | branch 종로5길 32-3 checked 2026-10-14'),
('00000000-0000-4000-8000-000000009205'::uuid,'cf066202-160e-47fe-a8b2-38697508b857'::uuid,NULL,12,'published','https://www.tabling.co.kr/place/677cd44466de5f06988d183d | https://polle.com/place/2Tq0db/%EC%B9%B4%EB%A6%B0%EC%A7%80%20%EB%A6%B0%EA%B0%80%EB%84%A4 | branch 종로5길 32-3 checked 2026-10-14'),
('00000000-0000-4000-8000-000000009206'::uuid,'cf066202-160e-47fe-a8b2-38697508b857'::uuid,NULL,13,'published','https://www.tabling.co.kr/place/677cd44466de5f06988d183d | https://polle.com/place/2Tq0db/%EC%B9%B4%EB%A6%B0%EC%A7%80%20%EB%A6%B0%EA%B0%80%EB%84%A4 | branch 종로5길 32-3 checked 2026-10-14'),
('00000000-0000-4000-8000-000000009207'::uuid,'cf066202-160e-47fe-a8b2-38697508b857'::uuid,NULL,14,'published','https://www.tabling.co.kr/place/677cd44466de5f06988d183d | https://polle.com/place/2Tq0db/%EC%B9%B4%EB%A6%B0%EC%A7%80%20%EB%A6%B0%EA%B0%80%EB%84%A4 | branch 종로5길 32-3 checked 2026-10-14')
ON CONFLICT (id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name) VALUES
('00000000-0000-4000-8000-000000009201'::uuid,'ko','옛날전통육개장'),
('00000000-0000-4000-8000-000000009201'::uuid,'en','Traditional spicy beef soup'),
('00000000-0000-4000-8000-000000009201'::uuid,'ja','昔ながらのユッケジャン'),
('00000000-0000-4000-8000-000000009201'::uuid,'zh-CN','传统韩式辣牛肉汤'),
('00000000-0000-4000-8000-000000009202'::uuid,'ko','부대육개장'),
('00000000-0000-4000-8000-000000009202'::uuid,'en','Budae-style spicy beef soup'),
('00000000-0000-4000-8000-000000009202'::uuid,'ja','プデユッケジャン'),
('00000000-0000-4000-8000-000000009202'::uuid,'zh-CN','部队风味辣牛肉汤'),
('00000000-0000-4000-8000-000000009203'::uuid,'ko','차돌육개장'),
('00000000-0000-4000-8000-000000009203'::uuid,'en','Beef brisket spicy soup'),
('00000000-0000-4000-8000-000000009203'::uuid,'ja','チャドルバギ入りユッケジャン'),
('00000000-0000-4000-8000-000000009203'::uuid,'zh-CN','牛胸肉辣牛肉汤'),
('00000000-0000-4000-8000-000000009204'::uuid,'ko','카린지점보카츠'),
('00000000-0000-4000-8000-000000009204'::uuid,'en','Karinji jumbo pork cutlet'),
('00000000-0000-4000-8000-000000009204'::uuid,'ja','カリンジ・ジャンボカツ'),
('00000000-0000-4000-8000-000000009204'::uuid,'zh-CN','Karinji大份炸猪排'),
('00000000-0000-4000-8000-000000009205'::uuid,'ko','점보유린카츠'),
('00000000-0000-4000-8000-000000009205'::uuid,'en','Jumbo yurin pork cutlet'),
('00000000-0000-4000-8000-000000009205'::uuid,'ja','ジャンボ油淋カツ'),
('00000000-0000-4000-8000-000000009205'::uuid,'zh-CN','大份油淋炸猪排'),
('00000000-0000-4000-8000-000000009206'::uuid,'ko','가쓰오떡볶이'),
('00000000-0000-4000-8000-000000009206'::uuid,'en','Bonito-flavored tteokbokki'),
('00000000-0000-4000-8000-000000009206'::uuid,'ja','かつお風味トッポッキ'),
('00000000-0000-4000-8000-000000009206'::uuid,'zh-CN','柴鱼风味炒年糕'),
('00000000-0000-4000-8000-000000009207'::uuid,'ko','야끼소바'),
('00000000-0000-4000-8000-000000009207'::uuid,'en','Yakisoba noodles'),
('00000000-0000-4000-8000-000000009207'::uuid,'ja','焼きそば'),
('00000000-0000-4000-8000-000000009207'::uuid,'zh-CN','日式炒面')
ON CONFLICT(menu_id,locale) DO NOTHING;
