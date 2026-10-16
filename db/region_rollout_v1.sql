-- WhatEatO region rollout v1 — applied to Neon launch-hostinger-20261015 on 2026-10-17.
-- Additive and idempotent. No restaurants are made public by running this migration.
CREATE TABLE IF NOT EXISTS whateato_region_rollout_v1 (
 stage smallint NOT NULL CHECK(stage BETWEEN 1 AND 3),
 priority smallint NOT NULL CHECK(priority>=1),
 region_key text NOT NULL UNIQUE,
 region_label text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(stage,priority)
);
INSERT INTO whateato_region_rollout_v1(stage,priority,region_key,region_label) VALUES
(1,1,'incheon-dongincheon','동인천'),
(1,2,'incheon-mansu','만수'),
(1,3,'incheon-guwol','구월'),
(1,4,'incheon-bupyeong','부평'),
(1,5,'incheon-yeongjong','영종도'),
(2,1,'seoul-station','서울역'),
(2,2,'seoul-sinchon','신촌'),
(2,3,'seoul-hongdae','홍대'),
(2,4,'seoul-ewha','이대'),
(2,5,'seoul-coex','코엑스'),
(2,6,'seoul-other','서울 나머지'),
(3,1,'busan-gwangalli','광안리'),
(3,2,'busan-haeundae','해운대'),
(3,3,'busan-other','부산 이외')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS whateato_region_refresh_queue_v1 (
 id bigserial PRIMARY KEY,
 region_key text NOT NULL REFERENCES whateato_region_rollout_v1(region_key),
 restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL,
 candidate_name_ko text NOT NULL,
 candidate_address_ko text,
 source_url text NOT NULL,
 source_checked_at timestamptz NOT NULL DEFAULT now(),
 hours_evidence text,
 menu_name_ko text,
 menu_price_krw integer CHECK(menu_price_krw>=0),
 review_state text NOT NULL DEFAULT 'hold' CHECK(review_state IN ('hold','ready','deployed')),
 hold_reason text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(region_key,candidate_name_ko,candidate_address_ko)
);

-- Canonical read-only QA status. A queue candidate cannot be published by this view.
CREATE OR REPLACE VIEW whateato_region_release_readiness_v1 AS
WITH checks AS (
         SELECT q.id AS queue_id,
            p.stage,
            p.priority,
            p.region_label,
            q.region_key,
            q.candidate_name_ko,
            q.restaurant_id,
            q.review_state,
            q.hold_reason,
            r.id IS NOT NULL AND NULLIF(btrim(r.name_ko), ''::text) IS NOT NULL AS name_ok,
            r.id IS NOT NULL AND COALESCE(NULLIF(btrim(r.road_address_ko), ''::text), NULLIF(btrim(r.lot_address_ko), ''::text)) IS NOT NULL AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL AS location_ok,
            r.id IS NOT NULL AND r.business_status = 'active'::text AND r.publication_status = 'published'::text AS status_ok,
            (EXISTS ( SELECT 1
                   FROM restaurant_opening_hours h
                  WHERE h.restaurant_id = q.restaurant_id AND h.publication_state = 'published'::text AND h.verified_at IS NOT NULL AND NULLIF(btrim(h.source_url), ''::text) IS NOT NULL AND (EXISTS ( SELECT 1
                           FROM restaurant_opening_intervals oi
                          WHERE oi.restaurant_id = h.restaurant_id AND oi.end_minute > oi.start_minute)))) AS hours_ok,
            (EXISTS ( SELECT 1
                   FROM restaurant_menus m
                  WHERE m.restaurant_id = q.restaurant_id AND m.publication_state = 'published'::text AND NULLIF(btrim(m.evidence_ref), ''::text) IS NOT NULL AND (( SELECT count(DISTINCT ml.locale) AS count
                           FROM restaurant_menu_localizations ml
                          WHERE ml.menu_id = m.id AND (ml.locale = ANY (ARRAY['en'::text, 'ja'::text, 'zh-CN'::text])) AND NULLIF(btrim(ml.name), ''::text) IS NOT NULL)) = 3)) AS menu_ok,
            (( SELECT count(DISTINCT l.locale) AS count
                   FROM restaurant_localizations l
                  WHERE l.restaurant_id = q.restaurant_id AND (l.locale = ANY (ARRAY['en'::text, 'ja'::text, 'zh-CN'::text])) AND l.publication_state = 'published'::text AND l.verified_at IS NOT NULL AND NULLIF(btrim(l.display_name), ''::text) IS NOT NULL)) = 3 AS languages_ok,
            (( SELECT count(DISTINCT a.locale) AS count
                   FROM restaurant_address_localizations_v1 a
                  WHERE a.restaurant_id = q.restaurant_id AND (a.locale = ANY (ARRAY['en'::text, 'ja'::text, 'zh-CN'::text])) AND a.verified_at IS NOT NULL AND NULLIF(btrim(a.display_address), ''::text) IS NOT NULL)) = 3 AS address_languages_ok,
            NOT (EXISTS ( SELECT 1
                   FROM whateato_restaurant_triage_v1 t
                  WHERE t.restaurant_id = q.restaurant_id AND (t.grade = 'C'::text OR (t.visibility <> ALL (ARRAY['full'::text, 'basic_map'::text, 'basic_search_only'::text]))))) AS triage_ok
           FROM whateato_region_refresh_queue_v1 q
             JOIN whateato_region_rollout_v1 p USING (region_key)
             LEFT JOIN restaurants r ON r.id = q.restaurant_id
        )
 SELECT queue_id,
    stage,
    priority,
    region_label,
    region_key,
    candidate_name_ko,
    restaurant_id,
    review_state,
    hold_reason,
    name_ok,
    location_ok,
    status_ok,
    hours_ok,
    menu_ok,
    languages_ok,
    address_languages_ok,
    triage_ok,
        CASE
            WHEN name_ok AND location_ok AND status_ok AND hours_ok AND menu_ok AND languages_ok AND address_languages_ok AND triage_ok THEN 'ready'::text
            ELSE 'hold'::text
        END AS eligibility
   FROM checks;
