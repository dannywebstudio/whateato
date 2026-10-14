# WhatEatO — 서울 우선 300곳 Phase 1–3 진행 현황

**기준일:** 2026-10-14 (KST)  
**Neon 대상:** `whateato / staging-phase1-5-20261012` (`br-autumn-pine-b36z3utm`)  
**운영 Neon:** `production` (`br-misty-darkness-b3lr98mz`) — **변경하지 않음**  
**GitHub:** `feature/db-quality-release-v1` → `feature/cms-admin-ui-v1` Draft PR #9  
**사진·별점:** 변경 대상 제외.

## Phase 1. 300곳 후보 선정 / 비음식점 / 상호명

- **300곳 선정:** 종로구 180곳, 중구 120곳. 모두 개별 UUID, 사용 가능한 한글 주소와 지도 좌표가 있음.
- 관광객 중심 지역(광화문, 인사동, 혜화, 서촌, 북촌, 명동, 을지로, 남대문, 동대문) 접근도, 기존 자료 우선, 업종 배분, 동일 상호·동일 주소 중복 제외 규칙으로 결정.
- 9개 업종 버킷별 고정 쿼터로 한식 편중을 완화. **순위는 실측 인기 순위가 아님**.
- `(주)`, `㈜`, `주식회사`, `(유)`, `유한회사` 등 **선행 법인명 접두어만 공개명에서 제거**하는 코드를 Search/Map/Detail에 구현. 원본 `restaurants.name_ko`는 보존.
- Staging의 비음식점 의심 **15건**을 `restaurant_data_quality_reviews`의 `OTHER / pending`으로 분류. 이 행들은 초기 300 후보에서 제외했으며, 원본 삭제·숨김 없음.
- 300 후보 내부 기존 근거 부족·상호 불일치 경고 등 **6곳** 수동 확인 필요. 특히 `호호식당 대학로`는 공식 브랜드의 일본 가정식 분류와 원본 인허가의 한식 분류 불일치 경고를 추가.
- 기존 식당 인허가 업종 `기타`인 300 후보 **15곳**은 원본 분류를 임의 수정하지 않고 매장 정체성 확인 대상으로 유지.
- **300곳 전부 `review_state=pending`; 검증 완료 / 발행 승인 0곳.** 공개 승인은 별도 단계.

## Phase 2. 주소와 실제 지점 메뉴 (사진·별점 제외)

- **주소:** 300/300 확보. 도로명주소 없을 때 사용 가능한 지번주소로 폴백하는 식당 **4곳**.
- **좌표:** 300/300 유효. 원본 좌표를 재추정하거나 변경하지 않음.
- **공개·근거 검증 메뉴:** 3곳(광화문 미진, 청진옥, 우래옥), 총 8개 메뉴. 나머지 **297곳 메뉴 공개 검증 미달**.
- 검증 대기 메뉴 조사 상태: **290곳은 지점별 메뉴 출처부터 필요**, **7곳은 기존 연구/신규 공식 또는 외부 출처 후보 검토 가능**, **3곳은 기존 검증 메뉴 보유**.
- 2026-10-14 신규 Staging 근거 후보 **5개** 작성: `호호식당 대학로` 3개 메뉴(공식 브랜드 메뉴), `온더보더 광화문 D타워점` 2개 메뉴(지점 소개 제3자 출처).
- 이 5개는 `whateato_release_menu_candidate_v1`에 `pending`·`branch_verified=false`·`price_krw=NULL`로 저장했으며 **서비스 공개 메뉴와 무관**. 지점 제공 여부와 한국어 원문/3개 번역 검수 후 승인 필요.
- 출처: 호호식당 `https://hohosikdang.com/%EB%A9%94%EB%89%B4-%EC%86%8C%EA%B0%9C/`, 공식 대학로 지점 안내 `https://hohosikdang.com/%EC%A7%80%EC%A0%90-%EC%86%8C%EA%B0%9C/`, 온더보더 `https://www.diningcode.com/profile.php?rid=rhCqlarHAQHc`.
- 브랜드 공통 메뉴를 특정 지점에서 판매한다고 무단 확정하지 않음. 메뉴 가격·영업시간·리뷰·사진·별점 **추측 입력 금지**.

