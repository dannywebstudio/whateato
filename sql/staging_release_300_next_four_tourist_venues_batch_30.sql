-- Staging only. Iemun Seolleongtang, Kintoto, Jinachun, Yeongchunok: 12 source-priced dishes, 48 language labels.
-- Existing permit names protected, no Google calls, photos, ratings or production changes.
-- Distinct assigned UUIDs and exact branch-cohort identity preconditions.
INSERT INTO restaurant_menus(id,restaurant_id,price_krw,position,publication_state,evidence_ref)
SELECT d.id::uuid,d.rid::uuid,d.price,d.position,'published',d.evidence
FROM (VALUES
('9e42026a-15cf-4ae1-8acf-000000000001','21d3a51f-0bc3-429b-a360-457bfada10ad',15000,120,'https://www.tabling.co.kr/place/677cc7a066de5f0698751182 | https://www.ramyselect.com/restaurants/imun-seolleongtang-seoul | 우정국로 38-13 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000002','21d3a51f-0bc3-429b-a360-457bfada10ad',18000,121,'https://www.tabling.co.kr/place/677cc7a066de5f0698751182 | https://www.ramyselect.com/restaurants/imun-seolleongtang-seoul | 우정국로 38-13 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000003','21d3a51f-0bc3-429b-a360-457bfada10ad',20000,122,'https://www.tabling.co.kr/place/677cc7a066de5f0698751182 | https://www.ramyselect.com/restaurants/imun-seolleongtang-seoul | 우정국로 38-13 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000004','84444628-1730-41fe-92d2-b082c2aa98db',14500,125,'https://www.tabling.co.kr/place/677cd4f466de5f06988e5511 | https://polle.com/place/2o2bC8/%ED%82%A8%ED%86%A0%ED%86%A0 | 창경궁로 248-4 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000005','84444628-1730-41fe-92d2-b082c2aa98db',10500,126,'https://www.tabling.co.kr/place/677cd4f466de5f06988e5511 | https://polle.com/place/2o2bC8/%ED%82%A8%ED%86%A0%ED%86%A0 | 창경궁로 248-4 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000006','84444628-1730-41fe-92d2-b082c2aa98db',11500,127,'https://www.tabling.co.kr/place/677cd4f466de5f06988e5511 | https://polle.com/place/2o2bC8/%ED%82%A8%ED%86%A0%ED%86%A0 | 창경궁로 248-4 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000007','f47aa393-c022-40ee-9463-df342352aab8',8000,130,'https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98 | https://new.emmaru.com/matzip/matzip.do?code=M191016095556518854I&f=1&s=1&t=1 | 새문안로 92 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000008','f47aa393-c022-40ee-9463-df342352aab8',10000,131,'https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98 | https://new.emmaru.com/matzip/matzip.do?code=M191016095556518854I&f=1&s=1&t=1 | 새문안로 92 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000009','f47aa393-c022-40ee-9463-df342352aab8',40000,132,'https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98 | https://new.emmaru.com/matzip/matzip.do?code=M191016095556518854I&f=1&s=1&t=1 | 새문안로 92 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000010','8a7b3230-96b0-4832-b456-8e844b28592a',29000,135,'https://www.tabling.co.kr/place/677cc7a166de5f06987511c8 | https://polle.com/place/1rvDjR/%EC%98%81%EC%B6%98%EC%98%A5 | 돈화문로5가길 13 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000011','8a7b3230-96b0-4832-b456-8e844b28592a',13000,136,'https://www.tabling.co.kr/place/677cc7a166de5f06987511c8 | https://polle.com/place/1rvDjR/%EC%98%81%EC%B6%98%EC%98%A5 | 돈화문로5가길 13 exact branch match, listed price checked 2026-10-14'),
('9e42026a-15cf-4ae1-8acf-000000000012','8a7b3230-96b0-4832-b456-8e844b28592a',11000,137,'https://www.tabling.co.kr/place/677cc7a166de5f06987511c8 | https://polle.com/place/1rvDjR/%EC%98%81%EC%B6%98%EC%98%A5 | 돈화문로5가길 13 exact branch match, listed price checked 2026-10-14')
) d(id,rid,price,position,evidence)
JOIN restaurants r ON r.id=d.rid::uuid
JOIN whateato_release_cohort_300_v1 c ON c.restaurant_id=r.id
WHERE c.review_state='pending' AND r.road_address_ko LIKE ('%'||
CASE c.cohort_rank
WHEN 96 THEN '우정국로 38-13'
WHEN 102 THEN '창경궁로 248-4'
WHEN 116 THEN '새문안로 92'
WHEN 119 THEN '돈화문로5가길 13'
ELSE 'never-match-address' END||'%')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
SELECT d.menu_id::uuid,d.locale,d.name
FROM (VALUES
('9e42026a-15cf-4ae1-8acf-000000000001','ko','설농탕','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000001','en','Seolleongtang (ox-bone soup)','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000001','ja','ソルロンタン（牛骨スープ）','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000001','zh-CN','韩式牛骨浓汤','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000002','ko','설농탕 (특)','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000002','en','Seolleongtang, large','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000002','ja','ソルロンタン（特）','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000002','zh-CN','韩式牛骨浓汤（特大份）','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000003','ko','한우설농탕','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000003','en','Hanwoo beef seolleongtang','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000003','ja','韓牛ソルロンタン','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000003','zh-CN','韩牛牛骨浓汤','21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000004','ko','모둠카츠','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000004','en','Assorted pork cutlets','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000004','ja','盛り合わせカツ','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000004','zh-CN','综合炸猪排','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000005','ko','마제소바','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000005','en','Mazesoba (brothless mixed noodles)','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000005','ja','まぜそば','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000005','zh-CN','日式拌面','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000006','ko','등심카츠','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000006','en','Pork loin cutlet','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000006','ja','ロースカツ','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000006','zh-CN','炸猪里脊','84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000007','ko','짜장면','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000007','en','Black-bean sauce noodles','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000007','ja','ジャージャー麺','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000007','zh-CN','韩式炸酱面','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000008','ko','짬뽕','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000008','en','Spicy seafood noodle soup','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000008','ja','チャンポン','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000008','zh-CN','韩式辣海鲜汤面','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000009','ko','정찬A코스','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000009','en','Set course A','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000009','ja','コース料理A','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000009','zh-CN','A套餐','f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000010','ko','꼬리곰탕','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000010','en','Oxtail soup','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000010','ja','コリコムタン（牛テールスープ）','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000010','zh-CN','韩式牛尾汤','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000011','ko','곰탕','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000011','en','Beef bone soup','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000011','ja','コムタン','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000011','zh-CN','韩式牛肉清汤','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000012','ko','해장국','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000012','en','Haejangguk (hearty Korean soup)','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000012','ja','ヘジャングク（韓国のスープ）','8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000012','zh-CN','韩式醒酒汤','8a7b3230-96b0-4832-b456-8e844b28592a')
) d(menu_id,locale,name,rid)
JOIN restaurant_menus m ON m.id=d.menu_id::uuid AND m.restaurant_id=d.rid::uuid
ON CONFLICT(menu_id,locale) DO NOTHING;

