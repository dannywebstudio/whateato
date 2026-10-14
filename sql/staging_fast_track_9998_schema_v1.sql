-- STAGING ONLY, first-pass grades for all restaurant permit rows.
-- A: verified; B: safe basic content; C_REVIEW: visibility withheld, not deletable.
CREATE TABLE IF NOT EXISTS whateato_restaurant_triage_v1 (
 restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE RESTRICT,
 grade text NOT NULL CHECK (grade IN ('A','B','C_REVIEW','C_CONFIRMED')),
 visibility text NOT NULL CHECK (visibility IN ('full','basic_map','basic_search_only','hidden')),
 reason_code text NOT NULL,
 review_required boolean NOT NULL DEFAULT false,
 ruleset_version text NOT NULL DEFAULT 'fast-track-v1',
 classified_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((grade IN ('C_REVIEW','C_CONFIRMED')) = (visibility='hidden')),
 CHECK ((grade='A') = (visibility='full'))
);
CREATE TABLE IF NOT EXISTS whateato_c_confirmation_v1 (
 restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE RESTRICT,
 finding text NOT NULL CHECK(finding IN ('official_permit_closed','proven_non_food','verified_false_duplicate')),
 evidence_url text NOT NULL CHECK (evidence_url LIKE 'https://%'),
 evidence_summary text NOT NULL CHECK(length(evidence_summary)>=45),
 reviewer_ref text NOT NULL CHECK(length(reviewer_ref)>=3),
 reviewed_at timestamptz NOT NULL,
 confirmed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS whateato_c_delete_archive_v1 (
 restaurant_id uuid PRIMARY KEY,
 archived_at timestamptz NOT NULL DEFAULT now(),
 evidence_snapshot jsonb NOT NULL,
 restaurant_snapshot jsonb NOT NULL,
 source_refs_snapshot jsonb NOT NULL,
 dependent_rows_snapshot jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS whateato_restaurant_triage_grade_idx
 ON whateato_restaurant_triage_v1(grade,visibility);
