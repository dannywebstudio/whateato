# WhatEatO — Initial 20 identity verification wave 4 (2026-10-13)

Staging-only, research evidence; original public restaurant records untouched. No automatic rename/move/closure, no synthetic scores or reviews.

## High-priority four venue cases

1. **두레유** (`31adc115-9e51-421d-859c-54e22ce79e0c`). Original permit row 서울 종로구 평창30길 28, 경양식. A **separate public permit-derived source** lists 두레유 at 서울 종로구 평창문화로 84, 한식, with 2023-11-03 notification and a different location. https://dining.ayo.pe.kr/restaurant/6dcf9fb7252d9eb732349bf286b57608 ; current local directory https://www.daangn.com/kr/local-profile/%EB%91%90%EB%A0%88%EC%9C%A0-vf66du25qpe8/ . Archived older business reference https://fmr.purpleo.co.kr/view/99 contains cancelled model-restaurant designation with 폐업 as reason; the designation is NOT an authoritative, current status for all premises. **Human permit ID reconciliation required** before merging two records or overwriting coordinates.
2. **신선원** (`3c47f857-03f1-434b-a42b-21c460999086`). Original permit `종로 263-1`. Independent current listings use **신신원**, `종로 263` / `263-1`, telephone 02-762-6927: https://polle.com/place/5cMqQy/%EC%8B%A0%EC%8B%A0%EC%9B%90 ; https://www.daangn.com/kr/local-profile/%EC%8B%A0%EC%8B%A0%EC%9B%90-y7d6p1do2veg/ ; https://www.siksamenu.co.kr/food/detail.asp?seq=500961525 . May be renamed business, same site or distinct source row. Do not silently replace official name, map pin, photos, menus or scores.
3. **copper coffee** (`ba36c7fb-532d-4f3d-aaa3-71100edd0a16`). Polle listing marks **폐점** with same address 혜화로9길 7: https://polle.com/place/4kqkEX/%EC%BB%A4%ED%8D%BC%20%EC%BB%A4%ED%94%BC . Closure remains a third-party claim needing independent confirmation. Freeze enrichment to avoid advertising presumed open status.
4. **살구골** (`1b246b70-bb17-44b9-b121-f9903ebd9331`). Polle listing marks **폐점** with same address 소월로 20-4: https://polle.com/place/1HDts2/%EC%82%B4%EA%B5%AC%EA%B3%A8 . No new opening hours or live-review copy until independently verified.

## Decisions
- Existing pending quality review issues `BRANCH_ADDRESS_COLLISION`, `NAME_IDENTITY_MISMATCH`, `POSSIBLE_CLOSURE` remain **pending**. We did not mark any business confirmed closed, merge identifiers, or hide restaurants using an automatic review action.
- Four records in `restaurant_external_research` updated with additional source URLs, identity-review flags and timestamp. No public catalog, operating hours, menu prices, rankings or photo changes.
- No reservation display; owner-approved Card v1.0 and Detail v1.0 design unchanged.
- Next research should compare permit management numbers and status dates in authoritative municipal/food safety open data and resolve source identity before publishing current venue metadata.