INSERT INTO whateato_menu_price_observations_v1(menu_id,source_url,price_krw,checked_on,observation_note)
SELECT d.menu_id::uuid,d.url,d.price,'2026-10-14'::date,
'Same branch published price at lookup date; actual live price/availability not guaranteed.'
FROM (VALUES
('9e42026a-15cf-4ae1-8acf-000000000001','https://www.tabling.co.kr/place/677cc7a066de5f0698751182',15000,'21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000002','https://www.tabling.co.kr/place/677cc7a066de5f0698751182',18000,'21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000003','https://www.tabling.co.kr/place/677cc7a066de5f0698751182',20000,'21d3a51f-0bc3-429b-a360-457bfada10ad'),
('9e42026a-15cf-4ae1-8acf-000000000004','https://www.tabling.co.kr/place/677cd4f466de5f06988e5511',14500,'84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000005','https://www.tabling.co.kr/place/677cd4f466de5f06988e5511',10500,'84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000006','https://www.tabling.co.kr/place/677cd4f466de5f06988e5511',11500,'84444628-1730-41fe-92d2-b082c2aa98db'),
('9e42026a-15cf-4ae1-8acf-000000000007','https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98',8000,'f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000008','https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98',10000,'f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000009','https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98',40000,'f47aa393-c022-40ee-9463-df342352aab8'),
('9e42026a-15cf-4ae1-8acf-000000000010','https://www.tabling.co.kr/place/677cc7a166de5f06987511c8',29000,'8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000011','https://www.tabling.co.kr/place/677cc7a166de5f06987511c8',13000,'8a7b3230-96b0-4832-b456-8e844b28592a'),
('9e42026a-15cf-4ae1-8acf-000000000012','https://www.tabling.co.kr/place/677cc7a166de5f06987511c8',11000,'8a7b3230-96b0-4832-b456-8e844b28592a')
) d(menu_id,url,price,rid)
JOIN restaurant_menus m ON m.id=d.menu_id::uuid AND m.restaurant_id=d.rid::uuid
ON CONFLICT(menu_id,source_url) DO NOTHING;

