-- WhatEatO integrated editorial blog. Drafts never leak into public results.
-- Review/publish uses immutable snapshots: editing a live article won't change it until reapproval.
BEGIN;
CREATE TABLE IF NOT EXISTS whateato_blog_posts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 90),
 created_by uuid NOT NULL REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS whateato_blog_drafts(
 post_id uuid PRIMARY KEY REFERENCES whateato_blog_posts(id) ON DELETE CASCADE,
 category text NOT NULL DEFAULT 'food-guides' CHECK(category IN
  ('food-guides','neighborhoods','korean-food','dining-tips','food-culture')),
 tags text[] NOT NULL DEFAULT '{}' CHECK (cardinality(tags)<=8),
 related_restaurant_ids uuid[] NOT NULL DEFAULT '{}' CHECK(cardinality(related_restaurant_ids)<=8),
 translations jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(translations)='object'),
 revision integer NOT NULL DEFAULT 1 CHECK(revision BETWEEN 1 AND 2000000000),
 review_requested_at timestamptz,
 updated_by uuid NOT NULL REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS whateato_blog_publications(
 post_id uuid PRIMARY KEY REFERENCES whateato_blog_posts(id) ON DELETE CASCADE,
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 revision integer NOT NULL CHECK(revision>=1),
 is_visible boolean NOT NULL DEFAULT true,
 published_by uuid NOT NULL REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whateato_blog_publications_live
 ON whateato_blog_publications(published_at DESC,post_id) WHERE is_visible=true;
CREATE INDEX IF NOT EXISTS idx_whateato_blog_search
 ON whateato_blog_publications USING gin (lower(coalesce(snapshot::text,'')) gin_trgm_ops);
CREATE TABLE IF NOT EXISTS whateato_blog_media(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 post_id uuid NOT NULL REFERENCES whateato_blog_posts(id) ON DELETE CASCADE,
 storage_key text NOT NULL UNIQUE CHECK (storage_key ~ '^media/blog/[0-9a-f-]{36}\.webp$'),
 media_role text NOT NULL CHECK (media_role IN ('cover','inline')),
 alt_text text NOT NULL CHECK (length(alt_text) BETWEEN 3 AND 180),
 source_url text NOT NULL CHECK(source_url LIKE 'https://%' AND length(source_url)<=700),
 rights_reference text NOT NULL CHECK(rights_reference LIKE 'https://%' AND length(rights_reference)<=700),
 rights_status text NOT NULL DEFAULT 'pending' CHECK (rights_status IN ('pending','approved','rejected')),
 file_bytes integer NOT NULL CHECK (file_bytes BETWEEN 16 AND 8388608),
 width integer NOT NULL CHECK(width BETWEEN 1 AND 8000),
 height integer NOT NULL CHECK(height BETWEEN 1 AND 8000),
 created_by uuid NOT NULL REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 approved_by uuid REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 approved_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whateato_blog_media_post
 ON whateato_blog_media(post_id,media_role,rights_status,created_at DESC);
CREATE TABLE IF NOT EXISTS whateato_blog_audit(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 post_id uuid NOT NULL REFERENCES whateato_blog_posts(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 action text NOT NULL CHECK (action IN
  ('created','draft_saved','review_requested','published','unpublished','image_uploaded','image_approved','image_rejected')),
 revision integer,
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whateato_blog_audit_post ON whateato_blog_audit(post_id,id DESC);
COMMIT;
