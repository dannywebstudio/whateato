-- WhatEatO ONLY. Execute in a NEW dedicated Neon PostgreSQL database.
-- Lean public-search schema: no full raw CSV, no fabricated user reviews.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sbiz_source_key text UNIQUE,
  name_ko text NOT NULL,
  road_address_ko text,
  lot_address_ko text,
  region_sido text,
  region_sigungu text,
  region_dong text,
  category_code text,
  latitude double precision CHECK (latitude BETWEEN 33 AND 39.5),
  longitude double precision CHECK (longitude BETWEEN 124 AND 132),
  location geography(Point,4326) GENERATED ALWAYS AS (
    CASE WHEN latitude IS NOT NULL AND longitude IS NOT NULL THEN
      ST_SetSRID(ST_MakePoint(longitude,latitude),4326)::geography ELSE NULL END
  ) STORED,
  business_status text NOT NULL DEFAULT 'unknown' CHECK (business_status IN ('active','closed','unknown')),
  publication_status text NOT NULL DEFAULT 'draft' CHECK (publication_status IN ('draft','published','hidden')),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_restaurants_search_name ON restaurants USING gin(name_ko gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_restaurants_region ON restaurants(region_sido,region_sigungu,region_dong);
-- Add location or address indexes later, based on actual Neon storage measurements.
CREATE TABLE IF NOT EXISTS restaurant_source_refs (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  source_record_id text NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(provider,source_record_id)
);
CREATE TABLE IF NOT EXISTS restaurant_hour_sources (
  restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  source_label text NOT NULL,
  verified_at timestamptz NOT NULL,
  timezone text NOT NULL DEFAULT 'Asia/Seoul' CHECK(timezone='Asia/Seoul')
);
CREATE TABLE IF NOT EXISTS restaurant_open_intervals (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK(weekday BETWEEN 0 AND 6),
  opens_minute smallint NOT NULL CHECK(opens_minute BETWEEN 0 AND 1439),
  closes_minute smallint NOT NULL CHECK(closes_minute BETWEEN 1 AND 2880),
  CHECK(closes_minute>opens_minute),
  PRIMARY KEY(restaurant_id,weekday,opens_minute)
);
CREATE TABLE IF NOT EXISTS restaurant_hour_exceptions (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  service_date date NOT NULL,
  is_closed boolean NOT NULL,
  intervals jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(intervals)='array'),
  source_url text NOT NULL,
  PRIMARY KEY(restaurant_id,service_date)
);
CREATE TABLE IF NOT EXISTS restaurant_ai_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  score numeric(2,1) NOT NULL CHECK(score BETWEEN 1.0 AND 5.0),
  confidence text NOT NULL CHECK(confidence IN ('low','medium','high')),
  review_status text NOT NULL DEFAULT 'draft' CHECK(review_status IN ('draft','approved','rejected')),
  model_version text NOT NULL,
  methodology_version text NOT NULL,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  CHECK(review_status <> 'approved' OR (confidence IN ('medium','high') AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_ai_rating_restaurant ON restaurant_ai_ratings(restaurant_id,review_status,evaluated_at DESC);
CREATE TABLE IF NOT EXISTS restaurant_rating_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id uuid NOT NULL REFERENCES restaurant_ai_ratings(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  publisher_id text NOT NULL,
  verifies_food_quality boolean NOT NULL DEFAULT false,
  review_status text NOT NULL DEFAULT 'pending' CHECK(review_status IN ('pending','verified','rejected')),
  source_checked_at timestamptz,
  UNIQUE(rating_id,source_url)
);
COMMIT;
