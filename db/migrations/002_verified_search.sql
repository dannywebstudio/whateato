-- WhatEatO verified filter tags + search synonyms. No invented reviews.
BEGIN;
CREATE TABLE IF NOT EXISTS restaurant_verified_tags (
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
 tag_id text NOT NULL CHECK (length(tag_id) BETWEEN 2 AND 40),
 source_url text NOT NULL,
 review_status text NOT NULL DEFAULT 'pending'
  CHECK (review_status IN ('pending','verified','rejected')),
 verified_at timestamptz,
 CHECK (review_status <> 'verified' OR verified_at IS NOT NULL),
 PRIMARY KEY (restaurant_id,tag_id)
);
CREATE INDEX IF NOT EXISTS idx_verified_tags_match ON restaurant_verified_tags(tag_id,restaurant_id) WHERE review_status='verified';
CREATE TABLE IF NOT EXISTS restaurant_search_aliases (
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
 alias text NOT NULL CHECK(length(alias) BETWEEN 1 AND 160),
 language_code text NOT NULL DEFAULT 'und',
 source_url text NOT NULL,
 review_status text NOT NULL DEFAULT 'pending'
  CHECK(review_status IN ('pending','verified','rejected')),
 PRIMARY KEY (restaurant_id,alias,language_code)
);
CREATE INDEX IF NOT EXISTS idx_verified_search_aliases ON restaurant_search_aliases USING gin (alias gin_trgm_ops) WHERE review_status='verified';
COMMIT;
