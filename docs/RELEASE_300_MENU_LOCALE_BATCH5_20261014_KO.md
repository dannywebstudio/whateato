# WhatEatO — Seoul 300 Phase 1–3 Verification Batch 5 (2026-10-14)

**Target:** Neon staging `br-autumn-pine-b36z3utm`. **Never executed on production branch**.  
**Code branch:** `feature/db-quality-release-v1` / Draft PR #9.  
**Google Places / Cloud Translation:** 0 calls (internal Neon usage counters 0); photo/rating data unchanged.  
**Dates:** All new menu-price observations are dated 2026-10-14; price is a published listing snapshot, not a same-day sale guarantee.

## Six researched restaurants: exact permit ID + exact road address

| Cohort rank | Store / permit address | New sourced menu labels | Four-language text | Staging release |
|---:|---|---:|---|---|
| 93 | 히말라야, 종로8길 5 | 6, all priced | 4 review | pending category-code check |
| 120 | 영화루, 자하문로7길 65 | 5, all priced | 4 published | approved |
| 125 | 된장예술과 술, 삼일대로15길 20 | 5, all priced | 4 published | approved |
| 129 | 진미통닭, 통일로 250 | 5, all priced | 4 review | pending category-code check |
| 142 | 모던김밥, 자하문로2길 10 | 5, all priced | 4 published | approved |
| 162 | 카페 레이어드 안국점 (permit: 레이어드 안국 (LAYERED)), 북촌로2길 2-3 | 5, all priced | 4 review | pending consumer category check |
| **TOTAL** | **6 restaurants** | **31 menu entries** | **24 translation rows** | **3 newly approved** |

Public branch menu sources:
- Himalaya https://www.tabling.co.kr/place/677cc7a066de5f0698751174 and https://polle.com/place/34Sc2N/%ED%9E%88%EB%A7%90%EB%9D%BC%EC%95%BC
- Yeonghwaru https://www.tabling.co.kr/place/677cc7a166de5f06987511d5 and https://polle.com/place/367IDs/%EC%98%81%ED%99%94%EB%A3%A8
- Doenjang Yesulgwa Sul https://www.tabling.co.kr/place/677cc7a166de5f06987511e0 and https://www.diningcode.com/profile.php?rid=HAbodMSg2ugU
- Jinmi Tongdak https://www.diningcode.com/profile.php?rid=pnHPNYYQmnb1 and https://www.daangn.com/kr/local-profile/%EC%A7%84%EB%AF%B8%ED%86%B5%EB%8B%AD-1zyefpmr4gpn/
- Modern Gimbap https://www.tabling.co.kr/place/677ccaa766de5f06987bafa4 and https://polle.com/place/1tEd1Z/%EB%AA%A8%EB%8D%98%EA%B9%80%EB%B0%A5
- Cafe Layered Anguk https://www.tabling.co.kr/place/677ccb5566de5f06987d0c86 and https://polle.com/place/3e2GVz/%EC%B9%B4%ED%8E%98%20%EB%A0%88%EC%9D%B4%EC%96%B4%EB%93%9C

## Phase 1: prevent wrong restaurant identity / non-dining category

Additional reversible review: **부촌육회** in the candidate CSV at **종로 192-1**, whereas the publicly listed *main branch* is **종로 200-12**: https://www.diningcode.com/profile.php?rid=ygREB8CZWizP . Saved `BRANCH_ADDRESS_COLLISION / pending`, set selected cohort state `hold`. Its source restaurant row, original name/address and ID are **not modified**. Do not import menus from the 200-12 restaurant into the 192-1 record until correctly identified.

Additional `PERMIT_CATEGORY_CONFLICT / pending` quality review flags:
- Himalaya original `경양식` versus Indian/Nepalese restaurant,
- Jinmi original `분식` versus chicken restaurant,
- Layered original `기타` versus dessert café.

**Category-review pending is not a reason to delete the venue or fabricate new permit data**. Published restaurant listings remain blocked by the server's quality gate until issues are resolved.

## Stage cohort state after batch

| Metric | From previous batch | Now |
|---|---:|---:|
| 300 selected candidate restaurants | 300 | **300** |
| Stage approved venues with 4 published locales | 27 | **30** |
| Venues with source-listed menu | 33 | **39** |
| Total published menu entries with provenance | 106 | **137** |
| Published menus with listed KRW price | 103 | **134** |
| Published menus missing 4-locale names | 0 | **0** |
| Published menus missing evidence URL | 0 | **0** |
| Duplicate Korean menu titles within each published restaurant | 0 | **0** |
| Reversible identity/closure holds | 2 | **3** |
| Locale records | 1200 | **1200** |

Post-batch locale states: `published` 120 (30 venues), `review` 64 (16 venues), `draft` 1016 (254 venues).

### Work queue (exactly 300)
- exact-branch menu research and prices: **251**
- release gate eligible: **30**
- category/identity review needed: **14**
- identity/closure `hold`: **3**
- restaurant's 4-locale editorial review needed: **2**

**Full 300-venue launch gate remains BLOCKED.** Staging `approved` is a research/quality cohort status and does not mean a production deployment, business owner endorsement, recent opening-hour confirmation, or live prices.

## Reproducible artifacts

- `sql/staging_release_300_verified_menu_batch_31.sql` — exact branch address checks, 31 menus, 124 menu-language names, 31 dated price snapshots, 24 restaurant translations.
- `sql/staging_release_300_quality_hold_batch_32.sql` — reversible wrong-address release hold and three pending category issues.
- `sql/staging_release_300_locale_approve_batch_33.sql` — stage approval for three fully source-reviewed, non-flagged restaurants.
- `data/release-cohort-300-v1-work-queue.csv` — refreshed source-driven prioritization.
- `data/release-cohort-300-v1-review.csv` — refreshed 300-record release roster.

**Next:** investigate 251 venue menu gaps, resolve 14 category/identity flags, review 2 menu-bearing venues, and run locale/mobile visual QA plus failing legacy CI before considering production deployment.
