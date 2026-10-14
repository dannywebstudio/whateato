-- Phase2. STAGING ONLY. Three address-matched restaurant listings, exact Korean dishes;
-- no invented prices, image claims, or live availability. 4-language names are editorial translations.
WITH source_data(restaurant_id,ko,en,ja,zh,position,ref) AS (VALUES ('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'유니짜장','Uni jajangmyeon','ユニジャージャー麺','肉末炸酱面',21,'https://www.tabling.co.kr/place/677cc7a066de5f0698751064'),
('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'꿔바루','Guobaorou (crispy sweet and sour pork)','鍋包肉（グオバオロー）','锅包肉',22,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81'),
('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'탕수육','Sweet and sour pork','韓国式酢豚','韩式糖醋肉',23,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'생 망고빙수','Fresh mango shaved ice','生マンゴーピンス','鲜芒果刨冰',21,'https://www.tabling.co.kr/place/677cd21566de5f0698890f93'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'옥수수 빙수','Corn shaved ice','とうもろこしピンス','玉米刨冰',22,'https://www.tabling.co.kr/place/677cd21566de5f0698890f93'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'우유 팥 빙수','Milk and red-bean shaved ice','ミルクあずきピンス','牛奶红豆刨冰',23,'https://www.tabling.co.kr/place/677cd21566de5f0698890f93'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'물냉면','Cold buckwheat noodles in broth','水冷麺','汤冷面',21,'https://www.tabling.co.kr/place/677ccaa266de5f06987ba6b9'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'비빔냉면','Spicy mixed cold noodles','ビビン冷麺','韩式辣拌冷面',22,'https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'찐만두','Steamed dumplings','蒸し餃子','蒸饺',23,'https://www.tabling.co.kr/place/677ccaa266de5f06987ba6b9'))
INSERT INTO restaurant_menus (id,restaurant_id,price_krw,position,publication_state,evidence_ref)
SELECT gen_random_uuid(),d.restaurant_id,NULL,d.position,'published',d.ref
FROM source_data d
WHERE EXISTS(SELECT 1 FROM whateato_release_cohort_300_v1 c WHERE c.restaurant_id=d.restaurant_id)
AND NOT EXISTS(
 SELECT 1 FROM restaurant_menus m
 JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id AND ml.locale='ko'
 WHERE m.restaurant_id=d.restaurant_id AND ml.name=d.ko)
AND NOT EXISTS(SELECT 1 FROM restaurant_menus m2
 WHERE m2.restaurant_id=d.restaurant_id AND m2.position=d.position
 AND m2.evidence_ref=d.ref);

WITH source_data(restaurant_id,ko,en,ja,zh,position,ref) AS (VALUES ('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'유니짜장','Uni jajangmyeon','ユニジャージャー麺','肉末炸酱面',21,'https://www.tabling.co.kr/place/677cc7a066de5f0698751064'),
('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'꿔바루','Guobaorou (crispy sweet and sour pork)','鍋包肉（グオバオロー）','锅包肉',22,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81'),
('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'탕수육','Sweet and sour pork','韓国式酢豚','韩式糖醋肉',23,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'생 망고빙수','Fresh mango shaved ice','生マンゴーピンス','鲜芒果刨冰',21,'https://www.tabling.co.kr/place/677cd21566de5f0698890f93'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'옥수수 빙수','Corn shaved ice','とうもろこしピンス','玉米刨冰',22,'https://www.tabling.co.kr/place/677cd21566de5f0698890f93'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'우유 팥 빙수','Milk and red-bean shaved ice','ミルクあずきピンス','牛奶红豆刨冰',23,'https://www.tabling.co.kr/place/677cd21566de5f0698890f93'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'물냉면','Cold buckwheat noodles in broth','水冷麺','汤冷面',21,'https://www.tabling.co.kr/place/677ccaa266de5f06987ba6b9'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'비빔냉면','Spicy mixed cold noodles','ビビン冷麺','韩式辣拌冷面',22,'https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'찐만두','Steamed dumplings','蒸し餃子','蒸饺',23,'https://www.tabling.co.kr/place/677ccaa266de5f06987ba6b9'))
INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
SELECT m.id,v.locale,v.label FROM source_data d
 JOIN restaurant_menus m ON m.restaurant_id=d.restaurant_id
  AND m.position=d.position AND m.evidence_ref=d.ref
 CROSS JOIN LATERAL (VALUES('ko',d.ko),('en',d.en),('ja',d.ja),('zh-CN',d.zh)) v(locale,label)
 ON CONFLICT(menu_id,locale) DO NOTHING;
