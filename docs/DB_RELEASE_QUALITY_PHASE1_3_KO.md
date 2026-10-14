# WhatEatO DB Release Gate v1 — 2026-10-14

## Current audit (Neon staging `br-autumn-pine-b36z3utm`, read-only)
- Source rows: **9,998** (production still **10,000**, untouched).
- Geographic distribution: Jongno-gu 6,640; Jung-gu 3,357; Eunpyeong-gu 1. **NOT** nationwide coverage.
- Generic permit category `기타`: **2,132**. May include genuine food venues; never bulk delete by category.
- Name-based non-food candidate list: **15** under broad regex, **not** a confirmed removal count.
  - Example true-food-risk: `미술관옆돈가스`, `종각역 미술관고기집 인사동점`.
  - Example strong review candidates: `KSK공인중개사사무소`, `간향건축사무소(하이)`, `김용기 미술관`.
  - Food-service permit classifications can conflict with an operator's storefront name; require source checks.
- **185** names carry leading corporate markers.
- Road addresses missing **338**, all **338** have lot addresses. **0** have neither address.
- Coordinates absent **350** (do not invent coordinates).
- **3 of 9,998** restaurants have *verified, published* menus (**8 menu entries**). 24 unverified/review/published menu source rows exist.
- Restaurant descriptions published in **all four languages for 3 restaurants**; seven more per language are held in review.

## Phase 1: Venue eligibility and consumer-friendly display name
1. Preserve original `restaurants.name_ko` and legal/source IDs. Publicly display a cleaned name only when a **leading** `(주)`, `㈜`, `주식회사`, `(유)`, `유한회사` marker exists. Never remove unrelated parentheses.
2. Use `restaurant_data_quality_reviews` pending status for suspicious nonfood/identity cases. Require evidence that **the actual customer-facing site is not a food-service venue** before `confirmed_hold`; never delete rows just for keywords.
3. Preserve UUIDs, ratings, reviews, provenance, and address identities. Do not collapse normalized-name collisions into one restaurant.
4. Hard-delete only after explicit owner approval of an **itemized, reviewed ID list** and independent backup; prefer reversible publication hold.
5. Release audit must not contain unreviewed nonfood suspects among public records.

## Phase 2: Evidence-first data enrichment, excluding photos and ratings
1. Address: use `road_address_ko` if available, otherwise source `lot_address_ko`. This covers all existing staged rows. Never invent road address or geocoding coordinates.
2. Coordinate exceptions (350): review official address mapping and source identity individually before publishing geolocated pins; retain valid address in Search.
3. Menu — highest priority: obtain branch-specific dishes from restaurant-owned current menus, authorized booking/menu data, or permitted official source; save source URL, checked date, original Korean text, and optional verified price. **Never** substitute cuisine category or fabricated sample dishes.
4. Queue unverified menus as `review`, publish only after source-backed validation. Prices and hours need their own verification.
5. Prioritize actual tourism searches / food categories / approved venues before scaling. Don't claim 9,998 complete until audited.

## Phase 3: Korean / English / Japanese / Simplified Chinese
1. Store only `ko`, `en`, `ja`, `zh-CN`; keep proper brand names where translation would misidentify the venue.
2. Translate name/transliteration, short description, **verified menus**, source-backed address fields, and search aliases. Preserve the Korean original and record provenance.
3. Missing translation → explicit source-language fallback rather than fake localized or unverified text. Do not publish invented translation into approved records.
4. Verify semantic language choices, Korean word breaks, Japanese/CJK line breaks, and no overflow at 1440/390/360px for Home, Search, Map, Details and Blog.
5. For truly multilingual-first release, only announce four-language complete coverage for venues passing all four publication checks. Otherwise label fallback honestly.

## Pre-launch gating
- Phase1: owner-reviewed nonfood candidate exclusions; no raw permit deletion.
- Phase2: source-backed Korean menu coverage for each showcased venue; no invented prices, hours, photographs or ratings.
- Phase3: 4-locale content completeness and full viewport/locale QA for released priority cohort.
- Neon backup + repeatable migration audit; stage first, **production deployment remains a separate approval**.
- This document does not authorize destructive SQL on any Neon branch.

Audit SQL: `sql/db_release_quality_audit_v1.sql`.
