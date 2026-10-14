-- Staging-only; exact branch-address corroborated menu prices, 4 locale labels. No ratings/photos.
INSERT INTO restaurant_menus (id,restaurant_id,price_krw,position,publication_state,evidence_ref) VALUES
('00000000-0000-4000-8000-000000009701'::uuid,'7f4cea98-3a10-4588-954b-85e1e5f58b0f'::uuid,14000,30,'published','https://www.tabling.co.kr/place/677cc7a066de5f069875106e | https://polle.com/place/4XuDxg/%EB%82%A8%EB%8C%80%EB%AC%B8%20%EB%A7%89%EB%82%B4%ED%9A%8C%EC%A7%91 | exact branch address 우정국로 4-1 ; observed prices 2026-10-14, not live guaranteed'),
('00000000-0000-4000-8000-000000009702'::uuid,'7f4cea98-3a10-4588-954b-85e1e5f58b0f'::uuid,9000,31,'published','https://www.tabling.co.kr/place/677cc7a066de5f069875106e | https://polle.com/place/4XuDxg/%EB%82%A8%EB%8C%80%EB%AC%B8%20%EB%A7%89%EB%82%B4%ED%9A%8C%EC%A7%91 | exact branch address 우정국로 4-1 ; observed prices 2026-10-14, not live guaranteed'),
('00000000-0000-4000-8000-000000009703'::uuid,'7f4cea98-3a10-4588-954b-85e1e5f58b0f'::uuid,9000,32,'published','https://www.tabling.co.kr/place/677cc7a066de5f069875106e | https://polle.com/place/4XuDxg/%EB%82%A8%EB%8C%80%EB%AC%B8%20%EB%A7%89%EB%82%B4%ED%9A%8C%EC%A7%91 | exact branch address 우정국로 4-1 ; observed prices 2026-10-14, not live guaranteed'),
('00000000-0000-4000-8000-000000009711'::uuid,'47e72d60-a8cd-4fe6-8c6a-94a49e9b7383'::uuid,33000,30,'published','https://www.tabling.co.kr/place/677cc7a066de5f06987510f0 | https://polle.com/place/1YSBy3/%EB%AA%85%EB%8F%99%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact branch address 종로40가길 10 ; observed prices 2026-10-14, not live guaranteed'),
('00000000-0000-4000-8000-000000009712'::uuid,'47e72d60-a8cd-4fe6-8c6a-94a49e9b7383'::uuid,36000,31,'published','https://www.tabling.co.kr/place/677cc7a066de5f06987510f0 | https://polle.com/place/1YSBy3/%EB%AA%85%EB%8F%99%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact branch address 종로40가길 10 ; observed prices 2026-10-14, not live guaranteed'),
('00000000-0000-4000-8000-000000009713'::uuid,'47e72d60-a8cd-4fe6-8c6a-94a49e9b7383'::uuid,17000,32,'published','https://www.tabling.co.kr/place/677cc7a066de5f06987510f0 | https://polle.com/place/1YSBy3/%EB%AA%85%EB%8F%99%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact branch address 종로40가길 10 ; observed prices 2026-10-14, not live guaranteed')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name) VALUES
('00000000-0000-4000-8000-000000009701'::uuid,'ko','회정식+매운탕(점심특선)'),
('00000000-0000-4000-8000-000000009701'::uuid,'en','Sashimi lunch set with spicy fish soup'),
('00000000-0000-4000-8000-000000009701'::uuid,'ja','刺身定食＋メウンタン（ランチ）'),
('00000000-0000-4000-8000-000000009701'::uuid,'zh-CN','生鱼片套餐配辣鱼汤（午市）'),
('00000000-0000-4000-8000-000000009702'::uuid,'ko','회덮밥+매운탕(점심특선)'),
('00000000-0000-4000-8000-000000009702'::uuid,'en','Sashimi rice bowl with spicy fish soup'),
('00000000-0000-4000-8000-000000009702'::uuid,'ja','刺身丼＋メウンタン（ランチ）'),
('00000000-0000-4000-8000-000000009702'::uuid,'zh-CN','生鱼片盖饭配辣鱼汤（午市）'),
('00000000-0000-4000-8000-000000009703'::uuid,'ko','알밥+매운탕(점심특선)'),
('00000000-0000-4000-8000-000000009703'::uuid,'en','Fish roe rice with spicy fish soup'),
('00000000-0000-4000-8000-000000009703'::uuid,'ja','とびこご飯＋メウンタン（ランチ）'),
('00000000-0000-4000-8000-000000009703'::uuid,'zh-CN','鱼籽饭配辣鱼汤（午市）'),
('00000000-0000-4000-8000-000000009711'::uuid,'ko','닭한마리'),
('00000000-0000-4000-8000-000000009711'::uuid,'en','Whole chicken hot pot'),
('00000000-0000-4000-8000-000000009711'::uuid,'ja','タッカンマリ（鶏一羽鍋）'),
('00000000-0000-4000-8000-000000009711'::uuid,'zh-CN','韩式整鸡火锅'),
('00000000-0000-4000-8000-000000009712'::uuid,'ko','닭볶음탕'),
('00000000-0000-4000-8000-000000009712'::uuid,'en','Spicy braised chicken'),
('00000000-0000-4000-8000-000000009712'::uuid,'ja','タットリタン（鶏の辛煮）'),
('00000000-0000-4000-8000-000000009712'::uuid,'zh-CN','韩式辣炖鸡'),
('00000000-0000-4000-8000-000000009713'::uuid,'ko','삼계탕'),
('00000000-0000-4000-8000-000000009713'::uuid,'en','Ginseng chicken soup'),
('00000000-0000-4000-8000-000000009713'::uuid,'ja','サムゲタン'),
('00000000-0000-4000-8000-000000009713'::uuid,'zh-CN','韩式参鸡汤')
ON CONFLICT(menu_id,locale) DO NOTHING;

INSERT INTO whateato_menu_price_observations_v1(menu_id,source_url,price_krw,checked_on,observation_note) VALUES
('00000000-0000-4000-8000-000000009701'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f069875106e',14000,'2026-10-14','Exact street-address published listing; latest in-store price not guaranteed.'),
('00000000-0000-4000-8000-000000009702'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f069875106e',9000,'2026-10-14','Exact street-address published listing; latest in-store price not guaranteed.'),
('00000000-0000-4000-8000-000000009703'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f069875106e',9000,'2026-10-14','Exact street-address published listing; latest in-store price not guaranteed.'),
('00000000-0000-4000-8000-000000009711'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f06987510f0',33000,'2026-10-14','Exact street-address published listing; latest in-store price not guaranteed.'),
('00000000-0000-4000-8000-000000009712'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f06987510f0',36000,'2026-10-14','Exact street-address published listing; latest in-store price not guaranteed.'),
('00000000-0000-4000-8000-000000009713'::uuid,'https://www.tabling.co.kr/place/677cc7a066de5f06987510f0',17000,'2026-10-14','Exact street-address published listing; latest in-store price not guaranteed.')
ON CONFLICT(menu_id,source_url) DO NOTHING;
