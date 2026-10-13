-- WhatEatO external venue research staging: never published by catalog queries.
-- Source records, permit identity and publication decisions are deliberately separate.
CREATE TABLE IF NOT EXISTS restaurant_external_research (
 restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
 permit_name_snapshot text NOT NULL,
 permit_address_snapshot text NOT NULL,
 candidate_display_name text,
 editorial_draft_i18n jsonb NOT NULL DEFAULT '{}'::jsonb,
 observed_menu_prices jsonb NOT NULL DEFAULT '[]'::jsonb,
 reported_reservation_status text NOT NULL DEFAULT 'unverified'
   CHECK(reported_reservation_status IN ('unverified','yes_reported','no_reported')),
 naver_rating numeric(3,2),
 naver_rating_source_url text,
 google_rating numeric(3,2),
 google_rating_source_url text,
 hours_candidate jsonb NOT NULL DEFAULT '{}'::jsonb,
 research_sources jsonb NOT NULL DEFAULT '[]'::jsonb,
 identity_flag text NOT NULL DEFAULT 'requires_final_review',
 review_state text NOT NULL DEFAULT 'pending'
   CHECK(review_state IN ('pending','approved_for_editorial_review','rejected')),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT naver_rating_evidence CHECK(naver_rating IS NULL OR
   (naver_rating BETWEEN 0 AND 5 AND naver_rating_source_url LIKE 'https://%')),
 CONSTRAINT google_rating_evidence CHECK(google_rating IS NULL OR
   (google_rating BETWEEN 0 AND 5 AND google_rating_source_url LIKE 'https://%'))
);
COMMENT ON TABLE restaurant_external_research IS
 'Unpublished research staging only: not permission to reproduce ratings, pricing or Google/Naver Maps data publicly. Require provider terms and editorial validation before catalog publication.';
