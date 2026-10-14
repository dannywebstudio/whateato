-- STAGING ONLY, initial four-language review drafts for the 300 chosen venue IDs.
-- Provenance: public permit name + Seoul district (NO claimed menu/operations).
-- Retain existing published / reviewed localizations. Foreign display_name
-- keeps exact Korean trading name until independently verified romanization.
-- Drafts have no verified_at and are NOT public.
INSERT INTO restaurant_localizations
 (restaurant_id,locale,display_name,short_description,full_description,
  publication_state,source_notes,verified_at)
SELECT c.restaurant_id,l.locale,
 btrim(regexp_replace(r.name_ko,'^[[:space:]]*(\([[:space:]]*주[[:space:]]*\)|㈜|주식회사|\([[:space:]]*유[[:space:]]*\)|유한회사)[[:space:]]*','','g')),
 CASE l.locale
  WHEN 'ko' THEN format('서울 %s의 식품접객업 인허가 자료에 등록된 장소입니다. 실제 메뉴와 현재 영업 여부는 확인 중입니다.',c.district)
  WHEN 'en' THEN format('A food-service permit listing in %s, Seoul. Its current menu and operating status are being verified.',CASE c.district WHEN '종로구' THEN 'Jongno-gu' ELSE 'Jung-gu' END)
  WHEN 'ja' THEN format('ソウル市%sの飲食業許可情報に登録された施設です。現在のメニューと営業状況は確認中です。',CASE c.district WHEN '종로구' THEN '鍾路区' ELSE '中区' END)
  WHEN 'zh-CN' THEN format('这是首尔%s的一处餐饮业许可登记场所，实际菜单及当前营业状态仍在核实中。',CASE c.district WHEN '종로구' THEN '钟路区' ELSE '中区' END)
 END,
 NULL,'draft',
 'release300:2026-10-14:public-permit-district-only; auto-language factual fallback, brand untranslated; editorial, identity, menus and operating status unverified',
 NULL
FROM whateato_release_cohort_300_v1 c
JOIN restaurants r ON r.id=c.restaurant_id
CROSS JOIN (VALUES('ko'),('en'),('ja'),('zh-CN')) l(locale)
WHERE NOT EXISTS (
 SELECT 1 FROM restaurant_localizations existing
 WHERE existing.restaurant_id=c.restaurant_id AND existing.locale=l.locale)
ON CONFLICT(restaurant_id,locale) DO NOTHING;
