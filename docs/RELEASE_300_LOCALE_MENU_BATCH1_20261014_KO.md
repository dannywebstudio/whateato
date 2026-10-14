# WhatEatO — 서울 300곳 번역 및 실제 메뉴 검증 1차 실행 보고서

**실행일:** 2026-10-14  
**Neon:** `br-autumn-pine-b36z3utm` Staging **전용**  
**운영 DB / 사진 / 별점:** 변경 없음  
**작업 브랜치:** `feature/db-quality-release-v1`, Draft PR #9  
**중요:** 이 문서는 완료 보고가 아니라 소스 검증·번역 입력을 시작한 실제 실행 기록.

## 300곳 언어 입력

| 상태 | 식당 수 | ko/en/ja/zh-CN 레코드 |
|---|---:|---:|
| 기존 공개 검증 완료 | 3 | 12 |
| 근거 기반 식당별 설명 편집 검토 중 | 13 | 52 |
| 인허가 원본 및 구 기준 4언어 기본 초안 | 284 | 1,136 |
| **전체** | **300** | **1,200** |

- 최초 빈 `restaurant_localizations` 1,164행을 **draft**로 입력.
- 기존 식당별 조사 `editorial_draft_i18n`를 이용해 **7곳 × 4언어 = 28행**을 기본 초안 → 출처 기반 `review`로 보강.
- 기존 공개 3곳과 별도 검토 중 6곳은 덮어쓰지 않음.
- **284곳은 아직 정식 현지화가 아니다.** 구명은 각 언어로 다듬었지만, 브랜드명은 혼동을 막기 위해 검증 전 한국어 원문을 보존. 설명도 원본 인허가 자료가 말해 주는 사실 이상을 주장하지 않으며 메뉴·현행 영업 여부를 미확인으로 표현.
- `draft`, `review` 행은 서비스 페이지에 자동 공개되지 않는다. 모든 행의 `verified_at`은 임의 입력하지 않음.

## 실제 식당 메뉴 검증 입력

**해당 코호트 중 8곳, 총 21개 공개 근거 대조 메뉴 / 모든 메뉴 ko·en·ja·zh-CN 표시명 4언어 확보.**

| 순위 | 식당 | 근거 메뉴 개수 | 1차 대조 |
|---:|---|---:|---|
| 1 | 광화문 미진 | 3 | 기존 검증, 원본 보존 |
| 2 | 청진옥 | 3 | 기존 검증, 원본 보존 |
| 3 | 우래옥 | 2 | 기존 검증, 원본 보존 |
| 6 | 호호식당 대학로 | 4 | 공식 브랜드 메뉴 + 대학로점 주소가 일치하는 뽈레 메뉴 |
| 7 | 온더보더 광화문 D타워점 | 3 | 종로3길 17 지점의 테이블링·다이닝코드·뽈레 메뉴 |
| 11 | 카페르뷰 | 1 | 퇴계로 282의 당근 동네업체·다이닝코드 일치 |
| 14 | 영덕막회 | 3 | 을지로3길 33의 테이블링·뽈레 메뉴 일치 |
| 16 | 소수헌 | 2 | 만리재로21길 8의 테이블링·뽈레 메뉴 일치 |

- 기존 **13개 draft 메뉴**에 영어·일본어·간체중국어 명칭 **39개** 추가.
- 독립 출처가 지점과 메뉴 모두 일치하는 신규 등록/승격 항목만 `restaurant_menus.publication_state='published'`로 적용.
- 실제 메뉴 항목을 증명하는 URL을 `evidence_ref`에 저장. **이번에 추가한 메뉴 가격은 NULL**, 사진·별점 데이터 미변경.
- 현재 확인 수준은 **식당/지점 주소가 일치하는 최근 공개 목록의 교차 검증**이지, 방문 또는 사업주가 오늘 제공을 확약한 메뉴는 아님. 원본 자료 갱신시 재확인 필요.
- 기타 후보 메뉴는 `draft` 또는 `whateato_release_menu_candidate_v1`에 남겨 근거 없이 공개하지 않음.

### 신규/재검증 메뉴 및 근거

**호호식당 대학로:** 로스가츠정식·가츠나베정식·사케동·오므라이스  
공식 브랜드 메뉴 `https://hohosikdang.com/%EB%A9%94%EB%89%B4-%EC%86%8C%EA%B0%9C/`  
공식 지점 `https://hohosikdang.com/%EC%A7%80%EC%A0%90-%EC%86%8C%EA%B0%9C/`  
동일 지점 `https://polle.com/place/3hH2R0/%ED%98%B8%ED%98%B8%EC%8B%9D%EB%8B%B9`

**온더보더 광화문 D타워:** 풀드포크 타코·콰트로 화이타·더블스텍클럽 퀘사디아  
`https://www.tabling.co.kr/place/677ccac066de5f06987be562`  
`https://www.diningcode.com/profile.php?rid=rhCqlarHAQHc`  
`https://polle.com/place/40IXKT/%EC%98%A8%EB%8D%94%EB%B3%B4%EB%8D%94`

**카페르뷰:** 아메리카노  
`https://www.daangn.com/kr/local-profile/%EC%B9%B4%ED%8E%98%EB%A5%B4%EB%B7%B0-w99efytsdisy/`  
`https://www.diningcode.com/profile.php?rid=o1lZedCMqair`

**영덕막회:** 물회·회덮밥·고등어초절임  
`https://www.tabling.co.kr/place/677cccf366de5f069880117d`  
`https://polle.com/place/23aK92/%EC%98%81%EB%8D%95%EB%A7%89%ED%9A%8C`

**소수헌:** 런치 오마카세·디너 오마카세  
`https://www.tabling.co.kr/place/677cd68866de5f069891271a`  
`https://polle.com/place/383gF3/%EC%86%8C%EC%88%98%ED%97%8C`

## QA 결과 · 2026-10-14

- 코호트 후보 정확히 **300곳**, 종로 180 / 중구 120, 주소 누락 0 / 좌표 누락 0.
- 300×4 언어 슬롯 **1,200/1,200 존재**하지만, **게시 완료는 3곳 / 12개 레코드에 불과**. 대부분은 미검수 초안.
- 출처 기재 공개 메뉴 **8곳 / 21개**.
- 공개 근거 메뉴에서 4언어 이름이 누락된 메뉴: **0개**.
- 신규 메뉴의 가격은 임의로 입력하지 않음(기존 검증 메뉴 가격은 유지).
- 300곳 검토 승인: **0곳**.
- **공개 배포 Gate: BLOCKED**. 운영 DB와 Render 미리보기는 변경하지 않음.

## 남은 작업

1. 기초 번역 초안 284곳의 **현지화 상호명/실제 식당 소개**를 독립 출처 조사 후 식당별 검수.
2. 메뉴 근거가 아직 없는 292곳의 지점별 메뉴 실사/공식자료 대조 → 4개 언어 등록.
3. 계열점/동일명 식당 혼동, 임시휴업·폐점, 분류 오류 등 신원 확인.
4. 4개 언어로 Home/Search/Map/Detail/Blog 1440px·390px·360px 시각/검색 QA.
5. 승인된 300곳만 최종 공개하는 별도 운영 DB 마이그레이션 및 배포 승인.

재현용 Staging SQL: `sql/staging_release_300_locale_draft_batch_01.sql`, `sql/staging_release_300_locale_research_draft_02.sql`, `sql/staging_release_300_menu_translation_batch_02.sql`, `sql/staging_release_300_verified_*sql`  
최신 300곳 목록: `data/release-cohort-300-v1-review.csv`.
