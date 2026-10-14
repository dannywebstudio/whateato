# WhatEatO 전체 식당 DB Fast Track — 1차 A/B/C 자동 분류 결과

**실행 범위:** Neon **Staging** `br-autumn-pine-b36z3utm`  
**규칙 버전:** `fast-track-v1`  
**스냅샷:** 2026-10-14  
**운영 Neon:** 10,000건, **변경하지 않음**  
**Google API:** 호출 0건 / 기본 OFF

## 분류 및 실행 결과

| 등급 | 건수 | DB 상태 / 다음 단계 |
|---|---:|---|
| A — 검증 완료 | 30 | 이미 출처 메뉴와 4개 언어 콘텐츠 검수, full candidate |
| B — 기본 정보 공개 (지도) | 9,573 | 공공 영업 인허가에 올라온 **상호·주소 중심**, 확인된 추가 정보만 보여줌 |
| B — 기본 정보 공개 (검색만) | 350 | 주소는 있지만 좌표 누락/오류, 지도 핀 불가 |
| C_REVIEW — 격리 및 수동 확인 | 45 | 비음식점/폐업/동일 주소 중복/현재 상호 불일치 **의심** |
| C_CONFIRMED — 삭제 확정 | 0 | 확정된 제3자 또는 공식 증거가 없음 |
| **총계** | **9,998** | 100% 1차 분류, 신규 식당 레코드 삭제 **0건** |

**A/B 노출은 아직 Staging 플래그로 개발 완료된 상태이며, Render 공개 배포는 하지 않았다.**  
현재 9,998개 인허가 레코드는 모두 `business_status='active'`다. `active`는 **과거/인허가 자료 상태일 뿐 오늘 실제 영업 중이라는 보증이 아니다**. 별도 영업시간이 출처·검증된 경우에만 영업시간을 표시한다.

### C가 삭제되지 않은 이유

사용자는 **C로 실제 확인된 음식점은 삭제**해도 된다고 승인했다. 그러나 기존 공식 인허가 기록은 9,998건 전부 영업 중이고, 현재 45건은 *의심 플래그* 수준이다.

따라서 `whateato_c_confirmation_v1`에 **근거 URL + 결정 사유 + 검토자 + 검토 일시**가 명확히 기록된 식당만 `C_CONFIRMED`으로 승격한다. 이후 `sql/staging_fast_track_confirmed_c_safe_delete_v1.sql`을 사용할 수 있다. 이 SQL은 **원본 및 관련 소스·검토 데이터를 아카이브**하고, 게시 메뉴·사진·사용자 리뷰·CMS/분석·300곳 연구 대상 등 다른 의존 데이터가 있으면 강제 삭제하지 않는다. DB FK 제한이 최후의 안전장치다.

**이번엔 확정 C가 0건이라 실제 삭제도 0건이다.** 45건을 C 확정으로 둔갑시키거나 그대로 강제 삭제하지 않았다.

## 사용자가 수동 검토할 목록

### 핵심 파일

- [C 의심/중복/폐업 등 45건만 별도 CSV](../data/FAST_TRACK_C_REVIEW_45_20261014.csv) — **최우선 확인**
- [좌표가 없어 지도 등록 불가능한 B 350건 CSV](../data/FAST_TRACK_B_SEARCH_ONLY_350_20261014.csv)

### 전체 9,998건 (5개 CSV로 분할)

- [01 / 2,000건](../data/FAST_TRACK_ALL_9998_PART_01_20261014.csv)
- [02 / 2,000건](../data/FAST_TRACK_ALL_9998_PART_02_20261014.csv)
- [03 / 2,000건](../data/FAST_TRACK_ALL_9998_PART_03_20261014.csv)
- [04 / 2,000건](../data/FAST_TRACK_ALL_9998_PART_04_20261014.csv)
- [05 / 1,998건](../data/FAST_TRACK_ALL_9998_PART_05_20261014.csv)

각 행은 원본 UUID·상호·구·인허가 업종·주소·좌표·localdata 인허가 소스 ID·등급·노출범위·판정이유·300곳 연구 순위(해당 시)·실제 등록 메뉴 수·공개 언어 개수를 제공한다. 파일들은 UUID 순으로 묶어서 중복·누락되지 않도록 1차 검증했다.

## 1차 분류 알고리즘 (설명)

1. C_REVIEW: 영업 종료 신고가 아닌 외부 폐업 표기, 상호/동일 지점 주소 충돌, 비음식점 이름 의심, 동일 상호·주소로 중복된 행 등을 **격리**. 이름에 "미술관"이나 "사무소"가 있다는 이유만으로 삭제 **금지**.
2. A: 이미 4개 언어의 식당 소개와 근거 메뉴가 공개 검증된 30곳. 관련 미해결 품질 문제가 없어야 함.
3. B: 공공 영업 인허가의 상호와 주소가 있고 미해결 C 증거가 없는 나머지 장소. 좌표가 확인되지 않은 350건은 `basic_search_only`, 나머지는 `basic_map`.
4. 음식점마다 실제 메뉴·가격·사진이 없으면 **그냥 숨긴다**. 임의 메뉴·사진·별점·소개문은 만들지 않는다.
5. 원본 인허가 분류 자체가 대중에게 혼란을 줄 수 있는 `PERMIT_CATEGORY_CONFLICT` 케이스는 정정/검토 완료 전 UI에서 분류 뱃지 숨김. 원본은 유지.

## 기술적 접근

- DB 스키마: `sql/staging_fast_track_9998_schema_v1.sql`
- 전체 분류 및 규칙: `sql/staging_fast_track_9998_classify_v1.sql`
- 읽기 전용 집계 검사: `sql/staging_fast_track_9998_acceptance_v1.sql`
- 검증된 C 전용 보수적 백업/삭제 절차: `sql/staging_fast_track_confirmed_c_safe_delete_v1.sql`
- 서버 필터: `src/lib/triage-ab-gate.ts`, 식당 검색·상세·지도 카탈로그에서 동일하게 적용
- 테스트: `scripts/verify_fast_track_abc_contract.mjs`
- 환경변수 기본 **OFF**: `WHATEATO_TRIAGE_AB_CATALOG_ONLY=false`

**사용자 수동 검토 권장 순서:** (1) C 45건에서 비음식점·폐업 증거가 진짜인지 판단 → 승인된 확정 C만 아카이브 후 삭제, (2) 중복 항목의 고유 영업신고번호/사업장 층·호/시점을 비교한 후 정리, (3) B의 좌표 누락 350건에 검증된 위치 정보 추가, (4) A/B 일반 메뉴·사진을 확보할 때만 선택적으로 보강.

## QA 및 배포 승인

Staging acceptance: `classified=9998`, `source_rows=9998`, `grade_c_review=45`, `grade_c_confirmed=0`, `leaked_c=0`, `bad_map_pin=0`, `missing_permit_identity=0`, **PASS**.

구현된 필터는 안전하게 **기본 OFF**이며 현재 Render 미리보기 코드와 생산 DB에는 아직 통합/배포하지 않았다. 활성화 전에는 Preview 브랜치와 통합한 후 별도 QA(검색/상세/지도/모바일)를 수행하고 사용자 확인을 받는다. 기존 Design Lock 및 Phase 2 HTTP 검사 실패 해결도 필요.