WITH v(restaurant_id,locale,display_name,short_description,source_notes) AS(VALUES
('21d3a51f-0bc3-429b-a360-457bfada10ad','ko','이문 설농탕','서울 종로구 우정국로 38-13에 있는 설렁탕 전문 식당입니다. 공개 메뉴에는 설농탕, 특설농탕, 한우설농탕 등이 있습니다.','https://www.tabling.co.kr/place/677cc7a066de5f0698751182 | https://www.ramyselect.com/restaurants/imun-seolleongtang-seoul | source-checked 2026-10-14'),
('21d3a51f-0bc3-429b-a360-457bfada10ad','en','Imun Seolleongtang','A Korean ox-bone soup restaurant at 38-13 Ujeongguk-ro in Jongno, Seoul. Listed dishes include traditional seolleongtang, a larger serving and a Hanwoo beef version.','https://www.tabling.co.kr/place/677cc7a066de5f0698751182 | https://www.ramyselect.com/restaurants/imun-seolleongtang-seoul | source-checked 2026-10-14'),
('21d3a51f-0bc3-429b-a360-457bfada10ad','ja','イムン・ソルロンタン','ソウル・鍾路区郵征局路38-13にある牛骨スープの専門店。ソルロンタン、特サイズ、韓牛ソルロンタンがメニューに掲載されています。','https://www.tabling.co.kr/place/677cc7a066de5f0698751182 | https://www.ramyselect.com/restaurants/imun-seolleongtang-seoul | source-checked 2026-10-14'),
('21d3a51f-0bc3-429b-a360-457bfada10ad','zh-CN','Imun Seolleongtang','位于首尔钟路区邮征局路38-13号的韩式牛骨浓汤餐厅。公开菜单包括传统牛骨汤、特大份及韩牛牛骨汤。','https://www.tabling.co.kr/place/677cc7a066de5f0698751182 | https://www.ramyselect.com/restaurants/imun-seolleongtang-seoul | source-checked 2026-10-14'),
('84444628-1730-41fe-92d2-b082c2aa98db','ko','킨토토 혜화점','서울 종로구 창경궁로 248-4의 일식 식당입니다. 지점 메뉴로 모둠카츠, 마제소바, 등심카츠 등이 안내되어 있습니다.','https://www.tabling.co.kr/place/677cd4f466de5f06988e5511 | https://polle.com/place/2o2bC8/%ED%82%A8%ED%86%A0%ED%86%A0 | source-checked 2026-10-14'),
('84444628-1730-41fe-92d2-b082c2aa98db','en','Kintoto Hyehwa','A casual Japanese restaurant at 248-4 Changgyeonggung-ro in Jongno, Seoul. Branch menus list assorted pork cutlets, mazesoba and pork loin cutlets.','https://www.tabling.co.kr/place/677cd4f466de5f06988e5511 | https://polle.com/place/2o2bC8/%ED%82%A8%ED%86%A0%ED%86%A0 | source-checked 2026-10-14'),
('84444628-1730-41fe-92d2-b082c2aa98db','ja','キントト 恵化店','ソウル・鍾路区昌慶宮路248-4にあるカジュアルな和食店。盛り合わせカツ、まぜそば、ロースカツなどがメニューに掲載されています。','https://www.tabling.co.kr/place/677cd4f466de5f06988e5511 | https://polle.com/place/2o2bC8/%ED%82%A8%ED%86%A0%ED%86%A0 | source-checked 2026-10-14'),
('84444628-1730-41fe-92d2-b082c2aa98db','zh-CN','Kintoto 惠化店','位于首尔钟路区昌庆宫路248-4号的日式简餐店。公开菜单包括综合炸猪排、日式拌面和炸猪里脊。','https://www.tabling.co.kr/place/677cd4f466de5f06988e5511 | https://polle.com/place/2o2bC8/%ED%82%A8%ED%86%A0%ED%86%A0 | source-checked 2026-10-14'),
('f47aa393-c022-40ee-9463-df342352aab8','ko','진아춘 광화문점','서울 종로구 새문안로 92 광화문 오피시아 지하 1층의 중식당입니다. 공개 메뉴에는 짜장면, 짬뽕, 정찬 A코스가 있습니다.','https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98 | https://new.emmaru.com/matzip/matzip.do?code=M191016095556518854I&f=1&s=1&t=1 | source-checked 2026-10-14'),
('f47aa393-c022-40ee-9463-df342352aab8','en','Jinachun Gwanghwamun','A Chinese restaurant in the basement of Gwanghwamun Officia, 92 Saemunan-ro, Seoul. Branch menus include jajangmyeon, jjamppong and set course A.','https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98 | https://new.emmaru.com/matzip/matzip.do?code=M191016095556518854I&f=1&s=1&t=1 | source-checked 2026-10-14'),
('f47aa393-c022-40ee-9463-df342352aab8','ja','ジンアチュン 光化門店','ソウル・セムナン路92、光化門オフィシアの地下1階にある中華料理店。ジャージャー麺、チャンポン、Aコースが紹介されています。','https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98 | https://new.emmaru.com/matzip/matzip.do?code=M191016095556518854I&f=1&s=1&t=1 | source-checked 2026-10-14'),
('f47aa393-c022-40ee-9463-df342352aab8','zh-CN','Jinachun 光化门店','位于首尔新门内路92号光化门Officia地下1层的中餐馆。公开菜单包括韩式炸酱面、韩式辣海鲜汤面和A套餐。','https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98 | https://new.emmaru.com/matzip/matzip.do?code=M191016095556518854I&f=1&s=1&t=1 | source-checked 2026-10-14'),
('8a7b3230-96b0-4832-b456-8e844b28592a','ko','영춘옥','서울 종로구 돈화문로5가길 13에 있는 한식 탕 요리 식당입니다. 공개 메뉴에는 꼬리곰탕, 곰탕, 해장국 등이 있습니다.','https://www.tabling.co.kr/place/677cc7a166de5f06987511c8 | https://polle.com/place/1rvDjR/%EC%98%81%EC%B6%98%EC%98%A5 | source-checked 2026-10-14'),
('8a7b3230-96b0-4832-b456-8e844b28592a','en','Yeongchunok','A traditional Korean soup restaurant at 13 Donhwamun-ro 5ga-gil in Jongno. Listed dishes include oxtail soup, gomtang and haejangguk.','https://www.tabling.co.kr/place/677cc7a166de5f06987511c8 | https://polle.com/place/1rvDjR/%EC%98%81%EC%B6%98%EC%98%A5 | source-checked 2026-10-14'),
('8a7b3230-96b0-4832-b456-8e844b28592a','ja','ヨンチュノク','ソウル・鍾路区敦化門路5ガギル13にある韓国のスープ料理店。コリコムタン、コムタン、ヘジャングクなどがメニューに掲載されています。','https://www.tabling.co.kr/place/677cc7a166de5f06987511c8 | https://polle.com/place/1rvDjR/%EC%98%81%EC%B6%98%EC%98%A5 | source-checked 2026-10-14'),
('8a7b3230-96b0-4832-b456-8e844b28592a','zh-CN','Yeongchunok','位于首尔钟路区敦化门路5街13号的传统韩式汤料理餐厅。公开菜单包括牛尾汤、牛肉清汤和醒酒汤。','https://www.tabling.co.kr/place/677cc7a166de5f06987511c8 | https://polle.com/place/1rvDjR/%EC%98%81%EC%B6%98%EC%98%A5 | source-checked 2026-10-14'))
UPDATE restaurant_localizations l SET display_name=v.display_name,short_description=v.short_description,
source_notes=v.source_notes,publication_state='review',updated_at=now()
FROM v WHERE l.restaurant_id=v.restaurant_id::uuid AND l.locale=v.locale
AND l.publication_state='draft' AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%'
AND EXISTS(SELECT 1 FROM whateato_release_cohort_300_v1 c
WHERE c.restaurant_id=l.restaurant_id AND c.review_state='pending');

