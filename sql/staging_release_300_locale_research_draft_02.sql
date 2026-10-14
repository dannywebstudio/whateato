-- Upgrade only our metadata-only auto drafts when a place-specific research text exists.
-- Status stays "review"; NOTHING is published or verified. Do not override existing
-- editorial/review/published text or original permit identity.
UPDATE restaurant_localizations l SET
 short_description = NULLIF(btrim(e.editorial_draft_i18n ->> l.locale),''),
 publication_state='review',
 source_notes='release300:2026-10-14:restaurant_external_research.editorial_draft_i18n; source research pending manual identity/menu QA; NOT approved for publication',
 updated_at=now()
FROM restaurant_external_research e
JOIN whateato_release_cohort_300_v1 c ON c.restaurant_id=e.restaurant_id
WHERE l.restaurant_id=e.restaurant_id
 AND l.publication_state='draft'
 AND l.source_notes LIKE 'release300:2026-10-14:public-permit-district-only%'
 AND LENGTH(btrim(COALESCE(e.editorial_draft_i18n ->> l.locale,'')))>0;
