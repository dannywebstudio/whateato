# WhatEatO — First source-checked publication in staging (2026-10-13)

**Scope:** Neon staging `br-autumn-pine-b36z3utm`, Render preview `https://whateato.onrender.com`. Does not touch production Neon or main/Hostinger.

## Source-checked preview restaurant profiles

| Restaurant | Permit UUID | Public locale profiles | Verified menu names (no prices) | Source verification |
|---|---|---:|---|---|
| 광화문 미진 | `16918f58-4e63-4e49-a013-aad17e499ad4` | 4 | 냉메밀, 온메밀, 메밀전병 | [DiningCode](https://www.diningcode.com/profile.php?rid=QlMrlKl3A6ry), [Matzip Map](https://www.matzipmap.com/place/2ce8509f-565a-42b1-a479-965b81238687), [Tabling](https://www.tabling.co.kr/restaurant/10851) |
| 우래옥 | `2daa58f1-6360-4ddb-a27f-6e6d1437a122` | 4 | 평양냉면, 불고기 | [Official Seoul Tourism](https://korean.visitseoul.net/citycenter/%EC%9A%B0%EB%9E%98%EC%98%A5-Wooraeok/KOP003207) (updated 2026-09-11), [Tabling](https://www.tabling.co.kr/restaurant/5626) |
| 청진옥 | `6cc37914-1bb8-406e-a365-34c897b4f26f` | 4 | 해장국, 모듬수육, 안주전골 | [Official shop menu](https://www.cheongjinok.com/menu), [Tabling](https://www.tabling.co.kr/place/677cc7ae66de5f0698752d93), [Polle](https://polle.com/place/2RJqhH/%EC%B2%AD%EC%A7%84%EC%98%A5) |

Four locale profiles are Korean, English, Japanese and Simplified Chinese. Only cross-checked venue-specific details are used. External review text and ratings were not copied or rebranded.

### Public status and explicit exclusions
- Promoted exactly **12** verified source-linked locale records and **8** menu names on **Neon staging only**, using a branch-attested atomic transaction and exact restaurant identity/address checks.
- All 8 published menus deliberately have `price_krw=NULL`, `price_verified_at=NULL`. Publishing menu existence **does not** imply current price.
- Exactly **0** uploaded third-party photos, **0** licensed photos, **0** independent editorial ratings and **0** inferred subjective tags were added.
- Site is still marked `NEXT_PUBLIC_LAUNCH_READY=false`: SEO `noindex`, not a public production launch.
- Permits may not reflect current open/closed status or exact building entrance. Users must confirm on arrival.
- No review-staged profiles or menus for the other restaurants were changed or published.

### Quality gates
- Research packets: `data/enrichment-packets/wave2/` (reviewed source references, provenance and multilingual copy).
- Wave 2 validation: `scripts/verify_wave2_packets.mjs` prevents guessing ratings, prices and photo rights.
- Live staging QA: `scripts/verify_wave2_live.mjs` checks exact records, menu names, absence of photos and scores and visible Kakao directions via HTTPS.
- Design Lock v1 and isolated PostgreSQL/Playwright tests must pass before merging.

### Map root cause and fix
- Live Chromium QA proved that a mounted canvas alone was not sufficient: MapLibre v6 emitted `Worker failed to load`.
- The Next.js bundler lacked MapLibre's separate ESM worker: `scripts/copy_maplibre_worker.mjs` now copies the matching runtime to `public/maplibre` on every build/dev start and `RestaurantMap.tsx` uses explicit same-origin `setWorkerUrl`.
- After adding GeoJSON, the map became briefly non-`isStyleLoaded`; the old marker fetch returned prematurely. It now uses source presence to load markers immediately.
- Marker clustering reduces overplotting, and an independent permit-derived restaurant directory plus official OpenStreetMap embed remains available when WebGL fails on mobile.
- Automated QA now checks worker HTTP endpoints and map/data rendering, rather than only a map element's existence.

### Remaining work
- Durable object storage and documented right-to-use for venue photographs.
- More validated venue-specific menus, lifestyle tags and editorial methodology without fabricated star ratings.
- Licensed geocoding of 349 addresses; one shared-building candidate remains review only.
- Production acceptance, operations contacts/privacy and deployment policy before `NEXT_PUBLIC_LAUNCH_READY=true`.
