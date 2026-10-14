-- WhatEatO release quality audit v1
-- READ ONLY. Run on Neon staging first; no UPDATE/DELETE/INSERT.
-- Scope: business classification, original and display names, addresses,
-- coordinates, verified menus, four-language publication coverage.

-- 1. Overall identity / geodata coverage.
SELECT count(*) AS restaurants,
 count(*) FILTER (WHERE publication_status='published' AND business_status='active') AS publicly_eligible,
 count(*) FILTER (WHERE name_ko ~ '^[[:space:]]*(\(주\)|㈜|주식회사|\(유\)|유한회사)') AS legal_prefix_names,
 count(*) FILTER (WHERE nullif(btrim(road_address_ko),'') IS NULL) AS road_missing,
 count(*) FILTER (WHERE nullif(btrim(road_address_ko),'') IS NULL AND
   nullif(btrim(lot_address_ko),'') IS NOT NULL) AS valid_lot_fallback,
 count(*) FILTER (WHERE nullif(btrim(road_address_ko),'') IS NULL AND
   nullif(btrim(lot_address_ko),'') IS NULL) AS address_missing,
 count(*) FILTER (WHERE latitude IS NULL OR longitude IS NULL) AS coordinates_missing
FROM restaurants;

-- 2. Category distribution: '기타' requires review, NOT automatic rejection.
SELECT coalesce(category_code,'[NULL]') AS category,count(*) AS cnt
FROM restaurants GROUP BY 1 ORDER BY cnt DESC;

-- 3. Possible non-food names to manually investigate. Not a deletion query.
SELECT id,name_ko,category_code,
 coalesce(nullif(btrim(road_address_ko),''),nullif(btrim(lot_address_ko),'')) AS best_available_address
FROM restaurants
WHERE name_ko ~* '(문화공간|전시관|미술관|공연장|스터디카페|독서실|노래방|사진관|공유오피스|문화센터|학원|사무소|사무실|헬스장|피트니스|부동산|복지관)'
ORDER BY name_ko;

-- 4. Duplicate names after the public-only legal prefix is removed.
-- Do NOT merge entities on name alone (floor / address / legal IDs may differ).
WITH normalized AS (
 SELECT id,name_ko,region_sigungu,
  btrim(regexp_replace(name_ko,
    '^[[:space:]]*(\(주\)|㈜|주식회사|\(유\)|유한회사)[[:space:]]*','','g')) AS cleaned
 FROM restaurants
)
SELECT region_sigungu,cleaned,count(*) AS cnt
FROM normalized WHERE cleaned <> name_ko
GROUP BY 1,2 HAVING count(*)>1 ORDER BY cnt DESC,cleaned;

-- 5. Source-backed MENU coverage: no guessing from cuisine category.
SELECT
 (SELECT count(*) FROM restaurants) AS restaurant_total,
 (SELECT count(DISTINCT restaurant_id) FROM restaurant_menus
  WHERE publication_state='published'
   AND nullif(btrim(evidence_ref),'') IS NOT NULL) AS restaurants_with_verified_menus,
 (SELECT count(*) FROM restaurant_menus) AS all_menu_rows,
 (SELECT count(*) FROM restaurant_menus
  WHERE publication_state='published'
   AND nullif(btrim(evidence_ref),'') IS NOT NULL) AS verified_menu_rows;

-- 6. Four-language published restaurant descriptions.
SELECT locale,
 count(DISTINCT restaurant_id) AS localized_restaurants,
 count(*) FILTER(WHERE nullif(btrim(display_name),'') IS NOT NULL) AS names,
 count(*) FILTER(WHERE nullif(btrim(short_description),'') IS NOT NULL) AS descriptions
FROM restaurant_localizations
WHERE publication_state='published'
GROUP BY 1 ORDER BY 1;

-- 7. Localized menus (data may be in review, not public).
SELECT locale,count(*) AS menu_translations,
 count(*) FILTER(WHERE nullif(btrim(name),'') IS NOT NULL) AS nonblank
FROM restaurant_menu_localizations GROUP BY 1 ORDER BY 1;

-- 8. Distinguish suspected from confirmed-held. Only confirmed holds can be excluded.
SELECT review_state,issue_code,count(*) AS cnt
FROM restaurant_data_quality_reviews
GROUP BY 1,2 ORDER BY cnt DESC;

-- 9. Geographic distribution prevents misleading claims of nationwide coverage.
SELECT region_sido,region_sigungu,count(*) AS restaurants
FROM restaurants GROUP BY 1,2 ORDER BY restaurants DESC;
