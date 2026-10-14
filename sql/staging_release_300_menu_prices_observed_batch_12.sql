-- STAGING ONLY. 41 listed prices, 2 alternative observations.
-- 2026-10-14 source-check date; NOT verified fresh cash-register amounts.
-- price_verified_at intentionally remains NULL; observation source/date in separate audit table.
-- Never overwrite earlier prices or infer prices from other branches.
CREATE TABLE IF NOT EXISTS whateato_menu_price_observations_v1 (
 menu_id uuid NOT NULL REFERENCES restaurant_menus(id) ON DELETE RESTRICT,
 source_url text NOT NULL CHECK(source_url ~ '^https://'),
 price_krw integer NOT NULL CHECK(price_krw>0 AND price_krw<=100000000),
 checked_on date NOT NULL,
 price_basis text NOT NULL DEFAULT 'public_menu_listing' CHECK(price_basis IN('public_menu_listing','official_branch_menu')),
 observation_note text NOT NULL,
 observed_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(menu_id,source_url)
);

WITH evidence(venue,menu_ko,price_krw,source_url,observation_note) AS (VALUES
('호호식당 대학로','로스가츠정식',15000,'https://www.diningcode.com/profile.php?rid=YmAt6lKukYOU','Historical public menu listing; latest in-store price NOT guaranteed.'),
('호호식당 대학로','가츠나베정식',17000,'https://www.diningcode.com/profile.php?rid=YmAt6lKukYOU','Historical public menu listing; latest in-store price NOT guaranteed.'),
('호호식당 대학로','사케동',18000,'https://www.diningcode.com/profile.php?rid=YmAt6lKukYOU','Historical public menu listing; latest in-store price NOT guaranteed.'),
('호호식당 대학로','오므라이스',15000,'https://www.diningcode.com/profile.php?rid=YmAt6lKukYOU','Historical public menu listing; latest in-store price NOT guaranteed.'),
('온더보더 광화문 D타워점','풀드포크 타코',7500,'https://www.tabling.co.kr/place/677ccac066de5f06987be562','Historical public menu listing; latest in-store price NOT guaranteed.'),
('온더보더 광화문 D타워점','콰트로 화이타',65000,'https://www.tabling.co.kr/place/677ccac066de5f06987be562','Historical public menu listing; latest in-store price NOT guaranteed.'),
('온더보더 광화문 D타워점','더블스텍클럽 퀘사디아',36000,'https://www.tabling.co.kr/place/677ccac066de5f06987be562','Historical public menu listing; latest in-store price NOT guaranteed.'),
('서촌명가','청국장',10000,'https://www.diningcode.com/profile.php?rid=DbMRM7W6D6sl','Historical public menu listing; latest in-store price NOT guaranteed.'),
('서촌명가','생선구이',13000,'https://www.diningcode.com/profile.php?rid=DbMRM7W6D6sl','Historical public menu listing; latest in-store price NOT guaranteed.'),
('카페르뷰','아메리카노',2500,'https://www.diningcode.com/profile.php?rid=o1lZedCMqair','Historical public menu listing; latest in-store price NOT guaranteed.'),
('영덕막회','고등어초절임',22000,'https://www.tabling.co.kr/place/677cccf366de5f069880117d','Historical public menu listing; latest in-store price NOT guaranteed.'),
('영덕막회','물회',13000,'https://www.tabling.co.kr/place/677cccf366de5f069880117d','Historical public menu listing; latest in-store price NOT guaranteed.'),
('영덕막회','회덮밥',11000,'https://www.tabling.co.kr/place/677cccf366de5f069880117d','Historical public menu listing; latest in-store price NOT guaranteed.'),
('소수헌','런치 오마카세',300000,'https://www.tabling.co.kr/place/677cd68866de5f069891271a','Historical public menu listing; latest in-store price NOT guaranteed.'),
('소수헌','디너 오마카세',500000,'https://www.tabling.co.kr/place/677cd68866de5f069891271a','Historical public menu listing; latest in-store price NOT guaranteed.'),
('동성각','유니짜장',10000,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81','Historical public menu listing; latest in-store price NOT guaranteed.'),
('동성각','꿔바루',40000,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81','Historical public menu listing; latest in-store price NOT guaranteed.'),
('동성각','탕수육',20000,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81','Historical public menu listing; latest in-store price NOT guaranteed.'),
('콘크리트 팔레트','생 망고빙수',27000,'https://www.diningcode.com/profile.php?rid=JakX0yyEzkll','Historical public menu listing; latest in-store price NOT guaranteed.'),
('콘크리트 팔레트','옥수수 빙수',21000,'https://www.diningcode.com/profile.php?rid=JakX0yyEzkll','Conflicting older listing at tabling: 19,000 KRW; selected current displayed diningcode 21,000 KRW.'),
('콘크리트 팔레트','우유 팥 빙수',21000,'https://www.diningcode.com/profile.php?rid=JakX0yyEzkll','Conflicting older listing at tabling: 19,000 KRW; selected current displayed diningcode 21,000 KRW.'),
('함흥곰보냉면','물냉면',13000,'https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4','Historical public menu listing; latest in-store price NOT guaranteed.'),
('함흥곰보냉면','비빔냉면',13000,'https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4','Historical public menu listing; latest in-store price NOT guaranteed.'),
('함흥곰보냉면','찐만두',8000,'https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4','Historical public menu listing; latest in-store price NOT guaranteed.'),
('육대장 광화문점','옛날전통육개장',12000,'https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809','Historical public menu listing; latest in-store price NOT guaranteed.'),
('육대장 광화문점','부대육개장',13000,'https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809','Historical public menu listing; latest in-store price NOT guaranteed.'),
('육대장 광화문점','차돌육개장',13000,'https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809','Historical public menu listing; latest in-store price NOT guaranteed.'),
('대성집','도가니탕',13000,'https://polle.com/place/2H1VvK/%EB%8C%80%EC%84%B1%EC%A7%91','Historical public menu listing; latest in-store price NOT guaranteed.'),
('대성집','수육',30000,'https://polle.com/place/2H1VvK/%EB%8C%80%EC%84%B1%EC%A7%91','Historical public menu listing; latest in-store price NOT guaranteed.'),
('대성집','해장국',7000,'https://polle.com/place/2H1VvK/%EB%8C%80%EC%84%B1%EC%A7%91','Historical public menu listing; latest in-store price NOT guaranteed.'),
('종가 김치찌개','생삼겹180g',16000,'https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C','Historical public menu listing; latest in-store price NOT guaranteed.'),
('종가 김치찌개','생목살180g',16000,'https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C','Historical public menu listing; latest in-store price NOT guaranteed.'),
('종가 김치찌개','김치찌개',9000,'https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C','Historical public menu listing; latest in-store price NOT guaranteed.'),
('공릉닭한마리','닭한마리',33000,'https://www.tabling.co.kr/place/677cc7a066de5f06987510db','Historical public menu listing; latest in-store price NOT guaranteed.'),
('카린지&린가네 광화문점','카린지점보카츠',10900,'https://www.tabling.co.kr/place/677cd44466de5f06988d183d','Historical public menu listing; latest in-store price NOT guaranteed.'),
('카린지&린가네 광화문점','점보유린카츠',16900,'https://www.tabling.co.kr/place/677cd44466de5f06988d183d','Historical public menu listing; latest in-store price NOT guaranteed.'),
('카린지&린가네 광화문점','가쓰오떡볶이',10900,'https://www.tabling.co.kr/place/677cd44466de5f06988d183d','Historical public menu listing; latest in-store price NOT guaranteed.'),
('카린지&린가네 광화문점','야끼소바',12900,'https://www.tabling.co.kr/place/677cd44466de5f06988d183d','Historical public menu listing; latest in-store price NOT guaranteed.'),
('남해굴국밥','굴국밥',10000,'https://www.tabling.co.kr/place/677cc7a066de5f0698751155','Historical public menu listing; latest in-store price NOT guaranteed.'),
('남해굴국밥','굴떡국',10000,'https://www.tabling.co.kr/place/677cc7a066de5f0698751155','Historical public menu listing; latest in-store price NOT guaranteed.'),
('남해굴국밥','굴순두부',10000,'https://www.tabling.co.kr/place/677cc7a066de5f0698751155','Historical public menu listing; latest in-store price NOT guaranteed.'),
('콘크리트 팔레트','옥수수 빙수',19000,'https://www.tabling.co.kr/place/677cd21566de5f0698890f93','Alternative older public listing observed 19,000 KRW; differs from 21,000 KRW on Diningcode. Record both rather than conceal conflict.'),
('콘크리트 팔레트','우유 팥 빙수',19000,'https://www.tabling.co.kr/place/677cd21566de5f0698890f93','Alternative older public listing observed 19,000 KRW; differs from 21,000 KRW on Diningcode. Record both rather than conceal conflict.')
)
INSERT INTO whateato_menu_price_observations_v1(menu_id,source_url,price_krw,checked_on,observation_note)
SELECT m.id,e.source_url,e.price_krw,'2026-10-14'::date,e.observation_note
FROM evidence e JOIN restaurants r ON r.name_ko=e.venue
JOIN whateato_release_cohort_300_v1 c ON c.restaurant_id=r.id
JOIN restaurant_menus m ON m.restaurant_id=r.id AND m.publication_state='published'
JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id AND ml.locale='ko' AND ml.name=e.menu_ko
ON CONFLICT(menu_id,source_url) DO NOTHING;

WITH selected(venue,menu_ko,price_krw,source_url) AS (VALUES
('호호식당 대학로','로스가츠정식',15000,'https://www.diningcode.com/profile.php?rid=YmAt6lKukYOU'),
('호호식당 대학로','가츠나베정식',17000,'https://www.diningcode.com/profile.php?rid=YmAt6lKukYOU'),
('호호식당 대학로','사케동',18000,'https://www.diningcode.com/profile.php?rid=YmAt6lKukYOU'),
('호호식당 대학로','오므라이스',15000,'https://www.diningcode.com/profile.php?rid=YmAt6lKukYOU'),
('온더보더 광화문 D타워점','풀드포크 타코',7500,'https://www.tabling.co.kr/place/677ccac066de5f06987be562'),
('온더보더 광화문 D타워점','콰트로 화이타',65000,'https://www.tabling.co.kr/place/677ccac066de5f06987be562'),
('온더보더 광화문 D타워점','더블스텍클럽 퀘사디아',36000,'https://www.tabling.co.kr/place/677ccac066de5f06987be562'),
('서촌명가','청국장',10000,'https://www.diningcode.com/profile.php?rid=DbMRM7W6D6sl'),
('서촌명가','생선구이',13000,'https://www.diningcode.com/profile.php?rid=DbMRM7W6D6sl'),
('카페르뷰','아메리카노',2500,'https://www.diningcode.com/profile.php?rid=o1lZedCMqair'),
('영덕막회','고등어초절임',22000,'https://www.tabling.co.kr/place/677cccf366de5f069880117d'),
('영덕막회','물회',13000,'https://www.tabling.co.kr/place/677cccf366de5f069880117d'),
('영덕막회','회덮밥',11000,'https://www.tabling.co.kr/place/677cccf366de5f069880117d'),
('소수헌','런치 오마카세',300000,'https://www.tabling.co.kr/place/677cd68866de5f069891271a'),
('소수헌','디너 오마카세',500000,'https://www.tabling.co.kr/place/677cd68866de5f069891271a'),
('동성각','유니짜장',10000,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81'),
('동성각','꿔바루',40000,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81'),
('동성각','탕수육',20000,'https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81'),
('콘크리트 팔레트','생 망고빙수',27000,'https://www.diningcode.com/profile.php?rid=JakX0yyEzkll'),
('콘크리트 팔레트','옥수수 빙수',21000,'https://www.diningcode.com/profile.php?rid=JakX0yyEzkll'),
('콘크리트 팔레트','우유 팥 빙수',21000,'https://www.diningcode.com/profile.php?rid=JakX0yyEzkll'),
('함흥곰보냉면','물냉면',13000,'https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4'),
('함흥곰보냉면','비빔냉면',13000,'https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4'),
('함흥곰보냉면','찐만두',8000,'https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4'),
('육대장 광화문점','옛날전통육개장',12000,'https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809'),
('육대장 광화문점','부대육개장',13000,'https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809'),
('육대장 광화문점','차돌육개장',13000,'https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809'),
('대성집','도가니탕',13000,'https://polle.com/place/2H1VvK/%EB%8C%80%EC%84%B1%EC%A7%91'),
('대성집','수육',30000,'https://polle.com/place/2H1VvK/%EB%8C%80%EC%84%B1%EC%A7%91'),
('대성집','해장국',7000,'https://polle.com/place/2H1VvK/%EB%8C%80%EC%84%B1%EC%A7%91'),
('종가 김치찌개','생삼겹180g',16000,'https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C'),
('종가 김치찌개','생목살180g',16000,'https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C'),
('종가 김치찌개','김치찌개',9000,'https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C'),
('공릉닭한마리','닭한마리',33000,'https://www.tabling.co.kr/place/677cc7a066de5f06987510db'),
('카린지&린가네 광화문점','카린지점보카츠',10900,'https://www.tabling.co.kr/place/677cd44466de5f06988d183d'),
('카린지&린가네 광화문점','점보유린카츠',16900,'https://www.tabling.co.kr/place/677cd44466de5f06988d183d'),
('카린지&린가네 광화문점','가쓰오떡볶이',10900,'https://www.tabling.co.kr/place/677cd44466de5f06988d183d'),
('카린지&린가네 광화문점','야끼소바',12900,'https://www.tabling.co.kr/place/677cd44466de5f06988d183d'),
('남해굴국밥','굴국밥',10000,'https://www.tabling.co.kr/place/677cc7a066de5f0698751155'),
('남해굴국밥','굴떡국',10000,'https://www.tabling.co.kr/place/677cc7a066de5f0698751155'),
('남해굴국밥','굴순두부',10000,'https://www.tabling.co.kr/place/677cc7a066de5f0698751155')
)
UPDATE restaurant_menus m SET price_krw=s.price_krw
FROM selected s JOIN restaurants r ON r.name_ko=s.venue
 JOIN whateato_release_cohort_300_v1 c ON c.restaurant_id=r.id
 JOIN restaurant_menu_localizations ml ON ml.locale='ko' AND ml.name=s.menu_ko
WHERE m.id=ml.menu_id AND m.restaurant_id=r.id AND m.publication_state='published'
 AND m.price_krw IS NULL
 AND EXISTS (SELECT 1 FROM whateato_menu_price_observations_v1 obs
 WHERE obs.menu_id=m.id AND obs.source_url=s.source_url AND obs.price_krw=s.price_krw);
