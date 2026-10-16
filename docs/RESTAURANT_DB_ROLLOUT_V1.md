# WhatEatO Restaurant Database Rollout v1 — 2026-10-17

## Owner-defined order (finish each stage before the next)
- Stage 1 Incheon: Dongincheon → Mansu → Guwol → Bupyeong → Yeongjongdo
- Stage 2 Seoul: Seoul Station → Sinchon → Hongdae → Ewha → COEX → remaining Seoul
- Stage 3 Busan: Gwangalli → Haeundae → remaining Busan

## Release definition
"Deployed" means an **actually visible restaurant on the public Map**. `restaurants.publication_status='published'` alone does **not** mean deployed. Approval requires the visible Map approval record and triage/publication safeguards.

## New restaurant release gate
1. Photos are optional and never a blocker.
2. Correct Korean restaurant identity and physical address, verified map coordinates; restaurant actively operating.
3. Sourced, verified operating hours with actual intervals (opening source and verified timestamp).
4. At least one supported **published** menu item with a valid evidence reference. KRW price is **optional** if not source-verifiable; never invent a price.
5. Verified English, Japanese and Simplified Chinese restaurant names, addresses, and at least one menu translation each.
6. No C-grade, confirmed quality hold, or incomplete identity; missing or contradictory evidence stays **hold**.
7. Explicit visible approval is required; owner-approval audit is retained. Existing three `baseline` Map locations are grandfathered rather than inadvertently hidden.

Do not produce fabricated source checks, hours, translations, coordinates or prices. Do not scrape and upload copyright images.

## Operational DB structures
The Hostinger-launch Neon branch (`launch-hostinger-20261015`) contains:
- `whateato_region_rollout_v1` — ordered 14 regional waves.
- `whateato_region_refresh_queue_v1` — source-backed staging and review states; every candidate starts `hold`.
- `whateato_region_release_readiness_v1` — read-only eligibility view, with explicit individual QA flags.

A candidate being in the queue **does not** publish it. Populate the production restaurant tables from verified evidence, independently QA details/localizations, then apply legitimate owner approval only when all gates pass. Manually call this process as needed; do **not** introduce daily background rechecking.

## Initial audit at 2026-10-17
- `launch-hostinger-20261015`: 9,998 existing restaurants, all Seoul (Jongno/Jung/Eunpyeong).
- Incheon: zero imported restaurants; Busan: zero imported restaurants; all must be sourced anew.
- Current Map visible approval records: 3 baseline Seoul restaurants.
- Initial Stage-1 Dongincheon sourced candidates: 28 held, zero newly published.
- Sources include individual venue pages at Tabling and an additional curated directory (candidate discovery only). Recheck original venue identity, current location, specific daily hours and menu before publication.

## Useful QA
```sql
SELECT p.stage,p.priority,p.region_label,
 COUNT(q.id) candidates,
 COUNT(*) FILTER (WHERE v.eligibility='ready') ready,
 COUNT(*) FILTER (WHERE q.review_state='deployed') deployed
FROM whateato_region_rollout_v1 p
LEFT JOIN whateato_region_refresh_queue_v1 q USING(region_key)
LEFT JOIN whateato_region_release_readiness_v1 v ON v.queue_id=q.id
GROUP BY p.stage,p.priority,p.region_label
ORDER BY p.stage,p.priority;
```
