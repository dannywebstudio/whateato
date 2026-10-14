# WhatEatO Blog CMS v1 — staging release (2026-10-14)

## Operator workflow
1. Sign in at `/admin` with an allowlisted Google editor/owner account.
2. Open **블로그 콘텐츠** tab; create an English URL slug `a-z0-9-`.
3. In the article editor, enter English title, summary, SEO title/description, 200+ characters of body plus a heading.
4. Use the block toolbar for paragraphs, H2/H3 headings, ordered editorial text, bulleted lists, quotes, tables, dividers, simple bold/italic/HTTPS links and emojis. Move blocks via drag/drop; use up/down buttons on mobile.
5. Drag a photo into the dedicated image zone or select a file (JPG/PNG/WebP, 8MB max). Identify **cover** (1200×810 suggested) or **inline** (up to 1400×1100) and supply separate HTTPS source/right references and confirmation.
6. Owner reviews the uploaded image and clicks approval. Approved inline images become selectable in image blocks. A cover is included in public snapshots only after approval and a new publication.
7. Link zero to eight actively published verified restaurants by CMS search, add up to eight tags, and optionally fill Japanese/Chinese/Korean translations. English is the safe fallback.
8. Click **초안 저장**, then **검수 요청**, and let an owner click **승인하고 발행**. Draft revisions use optimistic concurrency; a conflict requires reloading. Editors cannot publish.
9. Visit `/blog` for the public index, categories and text search; `/blog/<slug>?hl=en` for SEO-aware article and related restaurants. Other locales use `hl=ja`, `hl=zh-CN`, and `hl=ko`.
10. To edit a published article, modify its draft and repeat the review/publish step. **Previously published content stays live unchanged until that step.** An owner may unpublish instantly without discarding drafts or prior snapshots.

## Architecture and protection
- No WordPress or new paid service. Existing Next.js 15, Postgres/Neon and private S3-compatible object storage.
- Migration `db/migrations/019_blog_cms_editorial.sql`: immutable slugs, draft revisions, separately approved public snapshots, media rights and audit records.
- Auth.js Google + preapproved CMS roles; editor draft/edit/upload, owner publish/unpublish/media rights; moderators cannot read/write blog CMS.
- All writes require a trusted same-origin header; JSON upload size is bounded. Images use a bounded upload stream with Sharp WebP re-encoding and private S3 keys. Public media is served only if separately approved **and referenced in an active published snapshot**.
- Database and article text are not exposed to unauthenticated users until owner publication. Blocks render as escaped React text, not raw HTML. Inline editorial HTTPS links add `rel=noopener noreferrer nofollow`.
- Directory related IDs are validated at publication; draft content uses UUID references without ever modifying the original restaurant rows.
- SEO metadata, JSON-LD BlogPosting and sitemap only include the approved live article snapshot; staging remains blocked from search indexing via `NEXT_PUBLIC_LAUNCH_READY=false`.
- No synthetic article was inserted into Neon staging. CI uses isolated localhost PostgreSQL.
- Current Blog v1 is a structured block-based editor (not WordPress or a third-party visual page builder). Advanced media cropping/history rollback and publishing schedules are not part of this increment.

## QA and deployment
- Staging Neon branch: `br-autumn-pine-b36z3utm`, production branch `br-misty-darkness-b3lr98mz` remains unchanged.
- Dedicated Render preview: https://whateato-cms-preview.onrender.com/admin and https://whateato-cms-preview.onrender.com/blog
- GitHub source branch: `feature/cms-admin-ui-v1`, Draft PR #8; no main merge/production deployment without owner approval.
- CI checks new article, duplicate slug, editor/owner/moderator permission boundaries, CSRF, draft invisibility, review approval and publication, article reading and search, snapshot isolation during editing, republication and emergency unpublish.
- Existing DESIGN LOCK global CSS tests and inherited Phase 2 seed are separate; they must not be bypassed merely to release the blog. Public home/search/map/details styling is untouched.
