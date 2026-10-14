-- STAGING ONLY: source-backed four language text; approve only conflict-free Bukchon Mugunghwa.
WITH edits(restaurant_id,locale,display_name,short_description,source_notes) AS (VALUES
('ea05fe07-b376-4f01-83c9-707928ee226c'::uuid,'ko','백부장집 닭한마리','서울 종로구 삼봉로 100-1의 닭한마리 전문 식당입니다. 공개 메뉴에는 2인분 닭한마리와 감자·떡 추가 사리가 있습니다.','https://www.tabling.co.kr/place/677cc7a066de5f0698751078 | https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact venue address source; four-language description review 2026-10-14'),
('ea05fe07-b376-4f01-83c9-707928ee226c'::uuid,'en','Baekbujangjip Dak Hanmari','A Korean whole-chicken hot pot restaurant on Sambong-ro in Jongno. Its listed menu includes a two-person dakhanmari hot pot and optional potatoes and rice cakes.','https://www.tabling.co.kr/place/677cc7a066de5f0698751078 | https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact venue address source; four-language description review 2026-10-14'),
('ea05fe07-b376-4f01-83c9-707928ee226c'::uuid,'ja','ペクプジャンチプ・タッカンマリ','ソウル・鍾路区三峰路のタッカンマリ専門店。鶏一羽鍋（2人前）とじゃがいも・トックの追加具材が紹介されています。','https://www.tabling.co.kr/place/677cc7a066de5f0698751078 | https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact venue address source; four-language description review 2026-10-14'),
('ea05fe07-b376-4f01-83c9-707928ee226c'::uuid,'zh-CN','Baekbujangjip 整鸡火锅','位于首尔钟路区三峰路的韩式整鸡火锅店。公开菜单包括双人份整鸡火锅以及土豆、年糕配料。','https://www.tabling.co.kr/place/677cc7a066de5f0698751078 | https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact venue address source; four-language description review 2026-10-14'),
('793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid,'ko','북촌무궁화','서울 종로구 수표로 126의 국밥·한식 식당입니다. 순대국밥, 얼큰 순대국밥, 모둠 순대국밥과 매운 직화곱창이 공개 메뉴에 안내되어 있습니다.','https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/ | https://polle.com/place/3FfkFN/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94 | exact venue address source; four-language description review 2026-10-14'),
('793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid,'en','Bukchon Mugunghwa','A Korean soup and rice restaurant on Supyo-ro in Jongno. Public menu listings include sundae sausage soup with rice, a spicy version, assorted sundae soup, and flame-grilled intestines.','https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/ | https://polle.com/place/3FfkFN/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94 | exact venue address source; four-language description review 2026-10-14'),
('793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid,'ja','北村ムグンファ','ソウル・鍾路区の水標路にある韓国のクッパ料理店。スンデクッパ、辛口スンデクッパ、盛り合わせスンデクッパ、辛口直火焼きコプチャンなどが紹介されています。','https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/ | https://polle.com/place/3FfkFN/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94 | exact venue address source; four-language description review 2026-10-14'),
('793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid,'zh-CN','Bukchon Mugunghwa（北村木槿花）','位于首尔钟路区水标路的韩式汤饭店。公开菜单包括血肠汤饭、辣味血肠汤饭、什锦血肠汤饭和辣味炭烤肥肠。','https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/ | https://polle.com/place/3FfkFN/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94 | exact venue address source; four-language description review 2026-10-14')
)
UPDATE restaurant_localizations l SET display_name=e.display_name,short_description=e.short_description,
 publication_state='review',source_notes=e.source_notes,updated_at=now()
FROM edits e WHERE l.restaurant_id=e.restaurant_id AND l.locale=e.locale AND l.publication_state='draft'
AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%';

UPDATE restaurant_localizations l SET publication_state='published',verified_at=now(),updated_at=now()
WHERE l.restaurant_id='793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid
AND l.publication_state='review'
AND (SELECT COUNT(*) FROM restaurant_localizations x WHERE x.restaurant_id=l.restaurant_id
 AND x.locale IN('ko','en','ja','zh-CN') AND x.publication_state='review'
 AND NULLIF(BTRIM(x.display_name),'') IS NOT NULL AND NULLIF(BTRIM(x.short_description),'') IS NOT NULL
 AND x.source_notes LIKE '%https://%')=4
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=l.restaurant_id AND m.publication_state='published' AND m.price_krw IS NOT NULL)>=3
AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=l.restaurant_id AND q.review_state IN('pending','confirmed_hold'));

UPDATE whateato_release_cohort_300_v1 c SET review_state='approved',reviewed_at=now(),reviewer_note='AI-assisted review 2026-10-14: Daangn + Polle agree on exact branch and menu+price. Locales source edited. Staging only, no current-price guarantee.'
WHERE c.restaurant_id='793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid AND c.review_state='pending'
AND (SELECT COUNT(*) FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id
 AND l.locale IN('ko','en','ja','zh-CN') AND l.publication_state='published')=4
AND NOT EXISTS (SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=c.restaurant_id AND q.review_state IN('pending','confirmed_hold'))
AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published')>=3
AND NOT EXISTS(SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published'
AND (SELECT COUNT(*) FROM restaurant_menu_localizations ml WHERE ml.menu_id=m.id AND ml.locale IN('ko','en','ja','zh-CN'))<>4);
