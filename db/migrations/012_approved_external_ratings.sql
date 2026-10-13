-- Separately attributed external ratings; never derived from generated reviews.
-- Copyright/provider permission and evidence approval are required for publication.
CREATE TABLE IF NOT EXISTS restaurant_external_ratings (
 restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
 provider text NOT NULL CHECK(provider IN ('naver','google')),
 rating numeric(3,2) NOT NULL CHECK(rating BETWEEN 0 AND 5),
 source_url text NOT NULL CHECK(source_url LIKE 'https://%'),
 observed_at timestamptz NOT NULL,
 publication_permission_ref text,
 approved_by text,
 approved_at timestamptz,
 publication_state text NOT NULL DEFAULT 'review' CHECK(publication_state IN ('review','published','rejected')),
 PRIMARY KEY(restaurant_id,provider),
 CONSTRAINT approved_external_rating_requires_rights CHECK(publication_state <> 'published' OR
  (nullif(btrim(publication_permission_ref),'') IS NOT NULL
   AND nullif(btrim(approved_by),'') IS NOT NULL AND approved_at IS NOT NULL))
);
