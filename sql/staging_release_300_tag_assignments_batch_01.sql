-- WhatEatO Seoul 300: provenance-based and reversible tag candidates.
-- Stage ONLY. Permit-verified city/area source tags can be displayed;
-- permit CUISINE and menu in store inferred from business NAME remain proposed.
-- No subjective 'date', 'quiet', 'family', or 'budget' tags are inferred.
-- This does not overwrite earlier verified/rejected tags.
WITH cohort AS (
 SELECT c.restaurant_id, c.district,r.name_ko,r.category_code,
  coalesce(nullif(btrim(r.road_address_ko),''),nullif(btrim(r.lot_address_ko),''),'') AS address
 FROM whateato_release_cohort_300_v1 c
 JOIN restaurants r ON r.id=c.restaurant_id
), proposed AS (
 SELECT restaurant_id,
 CASE category_code
  WHEN '한식' THEN 'korean_food'
  WHEN '중국식' THEN 'chinese_food'
  WHEN '일식' THEN 'japanese_food'
  WHEN '경양식' THEN 'western_food'
  WHEN '분식' THEN 'snack_meals'
  WHEN '김밥(도시락)' THEN 'snack_meals'
  WHEN '까페' THEN 'cafe'
  WHEN '카페' THEN 'cafe'
  WHEN '전통찻집' THEN 'traditional_tea'
  WHEN '라이브카페' THEN 'cafe'
  WHEN '호프/통닭' THEN 'korean_pub_food'
  WHEN '정종/대포집/소주방' THEN 'korean_pub_food'
  WHEN '외국음식전문점(인도,태국등)' THEN 'international_food'
  WHEN '횟집' THEN 'seafood'
  ELSE NULL END AS tag_code,
  'permit-category:' || coalesce(category_code,'UNKNOWN')
  || ';unreviewed-for-real-venue-identity' AS evidence_ref
 FROM cohort
 UNION ALL
 SELECT restaurant_id,
 CASE
 WHEN name_ko ~ '(냉면|냉麵)' THEN 'cold_noodles'
 WHEN name_ko ~ '(오마카세)' THEN 'omakase'
 WHEN name_ko ~ '(횟집|회집|막회)' THEN 'sashimi'
 WHEN name_ko ~ '(삼계탕|곰탕|설렁탕|해장국)' THEN 'soup_specialty'
 WHEN name_ko ~ '(마라탕)' THEN 'soup_specialty'
 WHEN name_ko ~ '(치킨)' THEN 'chicken_specialty'
 WHEN name_ko ~ '(카페|커피)' THEN 'coffee'
 ELSE NULL END,
 'name-keyword:'||left(name_ko,110)||';unverified-in-store-products'
 FROM cohort
), area AS (
 SELECT restaurant_id,CASE WHEN district='종로구' THEN 'area_jongno' ELSE 'area_jung' END AS tag_code,
  'permit-source:restaurants.region_sigungu/'||restaurant_id::text AS evidence_ref
 FROM cohort
 UNION ALL
 SELECT restaurant_id,
 CASE
  WHEN address ~ '(^|[[:space:]])대학로' THEN 'area_daehangno'
  WHEN address LIKE '%인사동%' THEN 'area_insadong'
  WHEN address LIKE '%명동%' THEN 'area_myeongdong'
  WHEN address LIKE '%을지로%' THEN 'area_euljiro'
  WHEN address LIKE '%충무로%' THEN 'area_chungmuro'
  WHEN address LIKE '%남대문%' THEN 'area_namdaemun'
  WHEN address LIKE '%동대문%' THEN 'area_dongdaemun'
  WHEN address LIKE '%북촌%' THEN 'area_bukchon'
  WHEN address LIKE '%혜화%' THEN 'area_hyehwa'
  WHEN address LIKE '%종로3가%' THEN 'area_jongno3ga'
  ELSE NULL END,
  'permit-source:restaurants.address/'||restaurant_id::text
 FROM cohort
)
 INSERT INTO restaurant_tag_assignments(restaurant_id,tag_code,verification_state,evidence_ref,verified_at)
 SELECT restaurant_id,tag_code,'verified',evidence_ref,now() FROM area
 WHERE tag_code IS NOT NULL
 ON CONFLICT(restaurant_id,tag_code) DO NOTHING;

