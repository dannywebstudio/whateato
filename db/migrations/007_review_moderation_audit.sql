-- WhatEatO Phase 3.5: append-only moderation event trail.
-- Does NOT approve, reject, create, or expose any live reviews.
-- No user email, Google subject, access token, review body or secret is copied.
BEGIN;
CREATE TABLE IF NOT EXISTS whateato_review_moderation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES whateato_user_reviews(id) ON DELETE CASCADE,
  decision text NOT NULL CHECK(decision IN ('published','rejected')),
  reason_code text NOT NULL CHECK(reason_code IN
    ('approved_guidelines','spam','abusive','personal_data','off_topic','unverifiable_claim','other')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (decision='published' AND reason_code='approved_guidelines')
    OR
    (decision='rejected' AND reason_code<>'approved_guidelines')
  )
);
CREATE INDEX IF NOT EXISTS idx_whateato_review_moderation_audit_history
  ON whateato_review_moderation_audit(review_id,created_at DESC);
COMMIT;
