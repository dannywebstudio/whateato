-- STAGING ONLY. 9 source-prices & translations for two exact-address venues, no photos/ratings.
INSERT INTO restaurant_menus(id,restaurant_id,price_krw,position,publication_state,evidence_ref) VALUES
('00000000-0000-4000-8000-000000009911'::uuid,'26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,32000,60,'published','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact address 삼일대로17길 42-1 and menu price checked 2026-10-14; historical snapshot'),
('00000000-0000-4000-8000-000000009912'::uuid,'26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,35000,61,'published','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact address 삼일대로17길 42-1 and menu price checked 2026-10-14; historical snapshot'),
('00000000-0000-4000-8000-000000009913'::uuid,'26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,22000,62,'published','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact address 삼일대로17길 42-1 and menu price checked 2026-10-14; historical snapshot'),
('00000000-0000-4000-8000-000000009914'::uuid,'26e2609e-13fa-4676-b4d8-66a561ea22d3'::uuid,32000,63,'published','https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84 | https://www.tabling.co.kr/place/677cd7f366de5f069893a469 | exact address 삼일대로17길 42-1 and menu price checked 2026-10-14; historical snapshot'),
('00000000-0000-4000-8000-000000009921'::uuid,'b3e49c75-c416-4331-bad4-49e533bd2528'::uuid,12000,60,'published','https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 | https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE | exact address 인사동길 30-14 and menu price checked 2026-10-14; historical snapshot'),
('00000000-0000-4000-8000-000000009922'::uuid,'b3e49c75-c416-4331-bad4-49e533bd2528'::uuid,12000,61,'published','https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 | https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE | exact address 인사동길 30-14 and menu price checked 2026-10-14; historical snapshot'),
('00000000-0000-4000-8000-000000009923'::uuid,'b3e49c75-c416-4331-bad4-49e533bd2528'::uuid,14000,62,'published','https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 | https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE | exact address 인사동길 30-14 and menu price checked 2026-10-14; historical snapshot'),
('00000000-0000-4000-8000-000000009924'::uuid,'b3e49c75-c416-4331-bad4-49e533bd2528'::uuid,16000,63,'published','https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 | https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE | exact address 인사동길 30-14 and menu price checked 2026-10-14; historical snapshot'),
('00000000-0000-4000-8000-000000009925'::uuid,'b3e49c75-c416-4331-bad4-49e533bd2528'::uuid,21000,64,'published','https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 | https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE | exact address 인사동길 30-14 and menu price checked 2026-10-14; historical snapshot')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name) VALUES
('00000000-0000-4000-8000-000000009911'::uuid,'ko','명가양갈비'),
('00000000-0000-4000-8000-000000009911'::uuid,'en','Signature lamb ribs'),
('00000000-0000-4000-8000-000000009911'::uuid,'ja','名家ラムカルビ'),
('00000000-0000-4000-8000-000000009911'::uuid,'zh-CN','招牌羊排'),
('00000000-0000-4000-8000-000000009912'::uuid,'ko','프렌치랙'),
('00000000-0000-4000-8000-000000009912'::uuid,'en','French rack of lamb'),
('00000000-0000-4000-8000-000000009912'::uuid,'ja','ラムフレンチラック'),
('00000000-0000-4000-8000-000000009912'::uuid,'zh-CN','法式羊排'),
('00000000-0000-4000-8000-000000009913'::uuid,'ko','양갈비살'),
('00000000-0000-4000-8000-000000009913'::uuid,'en','Boneless lamb rib meat'),
('00000000-0000-4000-8000-000000009913'::uuid,'ja','骨なしラムカルビ'),
('00000000-0000-4000-8000-000000009913'::uuid,'zh-CN','去骨羊肋肉'),
('00000000-0000-4000-8000-000000009914'::uuid,'ko','마라샹궈'),
('00000000-0000-4000-8000-000000009914'::uuid,'en','Mala xiang guo'),
('00000000-0000-4000-8000-000000009914'::uuid,'ja','マーラーシャングオ'),
('00000000-0000-4000-8000-000000009914'::uuid,'zh-CN','麻辣香锅'),
('00000000-0000-4000-8000-000000009921'::uuid,'ko','참숯 돼지불고기 정식'),
('00000000-0000-4000-8000-000000009921'::uuid,'en','Charcoal-grilled pork bulgogi set'),
('00000000-0000-4000-8000-000000009921'::uuid,'ja','炭火豚プルコギ定食'),
('00000000-0000-4000-8000-000000009921'::uuid,'zh-CN','炭烤猪肉套餐'),
('00000000-0000-4000-8000-000000009922'::uuid,'ko','매콤 제육볶음 정식'),
('00000000-0000-4000-8000-000000009922'::uuid,'en','Spicy stir-fried pork set'),
('00000000-0000-4000-8000-000000009922'::uuid,'ja','辛口豚肉炒め定食'),
('00000000-0000-4000-8000-000000009922'::uuid,'zh-CN','韩式辣炒猪肉套餐'),
('00000000-0000-4000-8000-000000009923'::uuid,'ko','참숯 소불고기 정식'),
('00000000-0000-4000-8000-000000009923'::uuid,'en','Charcoal-grilled beef bulgogi set'),
('00000000-0000-4000-8000-000000009923'::uuid,'ja','炭火牛プルコギ定食'),
('00000000-0000-4000-8000-000000009923'::uuid,'zh-CN','炭烤牛肉套餐'),
('00000000-0000-4000-8000-000000009924'::uuid,'ko','참숯 돼지갈비 정식'),
('00000000-0000-4000-8000-000000009924'::uuid,'en','Charcoal-grilled pork ribs set'),
('00000000-0000-4000-8000-000000009924'::uuid,'ja','炭火豚カルビ定食'),
('00000000-0000-4000-8000-000000009924'::uuid,'zh-CN','炭烤猪排骨套餐'),
('00000000-0000-4000-8000-000000009925'::uuid,'ko','참숯 소갈비 정식'),
('00000000-0000-4000-8000-000000009925'::uuid,'en','Charcoal-grilled beef short ribs set'),
('00000000-0000-4000-8000-000000009925'::uuid,'ja','炭火牛カルビ定食'),
('00000000-0000-4000-8000-000000009925'::uuid,'zh-CN','炭烤牛排骨套餐')
ON CONFLICT(menu_id,locale) DO NOTHING;

INSERT INTO whateato_menu_price_observations_v1(menu_id,source_url,price_krw,checked_on,observation_note) VALUES
('00000000-0000-4000-8000-000000009911'::uuid,'https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84',32000,'2026-10-14','Published menu listing for matching restaurant/address. Not a guarantee of current price.'),
('00000000-0000-4000-8000-000000009912'::uuid,'https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84',35000,'2026-10-14','Published menu listing for matching restaurant/address. Not a guarantee of current price.'),
('00000000-0000-4000-8000-000000009913'::uuid,'https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84',22000,'2026-10-14','Published menu listing for matching restaurant/address. Not a guarantee of current price.'),
('00000000-0000-4000-8000-000000009914'::uuid,'https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84',32000,'2026-10-14','Published menu listing for matching restaurant/address. Not a guarantee of current price.'),
('00000000-0000-4000-8000-000000009921'::uuid,'https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8',12000,'2026-10-14','Published menu listing for matching restaurant/address. Not a guarantee of current price.'),
('00000000-0000-4000-8000-000000009922'::uuid,'https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8',12000,'2026-10-14','Published menu listing for matching restaurant/address. Not a guarantee of current price.'),
('00000000-0000-4000-8000-000000009923'::uuid,'https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8',14000,'2026-10-14','Published menu listing for matching restaurant/address. Not a guarantee of current price.'),
('00000000-0000-4000-8000-000000009924'::uuid,'https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8',16000,'2026-10-14','Published menu listing for matching restaurant/address. Not a guarantee of current price.'),
('00000000-0000-4000-8000-000000009925'::uuid,'https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8',21000,'2026-10-14','Published menu listing for matching restaurant/address. Not a guarantee of current price.')
ON CONFLICT(menu_id,source_url) DO NOTHING;