WITH cohort AS (
 SELECT c.restaurant_id, c.district,r.name_ko,r.category_code,
  coalesce(nullif(btrim(r.road_address_ko),''),nullif(btrim(r.lot_address_ko),''),'') AS address
 FROM whateato_release_cohort_300_v1 c
 JOIN restaurants r ON r.id=c.restaurant_id
), proposed AS (
 SELECT restaurant_id,
 CASE category_code
  WHEN '한식' THEN 'korean_food'
  WHEN '중국식' THEN 'chinese_food'
  WHEN '일식' THEN 'japanese_food'
  WHEN '경양식' THEN 'western_food'
  WHEN '분식' THEN 'snack_meals'
  WHEN '김밥(도시락)' THEN 'snack_meals'
  WHEN '까페' THEN 'cafe'
  WHEN '카페' THEN 'cafe'
  WHEN '전통찻집' THEN 'traditional_tea'
  WHEN '라이브카페' THEN 'cafe'
  WHEN '호프/통닭' THEN 'korean_pub_food'
  WHEN '정종/대포집/소주방' THEN 'korean_pub_food'
  WHEN '외국음식전문점(인도,태국등)' THEN 'international_food'
  WHEN '횟집' THEN 'seafood'
  ELSE NULL END AS tag_code,
  'permit-category:' || coalesce(category_code,'UNKNOWN')
  || ';unreviewed-for-real-venue-identity' AS evidence_ref
 FROM cohort
 UNION ALL
 SELECT restaurant_id,
 CASE
 WHEN name_ko ~ '(냉면|냉麵)' THEN 'cold_noodles'
 WHEN name_ko ~ '(오마카세)' THEN 'omakase'
 WHEN name_ko ~ '(횟집|회집|막회)' THEN 'sashimi'
 WHEN name_ko ~ '(삼계탕|곰탕|설렁탕|해장국)' THEN 'soup_specialty'
 WHEN name_ko ~ '(마라탕)' THEN 'soup_specialty'
 WHEN name_ko ~ '(치킨)' THEN 'chicken_specialty'
 WHEN name_ko ~ '(카페|커피)' THEN 'coffee'
 ELSE NULL END,
 'name-keyword:'||left(name_ko,110)||';unverified-in-store-products'
 FROM cohort
), area AS (
 SELECT restaurant_id,CASE WHEN district='종로구' THEN 'area_jongno' ELSE 'area_jung' END AS tag_code,
  'permit-source:restaurants.region_sigungu/'||restaurant_id::text AS evidence_ref
 FROM cohort
 UNION ALL
 SELECT restaurant_id,
 CASE
  WHEN address ~ '(^|[[:space:]])대학로' THEN 'area_daehangno'
  WHEN address LIKE '%인사동%' THEN 'area_insadong'
  WHEN address LIKE '%명동%' THEN 'area_myeongdong'
  WHEN address LIKE '%을지로%' THEN 'area_euljiro'
  WHEN address LIKE '%충무로%' THEN 'area_chungmuro'
  WHEN address LIKE '%남대문%' THEN 'area_namdaemun'
  WHEN address LIKE '%동대문%' THEN 'area_dongdaemun'
  WHEN address LIKE '%북촌%' THEN 'area_bukchon'
  WHEN address LIKE '%혜화%' THEN 'area_hyehwa'
  WHEN address LIKE '%종로3가%' THEN 'area_jongno3ga'
  ELSE NULL END,
  'permit-source:restaurants.address/'||restaurant_id::text
 FROM cohort
)
 INSERT INTO restaurant_tag_assignments(restaurant_id,tag_code,verification_state,evidence_ref,verified_at)
 SELECT restaurant_id,tag_code,'proposed',evidence_ref,NULL FROM proposed
 WHERE tag_code IS NOT NULL
 ON CONFLICT(restaurant_id,tag_code) DO NOTHING;
