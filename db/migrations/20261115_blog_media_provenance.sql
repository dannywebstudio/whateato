-- Adds explicit provenance to the existing owner-only blog media pipeline.
-- Existing CMS rows keep provenance_kind='legacy'; no existing bytes/links change.
ALTER TABLE whateato_blog_media
  ADD COLUMN IF NOT EXISTS provenance_kind TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE whateato_blog_media
  ADD COLUMN IF NOT EXISTS provenance_note TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='whateato_blog_media_provenance_kind_check') THEN
    ALTER TABLE whateato_blog_media
      ADD CONSTRAINT whateato_blog_media_provenance_kind_check
      CHECK (provenance_kind IN ('legacy','ai_generated','owner_original','licensed'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='whateato_blog_media_provenance_note_check') THEN
    ALTER TABLE whateato_blog_media
      ADD CONSTRAINT whateato_blog_media_provenance_note_check
      CHECK (length(provenance_note) <= 600);
  END IF;
END $$;
