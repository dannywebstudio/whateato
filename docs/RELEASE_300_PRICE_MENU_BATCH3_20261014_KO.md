# WhatEatO 서울 핵심 300곳 — 가격 추가·메뉴·번역 후속 배치 (2026-10-14)

**Neon 환경:** Staging `br-autumn-pine-b36z3utm` ONLY  
**원본 운영 DB:** `br-misty-darkness-b3lr98mz` 10,000건 그대로, 사진/별점 미변경  
**GitHub:** `feature/db-quality-release-v1` (Draft PR #9)  
**가격 정책:** 과거 또는 관측일 기준 공개 가격이라도 메뉴·주소·출처가 일치하면 참고가격으로 입력. 매장 실시간 가격·당일 판매 여부를 보증하지 않음. `price_verified_at`는 사업주 현행가격 확인 시에만 사용.

## 최종 Staging 스냅샷

| 항목 | 결과 |
|---|---:|
| 후보 | 300곳 |
| 출처대조 메뉴가 있는 식당 | **27곳** |
| 출처대조 발행 메뉴 | **89개** |
| 가격 입력된 발행 메뉴 | **86개** |
| 가격 없는 메뉴 | **3개** |
| 확인된 메뉴의 4언어 레이블 누락 | **0개** |
| 발행 메뉴 출처 누락 | **0개** |
| 4개 언어 장소 소개 모두 공개 | **9곳** |
| 승인된 Staging 출시 후보 | **9곳** |
| Identity/폐점으로 보류 | **2곳** |
| 실제 운영 배포 | **미실행** |

## 가격 관측 시스템

`whateato_menu_price_observations_v1`을 Staging에 구성하여 메뉴 UUID, 공개된 가격(KRW), 공개 자료 URL, 조회일(2026-10-14), 설명을 별도 보존한다. 동일 메뉴에 상충되는 공개가격이 있으면 **삭제하지 않고 대안 관측도 보존**한다. 현재 관측행 83개(중복 메뉴의 복수 관측 포함)이며 이전부터 존재한 8개 가격은 원본 증거를 보존한다.

가격은 실시간 보장 값이 아니라 조회된 공개정보이므로 매장 현장 확인과 명확히 구분한다.

## 이번에 새로 처리한 식당과 확인된 지점

| 선정 순번 | 식당 | 공개 근거 메뉴 | 가격 출처·상태 |
|---:|---|---:|---|
| 24 | 남대문막내횟집 광교점 | 점심특선 회정식/회덮밥/알밥 | 테이블링·뽈레, 14,000/9,000/9,000 |
| 29 | 백부장집 닭한마리 | 닭한마리(2인), 감자사리, 떡사리 | 테이블링·뽈레, 28,000/3,000/2,000. 인허가 업종 불일치로 승인 보류 |
| 31 | 역전할머니맥주 종로3가점 | 치즈라볶이·짜빠구리 등 4개 | 폴레·브랜드·다이닝코드. 업종 불일치로 승인 보류 |
| 39 | 금문 | A/B/C코스·전가복·냉채·탕수육 | 관광공사 및 테이블링·뽈레, 6개 가격 반영, Staging 승인 |
| 51 | 가봉루 | 잡탕밥·유산슬밥·소고기덮밥·잡채밥 | 지점 자료 대조, Staging 승인 |
| 62 | 명가양갈비 | 양갈비·프렌치랙·양갈비살·마라샹궈 | 뽈레·테이블링, 32k/35k/22k/32k, Staging 승인 |
| 63 | 인사동6842 고기밥상 | 돼지불고기·제육·소불고기·돼지갈비·소갈비 정식 | 테이블링·다이닝코드, 12k/12k/14k/16k/21k, Staging 승인 |
| 82 | 북촌무궁화 | 순대국밥·얼큰·모둠·매운곱창 | 당근 동네업체·뽈레·테이블링, Staging 승인 |
| 87 | 단막 종각직영점 | 단지 화덕 막창 계열 4개 | 뽈레·다이닝코드, 검토 유지 |

**관련 공식/현장 출처**:
- 금문 https://www.nculture.org/cul/localCultureDetail.do?contentType=G&targetId=2789192 · https://www.tabling.co.kr/place/677cc7a066de5f069875108d · https://polle.com/place/3q54pr/%EA%B8%88%EB%AC%B8
- 명가양갈비 https://www.tabling.co.kr/place/677cd7f366de5f069893a469 · https://polle.com/place/3CUtrl/%EB%AA%85%EA%B0%80%20%EC%96%91%EA%B0%88%EB%B9%84
- 인사동6842 https://www.tabling.co.kr/place/677ccc5366de5f06987ee1d8 · https://www.diningcode.com/profile.php?rid=TIgoMzL4orKE
- 백부장집 https://www.tabling.co.kr/place/677cc7a066de5f0698751078 · https://polle.com/place/11z1jG/%EB%B0%B1%EB%B6%80%EC%9E%A5%EC%A7%91%20%EB%8B%AD%ED%95%9C%EB%A7%88%EB%A6%AC
- 북촌무궁화 https://www.daangn.com/kr/local-profile/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94-rzgy94cdxdxh/ · https://polle.com/place/3FfkFN/%EB%B6%81%EC%B4%8C%EB%AC%B4%EA%B6%81%ED%99%94

## 신원·폐업·메뉴 충돌 보호

- `원조함흥냉면본관` 종로 창경궁로13길16: 과거 폐점 자료 → `hold`. 재개점 확인 전 후보 승인 금지.
- `도산가든` 종로 삼일대로17길19: 등록 장소와 온라인 공개 상호 불일치 → `hold`.
- `시조명동진성닭칼국수` 종로40가길10: 현재 유통 상호 다른지 확인 필요 → 메뉴 3개 재검토 `draft`로 내려놓음.
- `백부장집`: 인허가 '중국식', 공개 음식은 닭한마리 → `PERMIT_CATEGORY_CONFLICT` 미해결. 등록 메뉴는 출처와 함께 보관, 장소 승인 대기.
- `명가양갈비` 첫 메뉴 4개 등록 시 다른 메뉴 UUID와 충돌을 검출, `ON CONFLICT DO NOTHING`으로 원본 보존되었음을 확인. 충돌하지 않는 새로운 4개 메뉴 UUID로 복구하고 각 식당별 정확한 외래키와 다국어/가격 확인 후 승인함.
- 위 2곳의 보류는 식당 원본 자체를 지우거나 평점을 변경하지 않음.

## 승인된 Staging 후보 9곳

광화문 미진, 청진옥, 우래옥, 남대문막내횟집, 금문, 가봉루, 명가양갈비, 인사동6842 고기밥상, 북촌무궁화.

**승인(approved)은 Staging 후보 품질 스위치 기준만 의미한다.** 사용자에게 당일 메뉴가 제공된다는 보증이나 운영 DB 배포가 아니다. `WHATEATO_RELEASE_COHORT_300_ONLY` 기본값 OFF. ON 시에는 Staging/이행 대상 DB에 테이블/뷰가 모두 존재해야 한다.

## 다음 작업 대기열

`whateato_release_300_work_queue_v1` (read-only 뷰) / `data/release-cohort-300-v1-work-queue.csv` (실측 스냅샷)

- 지점별 메뉴 출처부터 조사: **264곳**
- 공개 메뉴는 있지만 소개문 4언어 검수 필요: **14곳**
- 지점·업종·이름/자료 충돌 확인: **11곳**
- 폐점 또는 정체성 문제로 보류: **2곳**
- Staging 출시후보 게이트 충족: **9곳**

전체 300곳에 언어 레코드는 존재하지만, 아직 **264곳은 공개 검증된 메뉴가 하나도 없으며 4개 언어 편집 승인 역시 완료되지 않았다.**

### 재현 자료

- `sql/staging_release_300_menu_prices_observed_batch_12.sql` — 가격 관측 테이블 + 첫 가격
- `sql/staging_release_300_new_venues_menu_prices_batch_13.sql`
- `sql/staging_release_300_branch_prices_batch_15.sql`
- `sql/staging_release_300_identity_holds_batch_16.sql`
- `sql/staging_release_300_verified_public_candidates_18.sql`
- `sql/staging_release_300_gummun_menu_prices_batch_19.sql`
- `sql/staging_release_300_gummun_localization_review_20.sql`
- `sql/staging_release_300_baekbujang_bukchon_menu_batch_21.sql`
- `sql/staging_release_300_baekbujang_bukchon_locales_batch_22.sql`
- `sql/staging_release_300_lamb_insadong_menu_batch_23.sql`
- `sql/staging_release_300_lamb_insadong_locales_batch_24.sql`
- `sql/staging_release_300_lamb_uuid_collision_fix_25.sql`
- `sql/staging_release_300_work_queue_v1.sql`

**2026-10-14 단계 종료 조건:** Staging 9/300 vetted, menu 27/300 venues, 89 dishes, prices 86/89, all menu translations 4/4 per published menu. **공개 300곳 전체 출시 gate는 BLOCKED이며 배포 금지.** 
