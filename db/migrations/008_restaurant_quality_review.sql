-- WhatEatO Phase 4 / source-preserving manual quality review controls.
-- No existing restaurant record or public state is changed by this migration.
-- Only a human-confirmed, evidenced row explicitly sets a visibility hold.
BEGIN;
CREATE TABLE IF NOT EXISTS restaurant_data_quality_reviews (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  issue_code text NOT NULL CHECK(issue_code IN
    ('POSSIBLE_CLOSURE','NAME_IDENTITY_MISMATCH','BRANCH_ADDRESS_COLLISION',
     'PERMIT_CATEGORY_CONFLICT','INSUFFICIENT_CURRENT_MENU_EVIDENCE',
     'POSSIBLE_DUPLICATE','ADDRESS_MISSING','COORDINATES_MISSING','OTHER')),
  severity text NOT NULL CHECK(severity IN ('critical','high','medium','low')),
  review_state text NOT NULL DEFAULT 'pending'
    CHECK(review_state IN ('pending','confirmed_hold','dismissed')),
  evidence_ref text CHECK(char_length(evidence_ref) BETWEEN 8 AND 700),
  evidence_summary text NOT NULL CHECK(char_length(evidence_summary) BETWEEN 20 AND 2000),
  reviewer_ref text CHECK(char_length(reviewer_ref) BETWEEN 3 AND 100),
  reviewed_at timestamptz,
  observed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(restaurant_id,issue_code),
  CHECK(review_state <> 'confirmed_hold' OR
    (reviewer_ref IS NOT NULL AND reviewed_at IS NOT NULL AND
     evidence_ref IS NOT NULL AND severity IN ('critical','high'))),
  CHECK(review_state <> 'dismissed' OR
    (reviewer_ref IS NOT NULL AND reviewed_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_restaurant_quality_confirmed_hold
  ON restaurant_data_quality_reviews(restaurant_id)
  WHERE review_state='confirmed_hold';
CREATE INDEX IF NOT EXISTS idx_restaurant_quality_review_queue
  ON restaurant_data_quality_reviews(review_state,severity,observed_at DESC);
COMMIT;
