# WhatEatO — Phase 4 source recheck (2026-10-13)

## Scope and nonpublication rule
Read-only web source research for two of the initial 20 candidate restaurants. These notes are evidence and discrepancy flags, not proof of current operation, photo license, published menu price, or an approved WhatEatO score. No production or staging DB writes were made in this research step.

## 1. 두레유 — 31adc115-9e51-421d-859c-54e22ce79e0c
- Original permit record: 서울특별시 종로구 평창30길 28 (평창동), permit category '경양식'.
- Modern business listing (Daangn, updated 2026-10-10): 서울 종로구 평창문화로 84 전진빌딩 2층; classed as Korean dining. https://www.daangn.com/kr/local-profile/%EB%91%90%EB%A0%88%EC%9C%A0-vf66du25qpe8/
- Independent DiningCode restaurant listing: Korean course dining; includes 별/하늘/달 courses. https://www.diningcode.com/profile.php?rid=zsoxtvEnM0dQ
- Historical Hyundai Card PDF identifies the same restaurant at the *older permit address* 평창30길 28; **historical source does not establish today's location**. https://www.hyundaicard.com/doc/gourmet_week_23_SEOUL.pdf
- **Decision: HOLD identity/address matching.** Current business listing likely refers to a moved establishment, but there is not enough evidence that the old permit-row UUID represents its present-day location or that the old establishment is still active. Do NOT attach new location, menu, prices, lifestyle tags or score to this UUID; preserve original address and coordinate pending registry recheck. Require business registration/permit linkage, move history, or trustworthy source directly tying identity across both addresses.

## 2. 프랭크버거 동국대점 — 6d2889f5-0764-4fc9-b2c5-eb2b72c07c77
- Permit address 서울특별시 중구 서애로1길 18, 1층 (필동3가) agrees with Daangn and Tabling listings.
- Daangn source (updated 2026-07-18): https://www.daangn.com/kr/local-profile/%ED%94%84%EB%9E%AD%ED%81%AC%EB%B2%84%EA%B1%B0-%EB%8F%99%EA%B5%AD%EB%8C%80%EC%A0%90-fbmrg8dy2j2e/
- Tabling: https://www.tabling.co.kr/place/677cd09c66de5f06988663c3
- Menu items supported across sources: 프랭크치킨버거, 치폴레치킨버거, 오꼬노미쉬림프버거. However prices differ across directories, so **keep price_krw NULL**. Existing draft packet already covers four languages and three menus; do not duplicate packet or stage it again without review.
- No independent score: external 3.8/4.5 directory ratings cannot be adopted as WhatEatO stars. No public photo license established.
- **Decision: existing review packet remains REVIEW ONLY.** Check official branch/menu and current price before publication; do not import review-platform pictures.

## Next checks
1. Flag 두레유 for manual permit/status/relocation verification before any staging enrichment or publishing. No automatic overwrite of the restaurant identity or coordinate.
2. Retain restaurant prices as NULL when sources conflict; use time-stamped store menu/owner evidence only after confirmation.
3. Check address/category mismatches in the initial 20 before using registry classifications as lifestyle labels.
4. Reconcile with staging and production branch IDs before any DB write. Human/editorial sign-off required for publication and rights-approved photo delivery.

## Safety invariants
DESIGN LOCK v1 unchanged. No raw restaurant row deleted, renamed, moved or silently hidden. No claim about live opening, licensed imagery, verified ratings, or completeness of the 10,000-record catalog.
