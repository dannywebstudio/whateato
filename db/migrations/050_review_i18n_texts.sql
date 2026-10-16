-- Four-locale owner-provided translations for authentic user reviews.
-- The user's original review, author ownership and moderation state never change.
BEGIN;
CREATE TABLE IF NOT EXISTS whateato_review_translations (
 review_id uuid PRIMARY KEY REFERENCES whateato_user_reviews(id) ON DELETE CASCADE,
 bodies jsonb NOT NULL CHECK (
   jsonb_typeof(bodies)='object'
   AND bodies ?& ARRAY['ko','en','ja','zh-CN']
   AND jsonb_typeof(bodies->'ko')='string'
   AND jsonb_typeof(bodies->'en')='string'
   AND jsonb_typeof(bodies->'ja')='string'
   AND jsonb_typeof(bodies->'zh-CN')='string'
 ),
 updated_by uuid NOT NULL REFERENCES whateato_review_accounts(id),
 updated_at timestamptz NOT NULL DEFAULT now()
);
COMMIT;
