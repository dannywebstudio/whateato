-- Stage-only. Do not deploy to prod. Gold/Geummun exact licensed address verified by Korea Tourism data.
WITH edits(restaurant_id,locale,display_name,short_description,source_notes) AS (VALUES
('c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,'ko','금문','서울 종로구 창경궁로 269-1에 있는 중식당입니다. 같은 주소의 공개 메뉴에는 탕수육, 전가복, 5가지 냉채와 A·B·C 코스 요리가 안내되어 있습니다.','https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192 | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | https://www.tabling.co.kr/place/677cc7a066de5f069875108d | tourism and branch menu source 2026-10-14'),
('c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,'en','Geummun','A Chinese restaurant on Changgyeonggung-ro in Jongno, Seoul. Menus listed for this location include sweet-and-sour pork, premium seafood stir-fry, a cold appetizer assortment and courses A, B and C.','https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192 | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | https://www.tabling.co.kr/place/677cc7a066de5f069875108d | tourism and branch menu source 2026-10-14'),
('c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,'ja','金門（クムムン）','ソウル・鍾路区の昌慶宮路にある中華料理店。同じ住所のメニューには酢豚、海鮮と野菜の炒め物、五種の冷菜、A・B・Cコースが掲載されています。','https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192 | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | https://www.tabling.co.kr/place/677cc7a066de5f069875108d | tourism and branch menu source 2026-10-14'),
('c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid,'zh-CN','金门（Geummun）','位于首尔钟路区昌庆宫路的中餐馆。该地址的公开菜单包括糖醋肉、全家福海鲜菜、五味冷盘，以及A、B、C套餐。','https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192 | https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8 | https://www.tabling.co.kr/place/677cc7a066de5f069875108d | tourism and branch menu source 2026-10-14')
)
UPDATE restaurant_localizations l SET display_name=e.display_name,short_description=e.short_description,
 source_notes=e.source_notes,publication_state='review',updated_at=now()
FROM edits e WHERE l.restaurant_id=e.restaurant_id AND l.locale=e.locale
 AND l.publication_state='draft'
 AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%';

UPDATE restaurant_localizations l
 SET publication_state='published',verified_at=now(),updated_at=now()
WHERE l.restaurant_id='c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid AND l.publication_state='review'
 AND (SELECT COUNT(DISTINCT x.locale) FROM restaurant_localizations x
 WHERE x.restaurant_id=l.restaurant_id AND x.locale IN('ko','en','ja','zh-CN')
 AND x.publication_state='review'
 AND x.source_notes LIKE '%https://%'
 AND NULLIF(BTRIM(x.display_name),'') IS NOT NULL
 AND NULLIF(BTRIM(x.short_description),'') IS NOT NULL)=4
 AND (SELECT COUNT(*) FROM restaurant_menus m WHERE m.restaurant_id=l.restaurant_id AND m.publication_state='published' AND m.price_krw IS NOT NULL AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL)>=3
 AND NOT EXISTS (SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=l.restaurant_id AND q.review_state IN('pending','confirmed_hold'));

UPDATE whateato_release_cohort_300_v1 c SET review_state='approved',reviewed_at=now(),
 reviewer_note='AI-assisted cross-check: Korea Tourism Corporation menu + 2 independent branch listings, translations reviewed 2026-10-14. Staging only; actual in-store prices may differ.'
WHERE c.restaurant_id='c3eada1d-b6de-4ff2-a3ae-af5f8b73f786'::uuid AND c.review_state='pending'
 AND NOT EXISTS (SELECT 1 FROM restaurant_data_quality_reviews q WHERE q.restaurant_id=c.restaurant_id AND q.review_state IN('pending','confirmed_hold'))
 AND (SELECT COUNT(*) FROM restaurant_localizations l WHERE l.restaurant_id=c.restaurant_id AND l.publication_state='published' AND l.locale IN('ko','en','ja','zh-CN'))=4
 AND (SELECT count(*) FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published' AND m.price_krw IS NOT NULL)>=3
 AND NOT EXISTS (SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published' AND (SELECT COUNT(DISTINCT ml.locale) FROM restaurant_menu_localizations ml WHERE ml.menu_id=m.id AND ml.locale IN('ko','en','ja','zh-CN'))<>4);
