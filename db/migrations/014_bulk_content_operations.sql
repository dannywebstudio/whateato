-- WhatEatO Bulk Content Operations v1 (additive, no production data mutation).
-- Apply to a verified STAGING Neon branch first. Requires 004,007,008,010.
-- Records are immutable after submission; deletions are reversible visibility holds.
BEGIN;
CREATE TABLE IF NOT EXISTS whateato_bulk_batches (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 client_key text NOT NULL UNIQUE CHECK(char_length(client_key) BETWEEN 8 AND 80),
 title text NOT NULL CHECK(char_length(title) BETWEEN 3 AND 120),
 state text NOT NULL DEFAULT 'draft'
   CHECK(state IN ('draft','review','approved','processing','completed','completed_with_errors','rejected','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 approved_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_state_created
 ON whateato_bulk_batches(state,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_batches_id_desc ON whateato_bulk_batches(id DESC);

CREATE TABLE IF NOT EXISTS whateato_bulk_items (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 batch_id uuid NOT NULL REFERENCES whateato_bulk_batches(id) ON DELETE RESTRICT,
 source_key text NOT NULL CHECK(char_length(source_key) BETWEEN 1 AND 128),
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
 kind text NOT NULL CHECK(kind IN
   ('localization','localization_unpublish','menu','menu_unpublish','tag','hours','visibility_hide','visibility_restore')),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object' AND octet_length(payload::text)<=16384),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','applied','failed')),
 error_code text CHECK(char_length(error_code)<=80),
 created_at timestamptz NOT NULL DEFAULT now(),
 applied_at timestamptz,
 UNIQUE(batch_id,source_key)
);
CREATE INDEX IF NOT EXISTS idx_bulk_items_pending
 ON whateato_bulk_items(batch_id,id) WHERE state='pending';
CREATE INDEX IF NOT EXISTS idx_bulk_items_restaurant ON whateato_bulk_items(restaurant_id,batch_id);

-- Stable human-assigned menu keys allow independent locale records and repeat imports.
CREATE TABLE IF NOT EXISTS whateato_bulk_menu_keys (
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
 external_key text NOT NULL CHECK(char_length(external_key) BETWEEN 1 AND 64),
 menu_id uuid NOT NULL UNIQUE REFERENCES restaurant_menus(id) ON DELETE RESTRICT,
 PRIMARY KEY(restaurant_id,external_key)
);

-- Append-only status/action audit: no emails, IPs, review bodies or photo bytes.
CREATE TABLE IF NOT EXISTS whateato_bulk_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 batch_id uuid NOT NULL REFERENCES whateato_bulk_batches(id) ON DELETE RESTRICT,
 item_id bigint REFERENCES whateato_bulk_items(id) ON DELETE RESTRICT,
 action text NOT NULL CHECK(action IN
   ('created','items_added','submitted','approved','rejected','cancelled','applied','failed','completed')),
 actor_kind text NOT NULL DEFAULT 'authenticated_admin' CHECK(actor_kind='authenticated_admin'),
 reason_code text CHECK(char_length(reason_code)<=80),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bulk_audit_batch ON whateato_bulk_audit(batch_id,id DESC);

-- Future: image bytes must live in private object storage, not Neon or ephemeral Render disk.
-- A review photo is *never* served until scan + rights + moderation gates all pass.
CREATE TABLE IF NOT EXISTS whateato_review_photo_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 review_id uuid NOT NULL REFERENCES whateato_user_reviews(id) ON DELETE RESTRICT,
 storage_key text NOT NULL UNIQUE CHECK(char_length(storage_key) BETWEEN 8 AND 600),
 mime_type text NOT NULL CHECK(mime_type IN ('image/webp','image/jpeg','image/png')),
 width integer NOT NULL CHECK(width BETWEEN 1 AND 6000),
 height integer NOT NULL CHECK(height BETWEEN 1 AND 6000),
 bytes integer NOT NULL CHECK(bytes BETWEEN 1 AND 8388608),
 position smallint NOT NULL CHECK(position BETWEEN 0 AND 4),
 scan_state text NOT NULL DEFAULT 'pending' CHECK(scan_state IN ('pending','passed','rejected')),
 rights_state text NOT NULL DEFAULT 'pending' CHECK(rights_state IN ('pending','approved','rejected')),
 moderation_state text NOT NULL DEFAULT 'pending' CHECK(moderation_state IN ('pending','approved','rejected','hidden')),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(review_id,position)
);
CREATE INDEX IF NOT EXISTS idx_review_photos_approved ON whateato_review_photo_assets(review_id,position)
 WHERE scan_state='passed' AND rights_state='approved' AND moderation_state='approved';

-- Do not change existing review stars yet: future category-scored reviews use
-- this normalized table and a separately approved public read migration.
CREATE TABLE IF NOT EXISTS whateato_review_category_scores (
 review_id uuid PRIMARY KEY REFERENCES whateato_user_reviews(id) ON DELETE RESTRICT,
 taste smallint NOT NULL CHECK(taste BETWEEN 1 AND 5),
 service smallint CHECK(service BETWEEN 1 AND 5),
 tourist_friendliness smallint CHECK(tourist_friendliness BETWEEN 1 AND 5),
 value_for_money smallint CHECK(value_for_money BETWEEN 1 AND 5),
 cleanliness smallint CHECK(cleanliness BETWEEN 1 AND 5),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE VIEW whateato_review_category_averages_v1 AS
 SELECT r.restaurant_id,
   count(*)::int AS eligible_reviews,
   round(avg((s.taste::numeric
     +coalesce(s.service,0)+coalesce(s.tourist_friendliness,0)
     +coalesce(s.value_for_money,0)+coalesce(s.cleanliness,0))/
     (1+(s.service IS NOT NULL)::int+(s.tourist_friendliness IS NOT NULL)::int
       +(s.value_for_money IS NOT NULL)::int+(s.cleanliness IS NOT NULL)::int)),1) AS average_rating
 FROM whateato_user_reviews r
 JOIN whateato_review_category_scores s ON s.review_id=r.id
 WHERE r.moderation_status='published'
 GROUP BY r.restaurant_id;
CREATE INDEX IF NOT EXISTS idx_review_pending_cursor
 ON whateato_user_reviews(created_at,id) WHERE moderation_status='pending';
COMMIT;