## Phase 3. 한국어 / 영어 / 일본어 / 중국어(간체)

- 300 × 4 = **1,200개** 식당-언어 레코드 슬롯.
- **공개 검증 완료 12개**(식당 3곳 × 4개 언어).
- **검토 중 24개**(식당 6곳 × 4개 언어).
- **아직 레코드 없는 1,164개**(식당 291곳 × 4개 언어).
- 새 후보 메뉴는 `localized_names` JSON에 4개 언어를 **번역 초안으로** 작성하되 검수 이전 발행하지 않음.
- `whateato_release_cohort_locale_tasks_v1`: 언어별 설명 공개상태, 검증 메뉴 번역 대응 수, 다음 작업을 식당별로 계산.
- 서체/가로 넘침/의미·문장 검수: 실제 공개 대상의 번역이 쌓인 후 1440/390/360px × 4언어 × Home/Search/Map/Detail/Blog QA 필수. **아직 최종 통과 아님**.

## 데이터 품질 스냅샷 (Staging)

| 검증 항목 | 실측 | 게이트 |
|---|---:|---|
| 고유 선정 식당 | 300 | PASS |
| 종로구 / 중구 | 180 / 120 | PASS |
| 주소 누락 | 0 | PASS |
| 좌표 누락 | 0 | PASS |
| 지번주소 폴백 | 4 | 지원 |
| 공개 근거 검증 메뉴가 있는 식당 | 3 / 300 | 미달 |
| 식당 설명 4언어 공개 완료 | 3 / 300 | 미달 |
| 수동 QA·공개 승인 | 0 / 300 | 미달 |
| 최종 배포 승인 `public_release_gate` | **BLOCKED** | 배포 불가 |

독립 재검사: `sql/staging_release_300_acceptance_v1.sql`.

## 배포 안전 스위치

코드에는 `WHATEATO_RELEASE_COHORT_300_ONLY=true` 옵션을 추가. 기본 OFF.
ON 시 Search/Map/Detail은 해당 DB의 선정 테이블, `review_state='approved'`, 지점 검증 메뉴, 4언어 설명 및 모든 검증 메뉴의 4언어 완성 조건을 **모두** 충족하는 장소만 반환.

> **주의:** Production에는 아직 코호트 테이블/뷰를 배포하지 않음. DB migration 및 300곳 검증이 끝나기 전에 해당 스위치를 켜면 안 됨. 현재 300곳 모두 `pending`이므로 Staging에서도 활성화 시 검색 결과가 비어야 정상.

## 재현 가능한 소스

- 선정 SQL: `sql/staging_select_300_cohort_v1.sql`
- 메뉴 후보·다국어 QA 뷰: `sql/staging_release_300_menu_locale_tasks_v1.sql`
- 실측 선정 리스트: `data/release-cohort-300-v1-review.csv`
- 초기 검증 후보 메뉴: `sql/staging_300_menu_candidate_batch_01.sql`
- CI 계약 검증: `scripts/verify_release_300_contract.mjs`
- QA 요약 SQL: `sql/staging_release_300_acceptance_v1.sql`

## 다음 실행 순서

1. 300 후보 수동 신원·영업 여부 확인; 폐업/비음식점/중복은 근거 기록 후 후보 교체. **임의 삭제 금지**.
2. 7곳 기존 근거 후보 재검증 → 290곳 지점별 공식 메뉴 조사 → 300곳 전체 메뉴 검증.
3. 메뉴·식당명·짧은 소개·주소를 4개 언어로 초안 작성/편집 검수 후 발행.
4. 4언어 × 3화면 크기 × Search/Map/Detail/Blog/Home 렌더 및 검색 기능 QA.
5. QA 통과된 300곳 승인 및 `public_release_gate=PASS` 확인 후, 운영 migration·기능 ON·배포를 별도로 승인받아 진행.

**상태:** 후보 선정 및 추적 구조 구축 완료, Phase 1–3 데이터 충전 진행 중. **운영 배포 준비 완료로 보고하지 않는다.**