WITH eligible AS(
 SELECT c.restaurant_id FROM whateato_release_cohort_300_v1 c
 JOIN restaurants r ON r.id=c.restaurant_id
 WHERE c.restaurant_id IN('21d3a51f-0bc3-429b-a360-457bfada10ad'::uuid,'84444628-1730-41fe-92d2-b082c2aa98db'::uuid,'f47aa393-c022-40ee-9463-df342352aab8'::uuid,'8a7b3230-96b0-4832-b456-8e844b28592a'::uuid) AND c.review_state='pending'
 AND r.publication_status='published' AND r.business_status='active'
 AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=c.restaurant_id
 AND q.review_state IN('pending','confirmed_hold'))
 AND (SELECT count(distinct l.locale) FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id
 AND l.locale IN('ko','en','ja','zh-CN') AND l.publication_state='review'
 AND l.source_notes LIKE '%https://%'
 AND NULLIF(BTRIM(l.display_name),'') IS NOT NULL AND NULLIF(BTRIM(l.short_description),'') IS NOT NULL)=4
 AND (SELECT count(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published')=3
 AND NOT EXISTS(SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id
 AND m.publication_state='published' AND ((SELECT count(distinct ml.locale) FROM restaurant_menu_localizations ml
 WHERE ml.menu_id=m.id AND ml.locale IN('ko','en','ja','zh-CN') AND NULLIF(BTRIM(ml.name),'') IS NOT NULL)<>4
 OR m.price_krw IS NULL OR m.evidence_ref IS NULL))
)
UPDATE restaurant_localizations l SET publication_state='published',verified_at=now(),updated_at=now()
FROM eligible e WHERE e.restaurant_id=l.restaurant_id AND l.locale IN('ko','en','ja','zh-CN')
AND l.publication_state='review';

UPDATE whateato_release_cohort_300_v1 c SET review_state='approved',reviewed_at=now(),
reviewer_note='Staging-only AI-assisted source/address/menu/4-locale verification 2026-10-14. Prices are dated published snapshots, not current store guarantee.'
WHERE c.restaurant_id IN('21d3a51f-0bc3-429b-a360-457bfada10ad'::uuid,'84444628-1730-41fe-92d2-b082c2aa98db'::uuid,'f47aa393-c022-40ee-9463-df342352aab8'::uuid,'8a7b3230-96b0-4832-b456-8e844b28592a'::uuid) AND c.review_state='pending'
AND (SELECT count(distinct l.locale) FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id
AND l.publication_state='published' AND l.locale IN('ko','en','ja','zh-CN'))=4
AND (SELECT count(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published')=3
AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews dq WHERE dq.restaurant_id=c.restaurant_id
AND dq.review_state IN('pending','confirmed_hold'));
