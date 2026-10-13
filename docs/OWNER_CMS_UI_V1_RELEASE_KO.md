# WhatEatO CMS — Owner UI v1 / Global First

## Scope and visual contract
- Public WhatEatO UI remains Design Locked. Exception: explicit owner-approved restaurant image strip (max 3 visible desktop, 1 mobile with controls when >3) and owner-only Edit shortcut at restaurant top. Neither alters public global styles.
- `/admin` is a SEPARATE responsive workspace, not a general audience page and not indexed.
- Primary business language English, with independent localized drafts for en/ja/zh-CN/ko. English profile required before publishing new non-English profile.
- No affiliate / commercial promotion; AdSense only.

## Built
- Private `/admin` dashboard tabs: restaurant search/choose, 4-language details, 24-character bounded menus + representative item, evidenced tags, 7 days of KST opening hours with breaks, reversible visibility holds; batch draft/review/approve/execute, NDJSON import, 50 pending reviews per page for approval/rejection, restaurant image upload and approval.
- Backend BFF `/api/v1/owner/bulk/... ` routes forward to EXISTING tested token-gated batch service only after server-side Google session and admin DB role; tokens NEVER leave server. Origin must match on all writes.
- Protected catalog search `/api/v1/owner/catalog` and detail query support ID/name/district and prefill.
- Safe `/api/v1/owner/media` image upload: check 8MiB max, jpeg/png/webp, decode with Sharp, rotate per metadata, remove EXIF by reencoding, resize within 1600×1200 and encode WebP; private S3/R2 storage. Pending media not publicly served. Owner separately approves after verifying original and usage-rights evidence.
- Private object retrieval in existing `/api/v1/images/:uuid` still requires publication, rights and restaurant-active gates. Local file storage continues to work for legacy licensed images.
- Access roles: owner (all changes/approval), editor (draft/create), moderator (review moderation). No self-grant; role table manually provisioned.

## Staging verification
- Neon staging `br-autumn-pine-b36z3utm`, NOT production: migrations 014 and 015 applied as additive transactional DDL, without editing source restaurants or account/review rows.
- At verification: staging 9,998 restaurants / production 10,000. Production still lacks both migrations, as intended.
- CI: web typecheck/build, independent PostgreSQL 014/015 synthetic fixture and real HTTP admin-negative tests; browser full authenticated session only after owner identity/OAuth configuration.
- Existing DESIGN LOCK checks compare old pinned global CSS baseline, which fails inherited pre-existing `globals.css` mismatch; no global stylesheet changes in this feature. No bypass.

## Release conditions
1. Do NOT merge this into Render-watched branch yet. Deploy only after explicit owner approval of preview settings, or use a separate private preview service.
2. Configure Google Auth.js on Render (`AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET` and matching OAuth callback). No login secrets in source code.
3. Manually grant owner AFTER first verified Google login, by looking up internal account in staging:
   `SELECT id::text FROM whateato_review_accounts WHERE google_subject = '<verified owner Google subject>';`
   `INSERT INTO whateato_admin_accounts(account_id,role) VALUES ('<verified internal UUID>','owner') ON CONFLICT(account_id) DO UPDATE SET role='owner',enabled=true;`
   Do not rely on email alone or promote all existing reviewers.
4. Provision private S3-compatible bucket with restricted server access. Set five `WHATEATO_S3_*` secrets as shown in `.env.example`. Do not use Render ephemeral filesystem or GitHub for persistent user photos.
5. Configure `WHATEATO_OWNER_CMS_ENABLED=true`, `WHATEATO_BULK_ADMIN_ENABLED=true` plus strong `WHATEATO_BULK_ADMIN_TOKEN`, `WHATEATO_REVIEW_MODERATION_ENABLED=true` plus **different** strong `WHATEATO_REVIEW_ADMIN_TOKEN`. All must stay server-only. Add edge/WAF rate limits, extra authentication protections and event alerting.
6. First use 1-3 synthetic/verified staging restaurants. Verify published Search/Map/Detail, image endpoints and phone/desktop visual snapshots before production migration.
7. Confirm batch photos/locale and ratings do not change without explicit human review. No hard deletes.
8. Note: bulk UI NDJSON accepts up to 8MB per file (10k item limit). For truly large streams prefer `scripts/import_bulk_ndjson.mjs` (bounded 50-item network batches).
9. Review-photo upload by end users, five-criterion public review submission, photo moderation and approved-review-only official star calculation require a separate user-facing release. The 014 normalized schema is prepared but NOT activated; do not imply these are live.
10. Owner-only detail edit button links to `/admin?restaurant=<id>` and appears only when owner/editor session authorization passes. Anonymous visitors see the same approved layout.

## Rollback and safety
- Before a production migration, create a Neon snapshot/branch and confirm target branch ID.
- Application rollback = turn `WHATEATO_OWNER_CMS_ENABLED=false` and deploy previous commit; rollback does not destroy audits/data.
- Publication batches are append-only audit; user can unpublish localized items, menus or admin visibility holds via new authorized batches. No hard deletion of restaurant permit records.
- Never run synthetic fixture scripts against staging or production.
