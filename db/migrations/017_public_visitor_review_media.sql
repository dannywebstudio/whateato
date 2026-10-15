-- WhatEatO reviewed visitor photos + five-category score activation, additive only.
-- The 014 tables already exist; this migration adds durable object cleanup and safety indexes.
BEGIN;
CREATE TABLE IF NOT EXISTS whateato_review_photo_cleanup (
 storage_key text PRIMARY KEY CHECK(storage_key ~ '^media/reviews/[0-9a-f-]{36}\.webp$'),
 enqueued_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 1000)
);
CREATE INDEX IF NOT EXISTS idx_review_photo_cleanup_pending
 ON whateato_review_photo_cleanup(enqueued_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_review_photos_moderation
 ON whateato_review_photo_assets(review_id,moderation_state,position);
CREATE INDEX IF NOT EXISTS idx_review_category_restaurant
 ON whateato_review_category_scores(review_id);
COMMIT;
