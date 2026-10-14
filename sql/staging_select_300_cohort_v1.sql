-- NON-DESTRUCTIVE. Apply on Neon STAGING ONLY. Excludes photos and ratings.
-- Candidate 300 only: review_state='pending' is NOT approved and does NOT
-- change production/public visibility. Existing source permit data untouched.
-- 180 Jongno + 120 Jung; balanced 9 category buckets per district.
-- Distances are distance-to-tourism-hub heuristics, not verified popularity.
-- Cohort avoids pending non-food keyword flags and confirmed holds.
-- Identity duplicate exclusion uses exact consumer name+source address,
-- keeping source records intact; no merges or deletes.
-- DO NOT EXECUTE AGAINST PRODUCTION.

-- Statement 1: candidate cohort table
CREATE TABLE IF NOT EXISTS whateato_release_cohort_300_v1 (
 restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE RESTRICT,
 cohort_rank integer UNIQUE NOT NULL CHECK (cohort_rank BETWEEN 1 AND 300),
 district text NOT NULL CHECK (district IN ('종로구','중구')),
 category_bucket text NOT NULL,
 source_sample_rank integer,
 selection_rule_version text NOT NULL DEFAULT 'tourism-hubs-v1',
 review_state text NOT NULL DEFAULT 'pending' CHECK (review_state IN ('pending','approved','hold')),
 selected_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 reviewer_note text
);

-- Statement 2: deterministic initial 300
WITH quotas(district,bucket,quota) AS (
 VALUES
 ('종로구','korean',75),('종로구','western',22),('종로구','snack',20),
 ('종로구','japanese',14),('종로구','chinese',11),('종로구','cafe',12),
 ('종로구','pub_chicken',10),('종로구','other',10),('종로구','foreign',6),
 ('중구','korean',40),('중구','western',16),('중구','snack',14),
 ('중구','japanese',11),('중구','chinese',10),('중구','cafe',10),
 ('중구','pub_chicken',8),('중구','other',6),('중구','foreign',5)
), base AS (
 SELECT r.id,r.name_ko,r.region_sigungu AS district,r.category_code,r.latitude,r.longitude,
 s.sample_rank,
 CASE
 WHEN r.category_code='한식' THEN 'korean'
 WHEN r.category_code='경양식' THEN 'western'
 WHEN r.category_code IN ('분식','김밥(도시락)') THEN 'snack'
 WHEN r.category_code='일식' THEN 'japanese'
 WHEN r.category_code='중국식' THEN 'chinese'
 WHEN r.category_code IN ('까페','카페','커피숍','전통찻집','라이브카페') THEN 'cafe'
 WHEN r.category_code IN ('호프/통닭','통닭(치킨)','정종/대포집/소주방','감성주점') THEN 'pub_chicken'
 WHEN r.category_code='외국음식전문점(인도,태국등)' THEN 'foreign'
 ELSE 'other' END bucket,
 EXISTS (SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=r.id
 AND m.publication_state='published' AND nullif(btrim(m.evidence_ref),'') IS NOT NULL) AS verified_menu,
 LEAST(
 POWER((r.latitude-37.5710)*111.195,2)+POWER((r.longitude-126.9790)*88.5,2),
 POWER((r.latitude-37.5740)*111.195,2)+POWER((r.longitude-126.9850)*88.5,2),
 POWER((r.latitude-37.5710)*111.195,2)+POWER((r.longitude-126.9910)*88.5,2),
 POWER((r.latitude-37.5820)*111.195,2)+POWER((r.longitude-127.0010)*88.5,2),
 POWER((r.latitude-37.5790)*111.195,2)+POWER((r.longitude-126.9710)*88.5,2),
 POWER((r.latitude-37.5800)*111.195,2)+POWER((r.longitude-126.9840)*88.5,2)
 ) AS jongno_anchor_distance_sq,
 LEAST(
 POWER((r.latitude-37.5637)*111.195,2)+POWER((r.longitude-126.9840)*88.5,2),
 POWER((r.latitude-37.5660)*111.195,2)+POWER((r.longitude-126.9760)*88.5,2),
 POWER((r.latitude-37.5590)*111.195,2)+POWER((r.longitude-126.9770)*88.5,2),
 POWER((r.latitude-37.5660)*111.195,2)+POWER((r.longitude-126.9920)*88.5,2),
 POWER((r.latitude-37.5670)*111.195,2)+POWER((r.longitude-127.0050)*88.5,2)
 ) AS jung_anchor_distance_sq,
 lower(btrim(regexp_replace(r.name_ko,
 '^[[:space:]]*(\([[:space:]]*주[[:space:]]*\)|㈜|주식회사|\([[:space:]]*유[[:space:]]*\)|유한회사)[[:space:]]*','','g'))) AS consumer_name,
 coalesce(nullif(btrim(r.road_address_ko),''),nullif(btrim(r.lot_address_ko),'')) AS address_key
 FROM restaurants r LEFT JOIN restaurant_enrichment_sample_1000 s ON s.restaurant_id=r.id
 WHERE r.publication_status='published' AND r.business_status='active'
 AND r.region_sido='서울특별시' AND r.region_sigungu IN ('종로구','중구')
 AND r.latitude BETWEEN 33 AND 39.5 AND r.longitude BETWEEN 124 AND 132
 AND coalesce(nullif(btrim(r.road_address_ko),''),nullif(btrim(r.lot_address_ko),'')) IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q
 WHERE q.restaurant_id=r.id AND (q.review_state='confirmed_hold'
 OR (q.review_state='pending' AND q.issue_code='OTHER')))
), unique_venue AS (
 SELECT *,row_number() OVER(PARTITION BY district,consumer_name,address_key
 ORDER BY verified_menu DESC,sample_rank ASC NULLS LAST,id ASC) AS identity_row
 FROM base
), candidates AS (
 SELECT u.*,q.quota,
 row_number() OVER (PARTITION BY u.district,u.bucket
 ORDER BY u.verified_menu DESC,u.sample_rank ASC NULLS LAST,
 CASE WHEN u.district='종로구' THEN u.jongno_anchor_distance_sq ELSE u.jung_anchor_distance_sq END ASC,
 u.id ASC) AS category_rank
 FROM unique_venue u JOIN quotas q USING(district,bucket)
 WHERE identity_row=1
), shortlisted AS (
 SELECT *,row_number() OVER(ORDER BY verified_menu DESC,sample_rank ASC NULLS LAST,
 CASE WHEN district='종로구' THEN jongno_anchor_distance_sq ELSE jung_anchor_distance_sq END ASC,
 district,bucket,id) AS cohort_rank
 FROM candidates WHERE category_rank<=quota
)
 INSERT INTO whateato_release_cohort_300_v1
 (restaurant_id,cohort_rank,district,category_bucket,source_sample_rank)
 SELECT id,cohort_rank,district,bucket,sample_rank FROM shortlisted
 ON CONFLICT(restaurant_id) DO NOTHING;

