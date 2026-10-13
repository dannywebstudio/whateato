# WhatEatO — Phase 2 검색·식당 상세 페이지 백엔드 연동 (2026-10-12)

## 원칙
- **디자인 잠금 v1.0 유지**: 잠긴 Home/Header/SearchBox/CSS/Preview 파일을 일절 변경하지 않음.
- 기존 검색 결과 카드의 `result`, 검색 폼의 `search-form`/`searchfield`/`chips` 클래스를 그대로 사용. 새 테마·색상·이미지 레이아웃 도입 없음.
- 출처·검증·권리 확인이 없는 별점·메뉴·태그·식당 소개·사진은 공개하지 않음.
- `restaurant_editorial_scores`의 승인 점수와 `whateato_user_reviews`의 승인된 유저 별점을 구분. 외부 플랫폼 평점으로 가장하지 않음.

## 실제 코드 반영
1. 공통 서버 카탈로그 `src/lib/restaurant-catalog.ts`에 다국어 목록·상세 SQL 통합.
   - `ko` · `en` · `ja` · `zh-CN`, 번역 미승인 시 한국어 원문으로 fallback.
   - `q` 이름/주소/지역/공개된 메뉴 검색, `region` 지역 필터, `f` **검증된** 다중 태그 AND 필터.
   - 정렬 및 `limit+1` 방식 다음 페이지 판정.
   - 카드: 식당 이름, 주소, 검증된 대표 메뉴·짧은 소개·태그·독립 점수·허가된 사진 **메타데이터**.
   - 상세: 허가된 메뉴/가격, 검증 태그, 소개, 별점, 기본 위치정보, 기존 리뷰 흐름 연결.
2. 기존 `GET /api/v1/restaurants` 및 `GET /api/v1/restaurants/:id`를 공통 서버 모듈에 연결. HTTP 응답 계약 유지.
3. `/search`와 `/restaurant/[id]`가 백엔드를 직접 조회하여 SSR 표시.
4. `src/components/SearchBoxSynced.tsx`: 디자인 잠금된 `SearchBox`를 수정하지 않고 검색 결과 페이지만 같은 DOM/CSS 형태의 폼으로 연결.
   - 선택된 태그 필터는 URL 변경/페이지 이동에도 유지.
   - 4개 언어의 12개 필터 이름과 검색 플레이스홀더 제공.
   - 쿼리/지역/선택 필터를 URL로 보존, 서버에서 검증.
5. `src/lib/platform-v1.ts`의 다섯 그룹 UUID 검사 오류 수정. 유효한 레스토랑 상세 경로가 기존에는 400으로 거부되는 문제.
6. `scripts/seed_phase2_smoke.mjs`: 실제 운영 데이터와 분리된 로컬 PostgreSQL에만 허용되는 **합성 CI 전용** 데이터 생성.
7. `scripts/test_phase2_http.mjs`와 `.github/workflows/phase2-http-smoke.yml`:
   - PostgreSQL 서비스 컨테이너에서 실제 003/004 스키마 적용.
   - Next.js를 실제 빌드·실행하여 HTTP 및 서버 렌더링 E2E 검사.
   - 페이지네이션 종료, 이름/일본어 fallback, 검증 태그, 지역 검색, 상세 URL, 가격 검증, 미승인 번역/사진/평점 비노출, 분석 옵트인 잠금 테스트.
8. 모든 검증 데이터는 CI 임시 컨테이너에서만 생성하며, production/staging Neon의 실제 식당 행은 변경하지 않음.

## 운영 DB와 실제 콘텐츠 상황
- Neon 운영 DB: 서울 지역 약 10,000개 식당; migration 004 완료 및 데이터 무결성 검증 통과.
- 실제 운영 DB의 신규 콘텐츠: 공개 승인된 식당 소개·사진·검증 태그·독립 별점·메뉴는 **아직 0건**.
- 테스트용 `Sunny Table`, `4.5`, 사진 메타데이터 등은 **가짜 CI 픽스처**일 뿐, 운영 DB에 추가하지 않음.
- 식당 이미지 전달용 스토리지/공개 URL이 아직 활성화되지 않았으므로, 사진은 메타데이터만 반환하고 UI에 이미지를 그리지 않음. 외부 사이트 이미지 핫링크/무단 복제 금지.

## 배포 / 다음 출시 조건
- PR #6은 Draft. GitHub 코드가 최신이어도 운영 Next.js/Hostinger에 아직 반영한 것은 아님.
- 작업 브랜치 CI에서 typecheck/build, Design Lock, HTTP smoke 3개 체크 통과 필요.
- 실제 사이트의 화면별 모바일·데스크톱 브라우저 및 성능 QA는 운영/스테이징 배포 후 별도 검증.
- 일일 분석 데이터 보존 작업·프록시 abuse/rate-limit 정책 검증 전에는 `WHATEATO_ANALYTICS_ENABLED=false` 유지.
- **콘텐츠 확보 다음 단계**: 출처 확인이 가능한 첫 샘플 10~20개 식당의 메뉴, 소개, 태그, 사진 사용 권한 및 편집 점수를 관리자가 검토해 공개. 사진 전달 파이프라인 도입 후 실제 이미지 표시.
- 기존 LOCK된 Home 및 전체 디자인에 대한 시각적 변경은 별도의 사용자 승인 없이는 불가.
