-- WhatEatO: evidence-gated local opening hours (Asia/Seoul only).
-- An empty schedule or a schedule in review MUST NOT be shown as 'Open now'.
CREATE TABLE IF NOT EXISTS restaurant_opening_hours (
 restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
 timezone text NOT NULL DEFAULT 'Asia/Seoul' CHECK(timezone='Asia/Seoul'),
 publication_state text NOT NULL DEFAULT 'review' CHECK(publication_state IN ('review','published','rejected')),
 source_url text NOT NULL CHECK(source_url ~ '^https://'),
 verified_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(publication_state<>'published' OR verified_at IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS restaurant_opening_intervals (
 restaurant_id uuid NOT NULL REFERENCES restaurant_opening_hours(restaurant_id) ON DELETE CASCADE,
 weekday smallint NOT NULL CHECK(weekday BETWEEN 0 AND 6), -- Sunday 0
 start_minute smallint NOT NULL CHECK(start_minute BETWEEN 0 AND 1439),
 end_minute smallint NOT NULL CHECK(end_minute BETWEEN 1 AND 1440),
 PRIMARY KEY(restaurant_id,weekday,start_minute,end_minute),
 CHECK(start_minute<end_minute)
);
CREATE TABLE IF NOT EXISTS restaurant_opening_exceptions (
 restaurant_id uuid NOT NULL REFERENCES restaurant_opening_hours(restaurant_id) ON DELETE CASCADE,
 local_date date NOT NULL,
 is_closed boolean NOT NULL DEFAULT true,
 source_url text NOT NULL CHECK(source_url ~ '^https://'),
 verified_at timestamptz NOT NULL,
 PRIMARY KEY(restaurant_id,local_date),
 CHECK(is_closed)
);
CREATE INDEX IF NOT EXISTS idx_open_intervals_restaurant ON restaurant_opening_intervals(restaurant_id,weekday);
