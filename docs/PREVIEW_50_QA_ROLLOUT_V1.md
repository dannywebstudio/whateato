# WhatEatO Preview 50 — QA-first rollout (2026-10-13)

Owner sequence: **complete 50 → check rendered website → owner approves UI → repeat in batches**. Existing Design v1.0 LOCK remains unchanged.

## Data
- The first batch is sample_rank 1..50 from existing staging table `restaurant_enrichment_sample_1000`.
- Nothing is deleted. Unfinished DB rows are hidden in preview, never deleted.
- At audit time: 50 target records, 3 with published intro+menu, 0 approved-rights images, 0 verified tags. This is not 50 finished places.

## Activate private/staging preview
- Only on the Render staging service with the **staging** DATABASE_URL, configure `WHATEATO_PREVIEW_50_ONLY=true`.
- Never set this on production. Default unset/false preserves the existing catalog.
- When true: search cards, detail deep links, /api/v1/restaurants and /api/v1/map/markers, nearby map sources sharing getGeoCatalog all restrict to first 50, AND require published description, published menu, approved image rights, verified tags, no identity hold.
- An unready restaurant is invisible to catalog search, map and its detail URL returns 404. As each passes QA, it appears automatically without a design change.
- Require tables `restaurant_enrichment_sample_1000` and view `restaurant_content_readiness_v1` in staging; never activate against unknown databases.

## QA and expanding beyond 50
1. Research each official record and reconcile official permit identity with transient NAVER cross-check; Google Places New ID-only cannot establish name/address validity. Verify official business status.
2. Write independently evidenced description, menus and appropriate tags into draft-only moderation. Acquire photography with explicit reusable rights and publish approval. Do not copy NAVER/Google API response data.
3. Verify exactly 50 eligible entities using the readiness view, source evidence, publication status, correct place identities, representative photos, human QA.
4. Owner views exact Render preview URL and signs off desktop/mobile Search/Map/Card/Details UI.
5. Only after approval create a scoped batch size increase (51-100 etc), do not silently expand filter.
6. Before any production deployment, separate approval and compatibility/migration checks.

## Important
- Google request billing guard stays ID-only, one call in probe. Never introduce paid fields automatically.
- Naver content use restricted to transient checks until rights review.
- No claim that 50 venues are complete until actual evidence + image rights + UI QA passes.
- Existing tests/build still need a successful CI check after this commit.
