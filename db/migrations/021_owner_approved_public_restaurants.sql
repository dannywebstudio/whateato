-- Owner-controlled public catalog membership. No bulk import or previously published
-- row becomes web-visible merely from permit/publication status.
-- Run this additive migration BEFORE deploying the corresponding catalog query.
BEGIN;
CREATE TABLE IF NOT EXISTS whateato_restaurant_public_approvals_v1(
 restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE RESTRICT,
 is_visible boolean NOT NULL DEFAULT false,
 approval_source text NOT NULL CHECK(approval_source IN ('baseline','owner')),
 approved_by uuid REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 approved_at timestamptz NOT NULL DEFAULT now(),
 evidence_url text NOT NULL CHECK(length(btrim(evidence_url)) BETWEEN 10 AND 700),
 revoked_by uuid REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 revoked_at timestamptz,
 CHECK(approval_source='baseline' OR approved_by IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_whateato_restaurant_approval_visible
 ON whateato_restaurant_public_approvals_v1(restaurant_id) WHERE is_visible;
-- Append-only owner decisions. The legacy three are tracked as a baseline,
-- while every later approval/revocation records the authenticated owner ID.
CREATE TABLE IF NOT EXISTS whateato_public_restaurant_approval_audit_v1(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE RESTRICT,
 actor_id uuid NOT NULL REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
 action text NOT NULL CHECK(action IN ('approve','revoke')),
 evidence_url text,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_whateato_public_restaurant_approval_audit
 ON whateato_public_restaurant_approval_audit_v1(restaurant_id,created_at DESC);

-- The ONLY automatic initial approvals: these three manually confirmed venues.
-- Never enroll the remaining cohort, even if it was already 'published'.
INSERT INTO whateato_restaurant_public_approvals_v1
 (restaurant_id,is_visible,approval_source,evidence_url)
SELECT r.id,true,'baseline',h.source_url
FROM restaurants r
JOIN restaurant_opening_hours h ON h.restaurant_id=r.id
 WHERE r.id IN (
  '16918f58-4e63-4e49-a013-aad17e499ad4',
  '6cc37914-1bb8-406e-a365-34c897b4f26f',
  '2daa58f1-6360-4ddb-a27f-6e6d1437a122'
 ) AND r.publication_status='published' AND r.business_status='active'
 AND h.publication_state='published' AND h.verified_at IS NOT NULL
 AND h.source_url IS NOT NULL AND length(btrim(h.source_url))>=10
ON CONFLICT (restaurant_id) DO NOTHING;
COMMIT;
