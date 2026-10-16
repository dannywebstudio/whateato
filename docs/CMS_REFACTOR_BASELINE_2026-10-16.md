# WhatEatO engineering baseline — 2026-10-16

## Environment boundaries
- Production: Hostinger (owner confirmed production is running and updated).
- GitHub: dannywebstudio/whateato; repository default is `main`.
- Recent integration/release work: `feature/i18n-analytics-backend-v1`. **Do not assume this is Hostinger's configured deployment branch without confirming hPanel settings.**
- Render services are historical preview/testing environments. Do not deploy or reconfigure Render during production CMS work.

## Verified stack (repository)
Next.js 15, React 19, Node >=22 <25, Auth.js/next-auth, PostgreSQL via pg, MapLibre GL, S3 SDK, sharp. Build hooks copy/verify map worker and check publication/storage gates. Relevant scripts: `npm run typecheck`, `npm run build`, `npm run test:mapworker`.

## Shipped/implemented features to preserve
- Restaurant search, cards, detail/map views and locale selection (Korean, English, Japanese, Simplified Chinese).
- Google login, /login, /my-page review management, /account removal flow.
- Admin interface at /admin; role-based access: owner, editor, moderator. Server-side staff check uses enabled admin account and `WHATEATO_OWNER_CMS_ENABLED`.
- CMS restaurant content editing, menu/tags/hours/images, batches, review moderation and blog editing (inspect actual implementation before restructuring).
- Business data publication gates, review moderation and authorization are critical constraints.

## Quality and operational guardrails
1. Preserve externally visible URL paths, locale `hl` behavior, existing design-lock, authentication/session handling and public data gates.
2. Never rewrite/delete production data or run DB migrations as part of file cleanup.
3. Before deleting an old branch/file, check references from workflows, imports, release history, runtime entry points, and Hostinger deployment settings.
4. Move CMS features into modules in reviewable slices, retaining the API contracts. Prefer isolated pure helpers first.
5. Require `typecheck`, `build`, Design Lock, web CI and relevant API/mobile QA before merging.
6. Production rollout requires verification of actual Hostinger deployment, not just a merged GitHub PR.

## Refactor backlog (not yet performed)
- Break down `src/app/admin/AdminConsole.tsx` by restaurants, batches, reviews and blog, then extract shared typed API utilities.
- Reduce `any` in admin client / response handling while preserving JSON contracts.
- Audit stale preview/release scripts and old branches for actual consumers before archiving/deleting.
- Inventory admin API routes, migrations, media storage integrations and corresponding tests.
- Add regression checks for four-locale /account, /login and /my-page navigation.

## Baseline status
Documentation-only preparation. No deployment, migration, deletion, or production source refactor is implied by this baseline.
