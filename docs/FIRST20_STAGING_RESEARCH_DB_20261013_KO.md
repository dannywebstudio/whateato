# WhatEatO — Initial 20 restaurant staging research import (2026-10-13)

## Completed
- Original restaurant IDs, names and permit addresses exact-matched to staging Neon before research rows were inserted; 20/20 inserted.
- Added migration 011 `restaurant_external_research`, isolated from all public catalog SQL.
- Imported four-language (ko/en/ja/zh-CN) SHORT DESCRIPTION DRAFTS, observed third-party menu/price candidates, reservation reports, identity flags, and unverified opening-hour fields for each of 20 candidates.
- 1 Google Maps observation for 호호식당 대학로점, 4.1/5, retained as Google-attributed RESEARCH ONLY and not represented as verified Naver score or site editorial rating.
- Naver source directly inaccessible; 0 verified Naver ratings.
- 20 research rows in pending review, 0 direct public catalog publication.
- Production/main untouched. No external photos copied. No hours asserted as open-now, no current menu prices confirmed.

## Critical source/identity cautions
- 두레유 permit road address vs more recent web directory address differ; do not attach new location to existing permit row automatically.
- 신선원 / 신신원 name disagreement requires a business-identity check.
- copper coffee and 살구골 externally reported closed; current status unresolved until independent confirmation.
- 농민 사골 순대국 permit-category mismatch, 프랭크버거 price conflict, 탕화쿵푸마라탕 branch alias review needed.
- Not all third-party menu candidate prices were confirmed current.
- Naver Place may emphasize visitor-review narratives rather than a numeric star rating. Store null if none publicly verifiable; never invent one.
- Provider terms, accuracy and display attribution must be reviewed before republishing Google/Naver place content.

## Remaining validation for owner-approved search/detail card
- Official venue identity/operation status, correct branch and address.
- Source-verified current full weekly hours, breaks, over-midnight and holidays; only then approved opening status.
- Complete menu and current verified price, dated evidence.
- Reservation channel and whether it is currently bookable.
- Photos with explicit publication rights and verified editorial score methodology.
- English/Japanese/Simplified Chinese menu translations and proofread presentation.
- Latest CI/Render PC and mobile QA before launch.

## Deployment boundaries
Neon project aged-wildflower-47196131, staging br-autumn-pine-b36z3utm only.
No production branch migrations, no deletion, no homepage DESIGN LOCK changes, no catalog publication. Migration 011 must be explicitly applied to production only if/when release is approved.
