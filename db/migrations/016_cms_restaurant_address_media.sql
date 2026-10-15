-- WhatEatO owner CMS: draft-only new venues, audited address corrections and typed images.
-- Staging first. Never updates original permit data during migration.
BEGIN;
ALTER TABLE whateato_bulk_items DROP CONSTRAINT IF EXISTS whateato_bulk_items_kind_check;
ALTER TABLE whateato_bulk_items ADD CONSTRAINT whateato_bulk_items_kind_check
 CHECK(kind IN ('localization','localization_unpublish','menu','menu_unpublish','tag','hours',
                'visibility_hide','visibility_restore','address','restaurant_publish'));

CREATE TABLE IF NOT EXISTS whateato_cms_restaurant_origins(
 restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE RESTRICT,
 created_by uuid NOT NULL REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 source_url text NOT NULL CHECK(char_length(source_url) BETWEEN 10 AND 700),
 created_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_cms_drafts ON whateato_cms_restaurant_origins(created_at DESC,restaurant_id)
 WHERE published_at IS NULL;

CREATE TABLE IF NOT EXISTS whateato_cms_address_history(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
 batch_item_id bigint NOT NULL UNIQUE REFERENCES whateato_bulk_items(id) ON DELETE RESTRICT,
 previous_data jsonb NOT NULL,
 new_data jsonb NOT NULL,
 evidence_url text NOT NULL CHECK(char_length(evidence_url) BETWEEN 10 AND 700),
 approved_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cms_address_history_restaurant ON whateato_cms_address_history(restaurant_id,id DESC);

ALTER TABLE restaurant_images ADD COLUMN IF NOT EXISTS cms_photo_role text NOT NULL DEFAULT 'gallery'
 CHECK(cms_photo_role IN ('cover','gallery'));
CREATE UNIQUE INDEX IF NOT EXISTS idx_cms_published_cover_unique
 ON restaurant_images(restaurant_id) WHERE cms_photo_role='cover' AND publication_state='published';

COMMIT;