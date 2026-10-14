-- Staging only: translate Korean menu names already entered as drafts.
-- Does not change draft publication state for unverified dishes.
WITH translated(menu_id,names) AS (VALUES
('87abc6f0-a1e5-4566-a7ea-d4168d473a8f'::uuid,'{"en":"Pork loin cutlet set","ja":"ロースカツ定食","zh-CN":"炸猪里脊套餐"}'::jsonb),
('75c273fe-2f39-4f15-abd6-e1185370714d'::uuid,'{"en":"Pork cutlet hot-pot set","ja":"カツ鍋定食","zh-CN":"炸猪排锅套餐"}'::jsonb),
('2c8b241c-dcd9-421a-9c7f-6c2266dcd8c0'::uuid,'{"en":"Ultimate fajitas","ja":"アルティメット・ファヒータ","zh-CN":"终极法吉塔拼盘"}'::jsonb),
('9ea27556-3ae2-4439-a3ad-d5b0c4ca8611'::uuid,'{"en":"Double Stack Club quesadilla","ja":"ダブルスタッククラブ・ケサディーヤ","zh-CN":"双层俱乐部墨西哥夹饼"}'::jsonb),
('b3fb0c4d-ca0c-4ca8-be03-9128c8825615'::uuid,'{"en":"Fermented soybean stew","ja":"チョングッチャン（発酵大豆鍋）","zh-CN":"清麴酱汤"}'::jsonb),
('c9629c5e-45a0-491e-a821-c7e5dfa840a0'::uuid,'{"en":"Grilled fish","ja":"焼き魚","zh-CN":"烤鱼"}'::jsonb),
('aa772940-4a79-446b-893e-d4d75d4d086b'::uuid,'{"en":"Spicy pork set meal","ja":"豚肉の辛味炒め定食","zh-CN":"韩式辣炒猪肉套餐"}'::jsonb),
('cce29e89-ee82-471b-b724-1f5bedf6d0a4'::uuid,'{"en":"Americano","ja":"アメリカーノ","zh-CN":"美式咖啡"}'::jsonb),
('92b5c0f2-a5ab-4a33-a7ad-f6fc0e0a2713'::uuid,'{"en":"Chilled raw fish soup (mulhoe)","ja":"ムルフェ（冷たい刺身スープ）","zh-CN":"韩式冷生鱼汤"}'::jsonb),
('1f82c693-0a6f-463e-a786-41a6b3aa9316'::uuid,'{"en":"Raw fish rice bowl","ja":"フェドッパプ（刺身のせご飯）","zh-CN":"生鱼片拌饭"}'::jsonb),
('07b699fa-8b7c-4bb6-84dd-6aa3cfa73fe8'::uuid,'{"en":"Vinegar-marinated mackerel","ja":"サバの酢漬け","zh-CN":"醋渍鲭鱼"}'::jsonb),
('5e61cf07-aaed-4200-9188-18b2f82faafb'::uuid,'{"en":"Lunch omakase","ja":"ランチおまかせ","zh-CN":"午市主厨套餐"}'::jsonb),
('1de05f65-bb3c-423f-a8fd-aa8ec1cbf4e7'::uuid,'{"en":"Dinner omakase","ja":"ディナーおまかせ","zh-CN":"晚市主厨套餐"}'::jsonb)
)
INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
SELECT x.menu_id,n.key,n.value FROM translated x
CROSS JOIN LATERAL jsonb_each_text(x.names) n
JOIN restaurant_menus m ON m.id=x.menu_id
JOIN whateato_release_cohort_300_v1 c ON c.restaurant_id=m.restaurant_id
WHERE n.key IN('en','ja','zh-CN')
ON CONFLICT(menu_id,locale) DO NOTHING;
