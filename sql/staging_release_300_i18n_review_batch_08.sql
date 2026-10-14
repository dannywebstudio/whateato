-- Upgrade only our four-locale generic permit drafts into branch-specific review text.
-- These descriptions are NOT published, verified_at remains NULL; preserve original permit name.
WITH edits(restaurant_id,locale,display_name,short_description,source_notes) AS
(VALUES ('f4ff3489-28f9-472d-8d3b-85077809c327'::uuid,'ko','육대장 광화문점','서울 종로구 새문안로5길에 있는 육개장 전문 식당입니다. 공개 메뉴에는 옛날전통육개장, 부대육개장, 차돌육개장이 안내되어 있습니다.','https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809 | https://www.diningcode.com/profile.php?rid=poa37lBmMHv3 | editorial draft, verified branch and menu names 2026-10-14'),
('f4ff3489-28f9-472d-8d3b-85077809c327'::uuid,'en','Yukdaejang Gwanghwamun','A yukgaejang restaurant on Saemunan-ro 5-gil in central Seoul. The branch listings include traditional spicy beef soup, budae-style yukgaejang, and beef brisket yukgaejang.','https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809 | https://www.diningcode.com/profile.php?rid=poa37lBmMHv3 | editorial draft, verified branch and menu names 2026-10-14'),
('f4ff3489-28f9-472d-8d3b-85077809c327'::uuid,'ja','ユクデジャン 光化門店','ソウル・鍾路区のセムナン路5ギルにあるユッケジャン専門店。従来のユッケジャン、プデ風ユッケジャン、チャドルバギ入りユッケジャンがメニューに掲載されています。','https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809 | https://www.diningcode.com/profile.php?rid=poa37lBmMHv3 | editorial draft, verified branch and menu names 2026-10-14'),
('f4ff3489-28f9-472d-8d3b-85077809c327'::uuid,'zh-CN','Yukdaejang 光化门店','位于首尔钟路区新门内路5街的韩式辣牛肉汤餐厅。公开菜单包括传统辣牛肉汤、部队风味辣牛肉汤和牛胸肉辣牛肉汤。','https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809 | https://www.diningcode.com/profile.php?rid=poa37lBmMHv3 | editorial draft, verified branch and menu names 2026-10-14'),
('cf066202-160e-47fe-a8b2-38697508b857'::uuid,'ko','카린지&린가네 광화문점','서울 종로구 종로5길의 일식 식사·안주 메뉴를 소개하는 매장입니다. 카린지점보카츠, 점보유린카츠, 가쓰오떡볶이와 야끼소바가 공개 메뉴에 등록되어 있습니다.','https://www.tabling.co.kr/place/677cd44466de5f06988d183d | https://polle.com/place/2Tq0db/%EC%B9%B4%EB%A6%B0%EC%A7%80%20%EB%A6%B0%EA%B0%80%EB%84%A4 | editorial draft, verified branch and menu names 2026-10-14'),
('cf066202-160e-47fe-a8b2-38697508b857'::uuid,'en','Karinji & Ringane Gwanghwamun','A Japanese-style dining and snack bar on Jong-ro 5-gil. Branch menu listings include jumbo pork cutlet, yurin-style cutlet, bonito-flavored tteokbokki, and yakisoba.','https://www.tabling.co.kr/place/677cd44466de5f06988d183d | https://polle.com/place/2Tq0db/%EC%B9%B4%EB%A6%B0%EC%A7%80%20%EB%A6%B0%EA%B0%80%EB%84%A4 | editorial draft, verified branch and menu names 2026-10-14'),
('cf066202-160e-47fe-a8b2-38697508b857'::uuid,'ja','カリンジ＆リンガネ 光化門店','ソウル・鍾路5ギルの日本風料理とおつまみを扱う店舗。ジャンボカツ、油淋カツ、かつお風味トッポッキ、焼きそばなどがメニューに掲載されています。','https://www.tabling.co.kr/place/677cd44466de5f06988d183d | https://polle.com/place/2Tq0db/%EC%B9%B4%EB%A6%B0%EC%A7%80%20%EB%A6%B0%EA%B0%80%EB%84%A4 | editorial draft, verified branch and menu names 2026-10-14'),
('cf066202-160e-47fe-a8b2-38697508b857'::uuid,'zh-CN','Karinji & Ringane 光化门店','位于首尔钟路5街的日式餐食与小吃店。公开菜单包括大份炸猪排、油淋炸猪排、柴鱼风味炒年糕及日式炒面。','https://www.tabling.co.kr/place/677cd44466de5f06988d183d | https://polle.com/place/2Tq0db/%EC%B9%B4%EB%A6%B0%EC%A7%80%20%EB%A6%B0%EA%B0%80%EB%84%A4 | editorial draft, verified branch and menu names 2026-10-14'))
UPDATE restaurant_localizations l
SET display_name=e.display_name,short_description=e.short_description,
 publication_state='review',source_notes=e.source_notes,updated_at=now()
FROM edits e
WHERE l.restaurant_id=e.restaurant_id AND l.locale=e.locale
 AND l.publication_state='draft'
 AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%';
