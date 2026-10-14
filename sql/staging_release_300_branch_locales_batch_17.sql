-- Staging only. Two branch descriptions, plus removal of unverified Chinese-character name.
WITH edits(restaurant_id,locale,display_name,short_description,source_notes) AS (VALUES
('7f4cea98-3a10-4588-954b-85e1e5f58b0f'::uuid,'ko','남대문막내횟집 광교점','서울 종로구 우정국로 4-1 2층에 있는 횟집입니다. 점심특선 메뉴로 회정식·회덮밥·알밥에 매운탕이 곁들여진 구성이 소개되어 있습니다.','https://www.tabling.co.kr/place/677cc7a066de5f069875106e | https://polle.com/place/4XuDxg/%EB%82%A8%EB%8C%80%EB%AC%B8%20%EB%A7%89%EB%82%B4%ED%9A%8C%EC%A7%91 | editor cross-check 2026-10-14; name resolution needed for #58'),
('7f4cea98-3a10-4588-954b-85e1e5f58b0f'::uuid,'en','Namdaemun Maknae Hoetjip Gwanggyo','A sashimi restaurant on Ujeongguk-ro in Jongno. The branch lists lunch sets pairing sashimi, a raw-fish rice bowl, or fish-roe rice with spicy fish soup.','https://www.tabling.co.kr/place/677cc7a066de5f069875106e | https://polle.com/place/4XuDxg/%EB%82%A8%EB%8C%80%EB%AC%B8%20%EB%A7%89%EB%82%B4%ED%9A%8C%EC%A7%91 | editor cross-check 2026-10-14; name resolution needed for #58'),
('7f4cea98-3a10-4588-954b-85e1e5f58b0f'::uuid,'ja','南大門マクネ刺身店 光橋店','ソウル・鍾路区の郵征局路にある刺身料理店。昼のセットには刺身定食、刺身丼、とびこご飯などがあり、魚の辛いスープが付きます。','https://www.tabling.co.kr/place/677cc7a066de5f069875106e | https://polle.com/place/4XuDxg/%EB%82%A8%EB%8C%80%EB%AC%B8%20%EB%A7%89%EB%82%B4%ED%9A%8C%EC%A7%91 | editor cross-check 2026-10-14; name resolution needed for #58'),
('7f4cea98-3a10-4588-954b-85e1e5f58b0f'::uuid,'zh-CN','Namdaemun Maknae 生鱼片店 光桥店','位于首尔钟路区邮征局路的生鱼片餐厅。午市套餐包含生鱼片定食、生鱼片盖饭或鱼籽饭，并搭配辣鱼汤。','https://www.tabling.co.kr/place/677cc7a066de5f069875106e | https://polle.com/place/4XuDxg/%EB%82%A8%EB%8C%80%EB%AC%B8%20%EB%A7%89%EB%82%B4%ED%9A%8C%EC%A7%91 | editor cross-check 2026-10-14; name resolution needed for #58'),
('47e72d60-a8cd-4fe6-8c6a-94a49e9b7383'::uuid,'ko','시조명동진성닭칼국수 (상호 확인 중)','서울 종로구 종로40가길 10에 등록된 식당입니다. 해당 주소의 공개 매장 자료에는 닭한마리, 닭볶음탕, 삼계탕이 소개되지만 현재 상호와 인허가 상호의 동일성은 확인 중입니다.','https://www.tabling.co.kr/place/677cc7a066de5f06987510f0 | https://polle.com/place/1YSBy3/%EB%AA%85%EB%8F%99%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | editor cross-check 2026-10-14; name resolution needed for #58'),
('47e72d60-a8cd-4fe6-8c6a-94a49e9b7383'::uuid,'en','Sijo Myeongdong Chicken Restaurant (name under review)','This registered venue is at Jong-ro 40ga-gil 10 in Seoul. Listings for that address show whole-chicken hot pot, spicy braised chicken, and ginseng chicken soup; the current trading name is still being checked.','https://www.tabling.co.kr/place/677cc7a066de5f06987510f0 | https://polle.com/place/1YSBy3/%EB%AA%85%EB%8F%99%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | editor cross-check 2026-10-14; name resolution needed for #58'),
('47e72d60-a8cd-4fe6-8c6a-94a49e9b7383'::uuid,'ja','シジョ明洞鶏料理店（店名確認中）','ソウル・鍾路40ガギル10に登録された飲食施設です。同住所の店舗情報にはタッカンマリ、鶏の辛煮、サムゲタンがありますが、現在の屋号との一致は確認中です。','https://www.tabling.co.kr/place/677cc7a066de5f06987510f0 | https://polle.com/place/1YSBy3/%EB%AA%85%EB%8F%99%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | editor cross-check 2026-10-14; name resolution needed for #58'),
('47e72d60-a8cd-4fe6-8c6a-94a49e9b7383'::uuid,'zh-CN','Sijo 明洞鸡料理店（店名待确认）','登记地址为首尔钟路40街10号。同址公开餐厅资料介绍整鸡火锅、辣炖鸡和参鸡汤，但目前仍在核对登记店名与现用店名是否一致。','https://www.tabling.co.kr/place/677cc7a066de5f06987510f0 | https://polle.com/place/1YSBy3/%EB%AA%85%EB%8F%99%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC | editor cross-check 2026-10-14; name resolution needed for #58')
)
UPDATE restaurant_localizations l SET
 display_name=e.display_name,short_description=e.short_description,source_notes=e.source_notes,
 publication_state='review',updated_at=now()
FROM edits e WHERE l.restaurant_id=e.restaurant_id AND l.locale=e.locale AND l.publication_state='draft'
 AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%';
UPDATE restaurant_localizations SET display_name='Gabongru',updated_at=now()
WHERE restaurant_id='ae7cd325-e248-4962-9f5f-f374071cb940'::uuid
AND locale='zh-CN' AND publication_state='review'
AND display_name='Gabongru（佳凤楼）';
