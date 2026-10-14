-- STAGING ONLY: replace 3 generic permit-based text drafts with branch-specific four-locale review.
-- Preserve original permit names and published content, never touch photos/ratings.
WITH edits(restaurant_id,locale,display_name,short_description,source_notes) AS (
 VALUES ('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'ko','동성각','서울 종로구 새문안로9길 29-2에 있는 중식당입니다. 지점 메뉴에는 유니짜장, 꿔바루, 탕수육 등이 소개되어 있습니다.','https://www.tabling.co.kr/place/677cc7a066de5f0698751064 | https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81 | same-address menu and naming review 2026-10-14; no current operation warranty'),
('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'en','Dongseonggak','A Chinese restaurant on Saemunan-ro 9-gil in Jongno, Seoul. Its published branch menus include uni jajang noodles, guobaorou and sweet-and-sour pork.','https://www.tabling.co.kr/place/677cc7a066de5f0698751064 | https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81 | same-address menu and naming review 2026-10-14; no current operation warranty'),
('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'ja','トンソンガク','ソウル・鍾路区のセムナン路9ギルにある中華料理店。ユニジャージャー麺、鍋包肉（クォバロウ）、酢豚などがメニューに掲載されています。','https://www.tabling.co.kr/place/677cc7a066de5f0698751064 | https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81 | same-address menu and naming review 2026-10-14; no current operation warranty'),
('d8f7d410-da6b-4068-8c8a-423b5dc6f266'::uuid,'zh-CN','Dongseonggak','位于首尔钟路区新门内路9街的中餐馆。公开菜单包含韩式肉末炸酱面、锅包肉和糖醋肉等。','https://www.tabling.co.kr/place/677cc7a066de5f0698751064 | https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81 | same-address menu and naming review 2026-10-14; no current operation warranty'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'ko','콘크리트 팔레트','서울 종로구 대학로 125에 있는 카페입니다. 공개 메뉴에는 생망고빙수, 옥수수빙수, 우유팥빙수가 있으며 메뉴 가격은 출처별 차이가 있어 확인일을 함께 참고해야 합니다.','https://www.tabling.co.kr/place/677cd21566de5f0698890f93 | https://www.diningcode.com/profile.php?rid=JakX0yyEzkll | same-address menu and naming review 2026-10-14; no current operation warranty'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'en','Concrete Palette','A café at 125 Daehak-ro in Jongno, Seoul. Published menus include fresh mango bingsu, sweetcorn bingsu and milk-and-red-bean bingsu. Listed prices differ between sources.','https://www.tabling.co.kr/place/677cd21566de5f0698890f93 | https://www.diningcode.com/profile.php?rid=JakX0yyEzkll | same-address menu and naming review 2026-10-14; no current operation warranty'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'ja','コンクリート・パレット','ソウル・鍾路区大学路125にあるカフェ。生マンゴーピンス、トウモロコシピンス、牛乳あずきピンスなどが紹介されています。掲載価格は情報源によって異なります。','https://www.tabling.co.kr/place/677cd21566de5f0698890f93 | https://www.diningcode.com/profile.php?rid=JakX0yyEzkll | same-address menu and naming review 2026-10-14; no current operation warranty'),
('40e82be1-5b56-47f0-9b02-2776798b710e'::uuid,'zh-CN','Concrete Palette','位于首尔钟路区大学路125号的咖啡馆。公开菜单包括鲜芒果刨冰、玉米刨冰和牛奶红豆刨冰，不同资料所列价格可能存在差异。','https://www.tabling.co.kr/place/677cd21566de5f0698890f93 | https://www.diningcode.com/profile.php?rid=JakX0yyEzkll | same-address menu and naming review 2026-10-14; no current operation warranty'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'ko','함흥곰보냉면','서울 종로구 창경궁로 109 세운스퀘어에 있는 냉면 식당입니다. 공개 메뉴에는 물냉면, 비빔냉면, 찐만두 등이 있습니다.','https://www.tabling.co.kr/place/677ccaa266de5f06987ba6b9 | https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4 | same-address menu and naming review 2026-10-14; no current operation warranty'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'en','Hamheung Gombo Naengmyeon','A Korean cold-noodle restaurant at 109 Changgyeonggung-ro in Jongno. Branch listings include mul-naengmyeon, bibim-naengmyeon and steamed dumplings.','https://www.tabling.co.kr/place/677ccaa266de5f06987ba6b9 | https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4 | same-address menu and naming review 2026-10-14; no current operation warranty'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'ja','咸興コンボ冷麺','ソウル・鍾路区昌慶宮路109のセウンスクエアにある冷麺店。水冷麺、ビビン冷麺、蒸し餃子などがメニューに掲載されています。','https://www.tabling.co.kr/place/677ccaa266de5f06987ba6b9 | https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4 | same-address menu and naming review 2026-10-14; no current operation warranty'),
('1839eefc-25fe-4720-8d23-080ca084f119'::uuid,'zh-CN','Hamheung Gombo 冷面','位于首尔钟路区昌庆宫路109号世运广场的韩式冷面店。公开菜单包括水冷面、拌冷面和蒸饺等。','https://www.tabling.co.kr/place/677ccaa266de5f06987ba6b9 | https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4 | same-address menu and naming review 2026-10-14; no current operation warranty')
)
UPDATE restaurant_localizations l SET display_name=e.display_name,short_description=e.short_description,
 source_notes=e.source_notes,publication_state='review',updated_at=now()
FROM edits e WHERE l.restaurant_id=e.restaurant_id AND l.locale=e.locale
AND l.publication_state='draft' AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%'
AND EXISTS(
 SELECT 1 FROM whateato_release_cohort_300_v1 c WHERE c.restaurant_id=l.restaurant_id AND c.review_state='pending'
)
AND EXISTS(
 SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=l.restaurant_id AND m.publication_state='published'
 AND m.evidence_ref LIKE 'https://%'
);
