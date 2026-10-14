-- STAGING ONLY. Tour bureau and two branch-address-matched menu pages. 4 language menu labels, price snapshots.
INSERT INTO restaurant_menus(id,restaurant_id,price_krw,position,publication_state,evidence_ref) VALUES
('00000000-0000-4000-8000-000000009801'::uuid,'c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,35000,35,'published','https://www.tabling.co.kr/place/677cc7a066de5f069875108d | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | address 창경궁로 269-1 matched to public tourism https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192; checked 2026-10-14, prices are published snapshots'),
('00000000-0000-4000-8000-000000009802'::uuid,'c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,45000,36,'published','https://www.tabling.co.kr/place/677cc7a066de5f069875108d | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | address 창경궁로 269-1 matched to public tourism https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192; checked 2026-10-14, prices are published snapshots'),
('00000000-0000-4000-8000-000000009803'::uuid,'c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,55000,37,'published','https://www.tabling.co.kr/place/677cc7a066de5f069875108d | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | address 창경궁로 269-1 matched to public tourism https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192; checked 2026-10-14, prices are published snapshots'),
('00000000-0000-4000-8000-000000009804'::uuid,'c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,80000,38,'published','https://www.tabling.co.kr/place/677cc7a066de5f069875108d | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | address 창경궁로 269-1 matched to public tourism https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192; checked 2026-10-14, prices are published snapshots'),
('00000000-0000-4000-8000-000000009805'::uuid,'c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,80000,39,'published','https://www.tabling.co.kr/place/677cc7a066de5f069875108d | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | address 창경궁로 269-1 matched to public tourism https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192; checked 2026-10-14, prices are published snapshots'),
('00000000-0000-4000-8000-000000009806'::uuid,'c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,26000,40,'published','https://www.tabling.co.kr/place/677cc7a066de5f069875108d | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | address 창경궁로 269-1 matched to public tourism https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192; checked 2026-10-14, prices are published snapshots')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name) VALUES
('00000000-0000-4000-8000-000000009801'::uuid,'ko','A코스'),
('00000000-0000-4000-8000-000000009801'::uuid,'en','Course A'),
('00000000-0000-4000-8000-000000009801'::uuid,'ja','Aコース'),
('00000000-0000-4000-8000-000000009801'::uuid,'zh-CN','A套餐'),
('00000000-0000-4000-8000-000000009802'::uuid,'ko','B코스'),
('00000000-0000-4000-8000-000000009802'::uuid,'en','Course B'),
('00000000-0000-4000-8000-000000009802'::uuid,'ja','Bコース'),
('00000000-0000-4000-8000-000000009802'::uuid,'zh-CN','B套餐'),
('00000000-0000-4000-8000-000000009803'::uuid,'ko','C코스'),
('00000000-0000-4000-8000-000000009803'::uuid,'en','Course C'),
('00000000-0000-4000-8000-000000009803'::uuid,'ja','Cコース'),
('00000000-0000-4000-8000-000000009803'::uuid,'zh-CN','C套餐'),
('00000000-0000-4000-8000-000000009804'::uuid,'ko','전가복'),
('00000000-0000-4000-8000-000000009804'::uuid,'en','Jeongabok (premium seafood and vegetables)'),
('00000000-0000-4000-8000-000000009804'::uuid,'ja','全家福（海鮮と野菜の炒め物）'),
('00000000-0000-4000-8000-000000009804'::uuid,'zh-CN','全家福（海鲜什锦）'),
('00000000-0000-4000-8000-000000009805'::uuid,'ko','5가지냉채'),
('00000000-0000-4000-8000-000000009805'::uuid,'en','Five cold appetizers'),
('00000000-0000-4000-8000-000000009805'::uuid,'ja','五種の前菜盛り合わせ'),
('00000000-0000-4000-8000-000000009805'::uuid,'zh-CN','五味冷盘'),
('00000000-0000-4000-8000-000000009806'::uuid,'ko','탕수육'),
('00000000-0000-4000-8000-000000009806'::uuid,'en','Sweet-and-sour pork'),
('00000000-0000-4000-8000-000000009806'::uuid,'ja','酢豚'),
('00000000-0000-4000-8000-000000009806'::uuid,'zh-CN','糖醋肉')
ON CONFLICT(menu_id,locale) DO NOTHING;

INSERT INTO whateato_menu_price_observations_v1(menu_id,source_url,price_krw,checked_on,observation_note) VALUES
('00000000-0000-4000-8000-000000009801'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f069875108d',35000,'2026-10-14','Exact address and priced dish cross-checked on Tabling/Polle. Latest price not guaranteed.'),
('00000000-0000-4000-8000-000000009802'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f069875108d',45000,'2026-10-14','Exact address and priced dish cross-checked on Tabling/Polle. Latest price not guaranteed.'),
('00000000-0000-4000-8000-000000009803'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f069875108d',55000,'2026-10-14','Exact address and priced dish cross-checked on Tabling/Polle. Latest price not guaranteed.'),
('00000000-0000-4000-8000-000000009804'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f069875108d',80000,'2026-10-14','Exact address and priced dish cross-checked on Tabling/Polle. Latest price not guaranteed.'),
('00000000-0000-4000-8000-000000009805'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f069875108d',80000,'2026-10-14','Exact address and priced dish cross-checked on Tabling/Polle. Latest price not guaranteed.'),
('00000000-0000-4000-8000-000000009806'::uuid,'https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8',26000,'2026-10-14','Exact address and priced dish cross-checked on Tabling/Polle. Latest price not guaranteed.')
ON CONFLICT(menu_id,source_url) DO NOTHING;
