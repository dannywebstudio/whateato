-- WhatEatO optional user reviews & licensed external insights. NON-DESTRUCTIVE.
-- Apply only to the dedicated WhatEatO Neon database, after code QA.
-- NO Google email, display name, portrait, access token, refresh token or IP address stored.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS whateato_review_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 google_subject text NOT NULL UNIQUE CHECK (length(google_subject) BETWEEN 6 AND 255),
 created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whateato_user_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
 account_id uuid NOT NULL REFERENCES whateato_review_accounts(id) ON DELETE CASCADE,
 rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
 body text NOT NULL CHECK (char_length(body) BETWEEN 30 AND 1500),
 moderation_status text NOT NULL DEFAULT 'pending'
   CHECK(moderation_status IN ('pending','published','rejected')),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 reviewed_at timestamptz,
 UNIQUE (restaurant_id, account_id)
);
CREATE INDEX IF NOT EXISTS idx_whateato_published_reviews
 ON whateato_user_reviews(restaurant_id, created_at DESC)
 WHERE moderation_status='published';
CREATE INDEX IF NOT EXISTS idx_whateato_account_reviews
 ON whateato_user_reviews(account_id,created_at DESC);

-- "External" means we possess written license/permission to calculate and
-- publish derived review insights. The source itself does NOT grant permission
-- by being publicly accessible.
CREATE TABLE IF NOT EXISTS whateato_review_licenses (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 provider_label text NOT NULL CHECK(length(provider_label) BETWEEN 2 AND 100),
 agreement_reference text NOT NULL CHECK(length(agreement_reference) BETWEEN 8 AND 600),
 usage_scope text NOT NULL CHECK(length(usage_scope) BETWEEN 8 AND 600),
 permitted_for_derived_analytics boolean NOT NULL DEFAULT false,
 approval_status text NOT NULL DEFAULT 'pending'
    CHECK(approval_status IN ('pending','approved','suspended','revoked')),
 approved_at timestamptz,
 valid_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(approval_status <> 'approved' OR
   (permitted_for_derived_analytics AND approved_at IS NOT NULL))
);

-- Only permitted derived category signals are retained; NO raw reviews/photos.
-- This table is intentionally populated only through a separate authorized
-- offline ingestion process, never by crawling Google/Naver.
CREATE TABLE IF NOT EXISTS whateato_licensed_review_signals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 license_id uuid NOT NULL REFERENCES whateato_review_licenses(id) ON DELETE CASCADE,
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
 source_item_digest text NOT NULL CHECK(length(source_item_digest) BETWEEN 32 AND 128),
 service_negative boolean NOT NULL DEFAULT false,
 service_positive boolean NOT NULL DEFAULT false,
 food_negative boolean NOT NULL DEFAULT false,
 food_positive boolean NOT NULL DEFAULT false,
 captured_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 CHECK (service_negative OR service_positive OR food_negative OR food_positive),
 CHECK (NOT (service_negative AND service_positive)),
 CHECK (NOT (food_negative AND food_positive)),
 UNIQUE (license_id, source_item_digest)
);
CREATE INDEX IF NOT EXISTS idx_whateato_licensed_insights
 ON whateato_licensed_review_signals(restaurant_id, license_id);
COMMIT;