-- Statement 3: live completeness audit
CREATE VIEW whateato_release_cohort_readiness_v1 AS
SELECT c.restaurant_id,c.cohort_rank,c.district,c.category_bucket,
 c.review_state,r.name_ko,r.category_code,r.road_address_ko,r.lot_address_ko,
 r.latitude,r.longitude,
 coalesce(nullif(btrim(r.road_address_ko),''),nullif(btrim(r.lot_address_ko),'')) AS display_address_ko,
 CASE WHEN nullif(btrim(r.road_address_ko),'') IS NOT NULL THEN 'road_verified_source'
      WHEN nullif(btrim(r.lot_address_ko),'') IS NOT NULL THEN 'lot_address_fallback'
      ELSE 'missing' END address_state,
 COALESCE(m.verified_menu_count,0)::integer AS published_verified_menu_count,
 COALESCE(lang.published_language_count,0)::integer AS published_language_count,
 COALESCE(lang.four_locales,false) AS has_four_locales,
 CASE WHEN c.review_state<>'approved' THEN 'identity_and_live_status_review'
      WHEN COALESCE(m.verified_menu_count,0)=0 THEN 'verify_current_branch_menu'
      WHEN NOT COALESCE(lang.four_locales,false) THEN 'four_locale_editorial_review'
      ELSE 'ready_for_final_qa' END AS next_action
FROM whateato_release_cohort_300_v1 c
JOIN restaurants r ON r.id=c.restaurant_id
LEFT JOIN LATERAL (
 SELECT count(*) verified_menu_count FROM restaurant_menus rm
 WHERE rm.restaurant_id=c.restaurant_id AND rm.publication_state='published'
 AND nullif(btrim(rm.evidence_ref),'') IS NOT NULL
 AND EXISTS (SELECT 1 FROM restaurant_menu_localizations ml
 WHERE ml.menu_id=rm.id AND ml.locale='ko' AND nullif(btrim(ml.name),'') IS NOT NULL)
) m ON true
LEFT JOIN LATERAL (
 SELECT count(DISTINCT locale) published_language_count,
       count(DISTINCT locale)=4 AND count(DISTINCT locale) FILTER
       (WHERE locale IN ('ko','en','ja','zh-CN') AND
        nullif(btrim(display_name),'') IS NOT NULL AND
        nullif(btrim(short_description),'') IS NOT NULL)=4 AS four_locales
 FROM restaurant_localizations rl
 WHERE rl.restaurant_id=c.restaurant_id AND rl.publication_state='published'
) lang ON true;
