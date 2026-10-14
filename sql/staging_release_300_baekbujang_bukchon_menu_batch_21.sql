-- STAGING ONLY. 7 menus, 4 locales, price source/date with permit-category conflict review.
INSERT INTO restaurant_menus(id,restaurant_id,price_krw,position,publication_state,evidence_ref)
VALUES
('00000000-0000-4000-8000-000000009901'::uuid,'ea05fe07-b376-4f01-83c9-707928ee226c'::uuid,28000,50,'published','https://www.tabling.co.kr/place/677cc7a066de5f0698751078 | https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact address 삼봉로 100-1 | priced snapshot 2026-10-14'),
('00000000-0000-4000-8000-000000009902'::uuid,'ea05fe07-b376-4f01-83c9-707928ee226c'::uuid,3000,51,'published','https://www.tabling.co.kr/place/677cc7a066de5f0698751078 | https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact address 삼봉로 100-1 | priced snapshot 2026-10-14'),
('00000000-0000-4000-8000-000000009903'::uuid,'ea05fe07-b376-4f01-83c9-707928ee226c'::uuid,2000,52,'published','https://www.tabling.co.kr/place/677cc7a066de5f0698751078 | https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | exact address 삼봉로 100-1 | priced snapshot 2026-10-14'),
('00000000-0000-4000-8000-000000009911'::uuid,'793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid,11000,53,'published','https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/ | https://polle.com/place/3FfkFN/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94 | https://www.tabling.co.kr/restaurant/11243 | exact address 수표로 126 | priced snapshot 2026-10-14'),
('00000000-0000-4000-8000-000000009912'::uuid,'793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid,11000,54,'published','https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/ | https://polle.com/place/3FfkFN/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94 | https://www.tabling.co.kr/restaurant/11243 | exact address 수표로 126 | priced snapshot 2026-10-14'),
('00000000-0000-4000-8000-000000009913'::uuid,'793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid,12000,55,'published','https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/ | https://polle.com/place/3FfkFN/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94 | https://www.tabling.co.kr/restaurant/11243 | exact address 수표로 126 | priced snapshot 2026-10-14'),
('00000000-0000-4000-8000-000000009914'::uuid,'793d711e-0cc6-42bf-aef5-d481888d31f6'::uuid,19000,56,'published','https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/ | https://polle.com/place/3FfkFN/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94 | https://www.tabling.co.kr/restaurant/11243 | exact address 수표로 126 | priced snapshot 2026-10-14')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
VALUES
('00000000-0000-4000-8000-000000009901'::uuid,'ko','닭한마리 (2인분)'),
('00000000-0000-4000-8000-000000009901'::uuid,'en','Whole chicken hot pot (2 servings)'),
('00000000-0000-4000-8000-000000009901'::uuid,'ja','タッカンマリ（2人前）'),
('00000000-0000-4000-8000-000000009901'::uuid,'zh-CN','韩式整鸡火锅（2人份）'),
('00000000-0000-4000-8000-000000009902'::uuid,'ko','감자사리'),
('00000000-0000-4000-8000-000000009902'::uuid,'en','Extra potatoes'),
('00000000-0000-4000-8000-000000009902'::uuid,'ja','追加じゃがいも'),
('00000000-0000-4000-8000-000000009902'::uuid,'zh-CN','加土豆'),
('00000000-0000-4000-8000-000000009903'::uuid,'ko','떡사리'),
('00000000-0000-4000-8000-000000009903'::uuid,'en','Extra rice cakes'),
('00000000-0000-4000-8000-000000009903'::uuid,'ja','追加トック'),
('00000000-0000-4000-8000-000000009903'::uuid,'zh-CN','加年糕'),
('00000000-0000-4000-8000-000000009911'::uuid,'ko','순대국밥'),
('00000000-0000-4000-8000-000000009911'::uuid,'en','Korean sundae sausage soup with rice'),
('00000000-0000-4000-8000-000000009911'::uuid,'ja','スンデクッパ'),
('00000000-0000-4000-8000-000000009911'::uuid,'zh-CN','韩式血肠汤饭'),
('00000000-0000-4000-8000-000000009912'::uuid,'ko','얼큰 순대국밥'),
('00000000-0000-4000-8000-000000009912'::uuid,'en','Spicy sundae sausage soup with rice'),
('00000000-0000-4000-8000-000000009912'::uuid,'ja','辛口スンデクッパ'),
('00000000-0000-4000-8000-000000009912'::uuid,'zh-CN','辣味血肠汤饭'),
('00000000-0000-4000-8000-000000009913'::uuid,'ko','모둠 순대국밥'),
('00000000-0000-4000-8000-000000009913'::uuid,'en','Assorted sundae soup with rice'),
('00000000-0000-4000-8000-000000009913'::uuid,'ja','盛り合わせスンデクッパ'),
('00000000-0000-4000-8000-000000009913'::uuid,'zh-CN','什锦血肠汤饭'),
('00000000-0000-4000-8000-000000009914'::uuid,'ko','매운 직화곱창'),
('00000000-0000-4000-8000-000000009914'::uuid,'en','Spicy flame-grilled intestines'),
('00000000-0000-4000-8000-000000009914'::uuid,'ja','辛口直火焼きコプチャン'),
('00000000-0000-4000-8000-000000009914'::uuid,'zh-CN','辣味炭烤肥肠')
ON CONFLICT(menu_id,locale) DO NOTHING;

INSERT INTO whateato_menu_price_observations_v1(menu_id,source_url,price_krw,checked_on,observation_note)
VALUES
('00000000-0000-4000-8000-000000009901'::uuid,'https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC',28000,'2026-10-14','Exact branch matching listed price, no guarantee of live availability or current price.'),
('00000000-0000-4000-8000-000000009902'::uuid,'https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC',3000,'2026-10-14','Exact branch matching listed price, no guarantee of live availability or current price.'),
('00000000-0000-4000-8000-000000009903'::uuid,'https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC',2000,'2026-10-14','Exact branch matching listed price, no guarantee of live availability or current price.'),
('00000000-0000-4000-8000-000000009911'::uuid,'https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/',11000,'2026-10-14','Exact branch matching listed price, no guarantee of live availability or current price.'),
('00000000-0000-4000-8000-000000009912'::uuid,'https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/',11000,'2026-10-14','Exact branch matching listed price, no guarantee of live availability or current price.'),
('00000000-0000-4000-8000-000000009913'::uuid,'https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/',12000,'2026-10-14','Exact branch matching listed price, no guarantee of live availability or current price.'),
('00000000-0000-4000-8000-000000009914'::uuid,'https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/',19000,'2026-10-14','Exact branch matching listed price, no guarantee of live availability or current price.')
ON CONFLICT(menu_id,source_url) DO NOTHING;

INSERT INTO restaurant_data_quality_reviews(restaurant_id,issue_code,severity,review_state,evidence_ref,evidence_summary)
VALUES('ea05fe07-b376-4f01-83c9-707928ee226c'::uuid,'PERMIT_CATEGORY_CONFLICT','medium','pending','https://www.tabling.co.kr/place/677cc7a066de5f0698751078','백부장집 등록 업종 중국식과 현행 닭한마리 전문점 분류가 충돌. 메뉴·주소 일치 확인. 소비자 분류는 검증 후 교정. 인허가 원본 미변경.')
ON CONFLICT(restaurant_id,issue_code) DO NOTHING;
