-- Owner-only irreversible review deletion ledger. Never store the review body,
-- author Google subject, account ID, IP address or photo objects in this log.
BEGIN;
CREATE TABLE IF NOT EXISTS whateato_review_deletion_audit (
 review_id uuid PRIMARY KEY,
 restaurant_id uuid NOT NULL,
 reason_code text NOT NULL CHECK (reason_code IN
  ('spam','abusive','personal_data','off_topic','unverifiable_claim','other')),
 previous_state text NOT NULL CHECK (previous_state IN
  ('pending','published','rejected')),
 queued_photo_count smallint NOT NULL CHECK (queued_photo_count BETWEEN 0 AND 5),
 actor_role text NOT NULL DEFAULT 'owner' CHECK (actor_role='owner'),
 deleted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_review_deletion_audit_recent
 ON whateato_review_deletion_audit(deleted_at DESC,review_id);
COMMIT;
