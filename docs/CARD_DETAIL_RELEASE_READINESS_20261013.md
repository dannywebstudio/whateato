# WhatEatO — launch card/detail readiness audit (2026-10-13)

Scope: Neon staging branch br-autumn-pine-b36z3utm, development branch feature/i18n-analytics-backend-v1. Production unchanged.

## Read-only database baseline

- Restaurants 9,998 after two exact-key verified closures removed.
- Missing restaurant names: 0; missing registered addresses: 0.
- Missing coordinates: 350; invalid/out-of-bounds non-null coordinates: 0.
- Missing registry category: 2.
- Published localization rows: 12, representing 3 restaurants across 4 languages: 광화문 미진, 우래옥, 청진옥.
- Restaurants with evidence-backed published menus: 3.
- Restaurants with verified tags: 0.
- Restaurants with licensed published photos: 0.
- Restaurants with approved externally sourced ratings: 0.

**Do not infer** that remaining 9,998 are currently operating; official permit-based catalog is not live operating confirmation.

## Code remediation completed on feature branch

1. Card/detail TypeScript rating contract made consistent, removing duplicate ratings property and typing detail ratings explicitly.
2. Search cards show only evidence-verified tags when present; Korean heading corrected.
3. Restaurant detail order follows owner locked hierarchy: verified menu precedes expanded introduction, tags, and address.

## Blocking work before public release

- Independent build and Render visual QA of mobile/desktop; no success claim until CI run confirms.
- Supply rights-cleared photos, verified menus, tags, descriptions and eligible ratings. No fabricated placeholders or automatic external star-score creation.
- Review gallery placeholder and responsive maps across device sizes; test Google Maps Save handoff and directions.
- Confirm missing coordinates' map fallback, category fallback for 2 records, correct localized detail text and links.
- Approve and merge development PR #6 only after CI, staging, and DESIGN LOCK checks; the edits above are NOT yet live on the default branch.
- Continue permit closure reconciliation after launch as separately agreed.

## Location processing

Confirmed order: Seoul > Incheon > Gyeonggi (distance to Seoul boundary pending reliable geometry) > Busan > Gyeongju > Daegu > remaining.
