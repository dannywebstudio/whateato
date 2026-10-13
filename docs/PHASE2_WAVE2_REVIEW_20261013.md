# WhatEatO Phase 2 / Research Wave 2 — 2026-10-13

## Verified technical status
- Scope is the dedicated Neon **staging** branch `br-autumn-pine-b36z3utm`, never production.
- 3 actual permit records studied: **광화문 미진**, **우래옥**, **청진옥**.
- 12 locale descriptions/names (ko, en, ja, zh-CN) staged as **review**.
- 8 menu names staged as **draft**, prices NULL, with source references.
- New public photos: **0**. Independent scores: **0**. No lifestyle tags automatically approved.
- No changes to `restaurants` identity, coordinates or business status.
- Original design remains DESIGN LOCK v1, and no changes have been merged into main.

## Evidenced candidates

### 광화문 미진 — 16918f58-4e63-4e49-a013-aad17e499ad4
- Registry name: 광화문 미진, road address 종로 19, 르메이에르 종로타운.
- Independent information: [DiningCode](https://www.diningcode.com/profile.php?rid=QlMrlKl3A6ry), [Matzip Map](https://www.matzipmap.com/place/2ce8509f-565a-42b1-a479-965b81238687), [Polle](https://polle.com/place/2ydYvH/%EA%B4%91%ED%99%94%EB%AC%B8%20%EB%AF%B8%EC%A7%84).
- Staged menu names: 냉메밀, 온메밀, 메밀전병. No prices or external review scores reproduced.

### 우래옥 — 2daa58f1-6360-4ddb-a27f-6e6d1437a122
- Registry address: 서울 중구 창경궁로 62-29.
- Evidence: [Seoul Tourism official listing](https://korean.visitseoul.net/citycenter/%EC%9A%B0%EB%9E%98%EC%98%A5-wooraeok_/3211), [Tabling](https://www.tabling.co.kr/restaurant/5626).
- Staged menu names: 평양냉면, 불고기. Monday closure/hours not copied into live permit status.

### 청진옥 — 6cc37914-1bb8-406e-a365-34c897b4f26f
- Registry address: 서울 종로구 종로3길 32.
- Evidence: [Official restaurant site](https://www.cheongjinok.com/), [tourism information](https://www.ktriptips.com/kor/food/2778428).
- Staged menu names: 해장국, 모듬수육, 안주전골. Existing permit status is not a guarantee of opening now.

## Publication prerequisites
1. Verify exact branch identity and matching registered name/road address.
2. Independently recheck menu evidence and translations; only then owner/editorial approval may switch descriptions to `published` and menus to `published`. Do not infer prices or approve without source/date.
3. Only verify lifestyle tags supported by venue-specific documentation. Never derive date-night, budget or traveler features solely from the name or general permit category.
4. Never copy photos from Google, Naver, directory listings or tourism websites without verified reuse rights for this site. Persistent photo storage must be configured before publication.
5. Any editorial score requires a documented independent method and sign-off. External stars remain external and must not be relabeled as WhatEatO scores.

## Geocoding findings (Neon staging)
- 10,000 permit records; 9,650 have coordinates, **350** are missing at least one coordinate.
- All 350 have at least a lot-number address; 130 also have a road address.
- Exactly one missing-coordinate row shares an **exact normalized street address** with another geocoded permit row: **태성관** (id `249504cc-af2e-4c11-854b-ec43dd0abc00`) and **문카페(Moon cafe)** (reference `18360cb7-7d1e-4ea3-b14b-682f354fae50`) at 서울 종로구 삼일대로 442.
- Its reference coordinate **37.5740001, 126.9877525** is a *building-position suggestion only*. It is **not** a verified restaurant entrance or an applied fix.
- Other 349 records need independently licensed geocoding and/or manual review. Do not do mass requests to a free public geocoder in breach of its rules.
- Source-controlled `scripts/report_geo_recovery.mjs` audits exact-match candidates read-only with branch attestation.

## Next milestone
- Source-review and publish only high-confidence selected records with explicit sign-off.
- Contract a legally usable permanent media bucket/CDN before rights-approved photographs.
- Owner-configured Korean address-geocoding provider and quality review for 349 additional coordinates.
