# WhatEatO Architecture v1.4 — backend development / Phase 1

This change extends the **existing Next.js backend**. A disruptive NestJS migration is deliberately postponed: the current Next.js API server already connects to a dedicated Neon PostgreSQL DB and a previously approved frontend. API routes are separated under `/api/v1/` so the backend can later move behind a separate NestJS service without changing clients.

## Migration dependency
- `db/migrations/004_i18n_analytics.sql` requires existing `restaurants(id uuid,...)` and deployed 001/002 schema.
- 003 moderated user reviews remains independent.
- Migration 004 was validated on Neon staging and then applied non-destructively to the production database on 2026-10-12 after an independent recovery branch was created. See `docs/PHASE_1_5_DB_QA_20261012_KO.md`. GitHub PR #6 remains Draft and its Next.js API/UI code is **not yet deployed**.
- Localizations are `draft` by default. Verified tags, licensed photos, published menus and approved independent scores are gated; no machine-invented public facts are seeded.
- Locale list: `ko, en, ja, zh-CN`. Restaurant primary IDs are shared across languages; URL localization and translated UI remain subsequent work.

## APIs
- `GET /api/v1/restaurants?q=&hl=en&f=cafe,solo_dining&region=&limit=20` read-only, PostgreSQL-powered multilingual lookup.
- `GET /api/v1/restaurants/:id?hl=ja` verified details with safe Korean fallback.
- `POST /api/v1/analytics/events` same-origin JSON event capture (allowed event types only).
- `GET /api/v1/admin/analytics?days=30` server-to-server Bearer `WHATEATO_ANALYTICS_ADMIN_TOKEN`, at least 32 characters; not for browser localStorage. Keep token in server secret manager.

## Analytics privacy and limitations
- Event store contains only event kind, coarse device class, locale, page kind, coarse traffic channel, optional restaurant ID, optional filtered search term, and optional result count.
- No IP, fingerprint, user ID, cookie, persistent session identifier or raw user agent saved. Therefore **unique visitors, retention and exact sessions are NOT available**, only event counts. Search term may be dropped when PII-like.
- Do not disclose "unique visitors" or "conversion" from mere event counts. Event metrics are approximate, affected by ad blockers and bots.
- Before production: set up reverse-proxy rate limiting and abuse protection; finalize privacy policy and legal review, and run an explicit event-retention task daily:
  `DELETE FROM whateato_analytics_events WHERE occurred_at < now() - INTERVAL '30 days';`
- Analytics feature is disabled until the migration and database configuration are complete. A true session-based unique-visitor metric requires separate consent and privacy design.
- Do not collect raw referrer URLs or search strings with likely personally identifying patterns.

## Operational QA
1. DONE (2026-10-12): Verified migration 004 in a staging branch, created a separate Neon recovery branch, and verified production migration with 10,000 unique restaurant records intact.
2. Confirm `/api/ready` before testing `/api/v1/restaurants`.
3. Confirm filters only match `verification_state='verified'` and only published restaurant/menu content is served.
4. Verify anonymous events are accepted without cookies and invalid/cross-site submissions are rejected.
5. Verify admin endpoint denies unauthorized requests and reports counts with clear labels.
6. Verify design-lock CI stays green; no locked layout, header, home, CSS, or preview files were changed.

**Deployment status (2026-10-12):** The production database has migration 004; GitHub PR #6 is still Draft and new API/UI code has **not** been merged/deployed. Analytics ingestion, secrets and cleanup are **not** enabled.
