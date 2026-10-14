-- Admin CMS v1: separate staff permissions; never auto-grant Google reviewers.
-- Run ONLY after 014, on verified staging first. No existing restaurant/UI changes.
BEGIN;
CREATE TABLE IF NOT EXISTS whateato_admin_accounts(
 account_id uuid PRIMARY KEY REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 role text NOT NULL CHECK(role IN ('owner','editor','moderator')),
 enabled boolean NOT NULL DEFAULT true,
 granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whateato_admin_enabled ON whateato_admin_accounts(role)
 WHERE enabled=true;
-- Private media asset metadata (bytes stored outside Render on R2/S3).
CREATE TABLE IF NOT EXISTS whateato_admin_media_uploads(
 image_id uuid PRIMARY KEY REFERENCES restaurant_images(id) ON DELETE RESTRICT,
 storage_provider text NOT NULL CHECK(storage_provider='s3_compatible'),
 width integer NOT NULL CHECK(width BETWEEN 320 AND 6000),
 height integer NOT NULL CHECK(height BETWEEN 240 AND 6000),
 file_bytes integer NOT NULL CHECK(file_bytes BETWEEN 1 AND 8388608),
 mime_type text NOT NULL CHECK(mime_type='image/webp'),
 created_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
