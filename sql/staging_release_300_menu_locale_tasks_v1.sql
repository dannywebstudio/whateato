-- Staging-only additions to Phase 2/3: source-backed candidate menus and 4-locale task matrix.
-- No publication or destructive operations.

-- Staging-only research candidate table. NOT public menus.
-- No photos, prices, or ratings are populated.
CREATE TABLE IF NOT EXISTS whateato_release_menu_candidate_v1 (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
 menu_name_ko text NOT NULL CHECK (length(btrim(menu_name_ko)) BETWEEN 2 AND 110),
 localized_names jsonb NOT NULL DEFAULT '{}'::jsonb,
 source_url text NOT NULL CHECK (source_url ~ '^https://'),
 source_kind text NOT NULL CHECK (source_kind IN ('official_brand','official_branch','official_tourism','third_party')),
 source_scope text NOT NULL CHECK (source_scope IN ('brand','branch','unconfirmed')),
 source_checked_on date NOT NULL,
 branch_verified boolean NOT NULL DEFAULT false,
 review_state text NOT NULL DEFAULT 'pending' CHECK (review_state IN ('pending','verified_for_branch','rejected')),
 price_krw integer,
 evidence_note text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(restaurant_id,menu_name_ko),
 CHECK(price_krw IS NULL OR (branch_verified AND review_state='verified_for_branch'))
);

CREATE VIEW whateato_release_cohort_locale_tasks_v1 AS
SELECT c.cohort_rank,c.restaurant_id,r.name_ko,c.district,x.locale,
 CASE WHEN l.publication_state='published'
           AND nullif(btrim(l.display_name),'') IS NOT NULL
           AND nullif(btrim(l.short_description),'') IS NOT NULL THEN 'published'
      WHEN l.publication_state IS NOT NULL THEN 'needs_locale_review'
      ELSE 'missing' END AS locale_state,
 coalesce(mc.menu_translation_count,0)::integer AS verified_menu_translations,
 coalesce(mm.verified_menu_count,0)::integer AS verified_korean_menus,
 CASE WHEN coalesce(mm.verified_menu_count,0)=0 THEN 'verify_current_branch_menu'
      WHEN coalesce(mc.menu_translation_count,0)<coalesce(mm.verified_menu_count,0)
        THEN 'translate_verified_menus'
      WHEN l.publication_state IS NULL THEN 'create_restaurant_translation'
      WHEN l.publication_state<>'published' THEN 'editorial_locale_approval'
      ELSE 'language_render_qa' END AS next_locale_task
FROM whateato_release_cohort_300_v1 c
JOIN restaurants r ON r.id=c.restaurant_id
CROSS JOIN (VALUES ('ko'),('en'),('ja'),('zh-CN')) x(locale)
LEFT JOIN restaurant_localizations l
 ON l.restaurant_id=c.restaurant_id AND l.locale=x.locale
LEFT JOIN LATERAL (
 SELECT COUNT(*) verified_menu_count FROM restaurant_menus m
 WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published'
 AND nullif(btrim(m.evidence_ref),'') IS NOT NULL
 AND EXISTS(SELECT 1 FROM restaurant_menu_localizations ml0
 WHERE ml0.menu_id=m.id AND ml0.locale='ko' AND nullif(btrim(ml0.name),'') IS NOT NULL)
) mm ON true
LEFT JOIN LATERAL (
 SELECT COUNT(*) menu_translation_count
 FROM restaurant_menus m JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id
 WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published'
 AND nullif(btrim(m.evidence_ref),'') IS NOT NULL
 AND ml.locale=x.locale AND nullif(btrim(ml.name),'') IS NOT NULL
) mc ON true;

CREATE VIEW whateato_release_cohort_menu_tasks_v1 AS
SELECT c.cohort_rank,c.restaurant_id,c.district,r.name_ko,r.category_code,
 v.published_verified_menu_count,
 coalesce(e.candidate_count,0)::integer AS inherited_research_candidates,
 coalesce(n.new_candidate_count,0)::integer AS reviewed_source_candidates,
 CASE WHEN v.published_verified_menu_count>0 THEN 'has_verified_menu'
      WHEN coalesce(n.new_candidate_count,0)>0 THEN 'source_candidate_review'
      WHEN coalesce(e.candidate_count,0)>0 THEN 'research_candidate_review'
      ELSE 'need_branch_menu_source' END menu_task
FROM whateato_release_cohort_300_v1 c JOIN restaurants r ON r.id=c.restaurant_id
JOIN whateato_release_cohort_readiness_v1 v ON v.restaurant_id=c.restaurant_id
LEFT JOIN LATERAL (
 SELECT CASE WHEN jsonb_typeof(re.observed_menu_prices)='array'
 THEN jsonb_array_length(re.observed_menu_prices) ELSE 0 END AS candidate_count
 FROM restaurant_external_research re WHERE re.restaurant_id=c.restaurant_id
) e ON true
LEFT JOIN LATERAL (
 SELECT count(*) new_candidate_count FROM whateato_release_menu_candidate_v1 n
 WHERE n.restaurant_id=c.restaurant_id AND n.review_state='pending'
) n ON true;
