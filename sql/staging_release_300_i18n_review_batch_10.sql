-- STAGING ONLY. Evidence-backed descriptions for four restaurants.
-- Editorial status remains 'review', and verified_at stays NULL.
WITH edits(restaurant_id,locale,display_name,short_description,source_notes) AS (VALUES
('00e9e195-616d-4793-b6e3-1fbf0655ddd0'::uuid,'ko','대성집','서울 종로구 사직로의 도가니탕 전문 식당입니다. 공개 메뉴에는 도가니탕과 수육, 해장국이 있습니다.','https://www.tabling.co.kr/place/6762812a66de5f0698ee0a5f | https://www.ktriptips.com/kor/food/2438867 | editorial translation review draft 2026-10-14'),
('00e9e195-616d-4793-b6e3-1fbf0655ddd0'::uuid,'en','Daesungjip','A Korean restaurant on Sajik-ro in Jongno specializing in ox knee cartilage soup. Its listed dishes include doganitang, suyuk, and haejangguk.','https://www.tabling.co.kr/place/6762812a66de5f0698ee0a5f | https://www.ktriptips.com/kor/food/2438867 | editorial translation review draft 2026-10-14'),
('00e9e195-616d-4793-b6e3-1fbf0655ddd0'::uuid,'ja','テソンチプ','ソウル・鍾路区の社稷路にあるトガニタン専門店。トガニタン、スユク、ヘジャングクなどがメニューに掲載されています。','https://www.tabling.co.kr/place/6762812a66de5f0698ee0a5f | https://www.ktriptips.com/kor/food/2438867 | editorial translation review draft 2026-10-14'),
('00e9e195-616d-4793-b6e3-1fbf0655ddd0'::uuid,'zh-CN','Daesungjip','位于首尔钟路区社稷路的韩式牛膝软骨汤餐厅。公开菜单有牛膝软骨汤、韩式白切肉和醒酒汤。','https://www.tabling.co.kr/place/6762812a66de5f0698ee0a5f | https://www.ktriptips.com/kor/food/2438867 | editorial translation review draft 2026-10-14'),
('baf7e423-f47c-413f-ba9e-0e8c7aa67000'::uuid,'ko','종가 김치찌개','서울 종로구 삼봉로에 있는 한식당입니다. 김치찌개와 생삼겹살, 생목살 메뉴가 공개 매장 목록에 안내되어 있습니다.','https://www.tabling.co.kr/place/677cc7a066de5f06987510d0 | https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C | editorial translation review draft 2026-10-14'),
('baf7e423-f47c-413f-ba9e-0e8c7aa67000'::uuid,'en','Jongga Kimchi Jjigae','A Korean restaurant on Sambong-ro in Jongno. Its published menu listings include kimchi stew, fresh pork belly, and pork neck cuts.','https://www.tabling.co.kr/place/677cc7a066de5f06987510d0 | https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C | editorial translation review draft 2026-10-14'),
('baf7e423-f47c-413f-ba9e-0e8c7aa67000'::uuid,'ja','チョンガ・キムチチゲ','ソウル・鍾路区の三峰路にある韓国料理店。キムチチゲ、サムギョプサル、豚肩ロースなどのメニューが掲載されています。','https://www.tabling.co.kr/place/677cc7a066de5f06987510d0 | https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C | editorial translation review draft 2026-10-14'),
('baf7e423-f47c-413f-ba9e-0e8c7aa67000'::uuid,'zh-CN','Jongga Kimchi Jjigae','位于首尔钟路区三峰路的韩餐厅。公开菜单包括泡菜汤、鲜五花肉和猪梅花肉等。','https://www.tabling.co.kr/place/677cc7a066de5f06987510d0 | https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C | editorial translation review draft 2026-10-14'),
('3150419d-30a3-4581-8bfc-089727568ecd'::uuid,'ko','공릉닭한마리','서울 종로구 종로40가길의 닭한마리 전문점입니다. 인원에 따라 닭한마리, 닭한마리반, 닭두마리 메뉴가 안내되어 있습니다.','https://autoreserve.com/ko/restaurants/c5jCegiKAHtywsD4DEn3 | https://www.diningcode.com/profile.php?rid=XEwdq0FWIpKB | editorial translation review draft 2026-10-14'),
('3150419d-30a3-4581-8bfc-089727568ecd'::uuid,'en','Gongneung Dak Hanmari','A whole-chicken hot pot restaurant on Jong-ro 40ga-gil in Seoul. The listed servings include one chicken, one-and-a-half chickens, and two chickens.','https://autoreserve.com/ko/restaurants/c5jCegiKAHtywsD4DEn3 | https://www.diningcode.com/profile.php?rid=XEwdq0FWIpKB | editorial translation review draft 2026-10-14'),
('3150419d-30a3-4581-8bfc-089727568ecd'::uuid,'ja','コンヌンタッカンマリ','ソウル・鍾路区の鍾路40ガギルにあるタッカンマリ専門店。鶏1羽、1羽半、2羽の鍋料理がメニューに掲載されています。','https://autoreserve.com/ko/restaurants/c5jCegiKAHtywsD4DEn3 | https://www.diningcode.com/profile.php?rid=XEwdq0FWIpKB | editorial translation review draft 2026-10-14'),
('3150419d-30a3-4581-8bfc-089727568ecd'::uuid,'zh-CN','孔陵一只鸡（Gongneung Dak Hanmari）','位于首尔钟路区钟路40街的韩式整鸡火锅专门店。公开菜单有一只鸡、一只半鸡和双鸡火锅。','https://autoreserve.com/ko/restaurants/c5jCegiKAHtywsD4DEn3 | https://www.diningcode.com/profile.php?rid=XEwdq0FWIpKB | editorial translation review draft 2026-10-14'),
('9e681f51-90d7-43ef-9caf-43487eef46f5'::uuid,'ko','남해굴국밥','서울 종로구 대학로1길의 굴 요리 전문 식당입니다. 굴국밥, 굴떡국, 굴순두부 등의 메뉴가 소개되어 있습니다.','https://www.tabling.co.kr/place/677cc7a066de5f0698751155 | https://www.daangn.com/kr/local-profile/%EB%82%A8%ED%95%B4%EA%B5%B4%EA%B5%AD%EB%B0%A5-co8wtymc8kq7/ | editorial translation review draft 2026-10-14'),
('9e681f51-90d7-43ef-9caf-43487eef46f5'::uuid,'en','Namhae Oyster Gukbap','A Korean oyster restaurant on Daehang-ro 1-gil in Jongno. Its listed dishes include oyster rice soup, oyster rice cake soup, and oyster soft tofu stew.','https://www.tabling.co.kr/place/677cc7a066de5f0698751155 | https://www.daangn.com/kr/local-profile/%EB%82%A8%ED%95%B4%EA%B5%B4%EA%B5%AD%EB%B0%A5-co8wtymc8kq7/ | editorial translation review draft 2026-10-14'),
('9e681f51-90d7-43ef-9caf-43487eef46f5'::uuid,'ja','ナメ・クルクッパ','ソウル・鍾路区の大学路1ギルにある牡蠣料理の店。牡蠣クッパ、牡蠣トックク、牡蠣スンドゥブなどが紹介されています。','https://www.tabling.co.kr/place/677cc7a066de5f0698751155 | https://www.daangn.com/kr/local-profile/%EB%82%A8%ED%95%B4%EA%B5%B4%EA%B5%AD%EB%B0%A5-co8wtymc8kq7/ | editorial translation review draft 2026-10-14'),
('9e681f51-90d7-43ef-9caf-43487eef46f5'::uuid,'zh-CN','Namhae Oyster Gukbap','位于首尔钟路区大学路1街的牡蛎料理餐厅。公开菜单包括牡蛎汤饭、牡蛎年糕汤和牡蛎嫩豆腐汤。','https://www.tabling.co.kr/place/677cc7a066de5f0698751155 | https://www.daangn.com/kr/local-profile/%EB%82%A8%ED%95%B4%EA%B5%B4%EA%B5%AD%EB%B0%A5-co8wtymc8kq7/ | editorial translation review draft 2026-10-14')
)
UPDATE restaurant_localizations l
SET display_name=e.display_name,
 short_description=e.short_description,
 publication_state='review',
 source_notes=e.source_notes,
 updated_at=now()
FROM edits e
WHERE l.restaurant_id=e.restaurant_id AND l.locale=e.locale
AND l.publication_state='draft'
AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%';
