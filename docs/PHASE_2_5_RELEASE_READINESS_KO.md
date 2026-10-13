# WhatEatO — Phase 2.5 배포 준비 및 PC·모바일 QA (2026-10-12)

## 출시 상태
- **코드:** PR #6 `feature/i18n-analytics-backend-v1`에 저장, 아직 Draft / 미병합. DESIGN LOCK v1.0 유지.
- **DB:** Neon production migration 004 적용 완료, 10,000 고유 식당 ID 보존. 이 10,000건은 서울 전역이 아니라 **종로구 6,640 / 중구 3,359 / 은평구 1**.
- **실제 신규 검증 콘텐츠:** 메뉴 / 사진 / 생활 태그 / 승인된 독립 별점·소개 아직 0건. 빈 필드를 임의로 채우지 말 것.
- **웹 호스팅:** 가장 최근 확인된 Hostinger 계정 상태는 **Premium Web Hosting**이며, 2026-10 기준 Hostinger 공식 설명에는 Node.js 웹앱 기능이 Business 또는 Cloud 호스팅에서 지원된다고 안내됨. 현재 계정의 실시간 플랜·실제 임시 Next.js 배포는 이 작업에서 확인하지 못함.
- **GitHub Pages** `https://dannywebstudio.github.io/whateato/`는 기존 정적 Preview: **Next.js SSR/API 라이브 배포가 아님**. 운영 DB와 연결된 동적 API가 지원되는 것처럼 표시하거나 QA 통과했다고 주장하지 말 것.

## 수행 완료한 독립 QA
1. PostgreSQL 16 CI 컨테이너에서 migration 003/004 적용 → 합성 식당 4건과 승인/미승인 메뉴·태그·별점·번역·사진 메타데이터 테스트.
2. 실제 빌드된 Next.js 15 서버를 시작하여 `/api/ready`, `/api/v1/restaurants`, `/api/v1/restaurants/[id]`, `/search`, `/restaurant/[id]` HTTP 및 SSR 테스트.
3. **Chromium** 1440×900(PC), 390×844(모바일), 360×740(작은 모바일) QA 추가.
4. 홈 → 검색 → 검증된 카페 필터 → 식당 상세 → 검색 뒤로가기에서 선택 상태 유지, 수평 스크롤 넘침 없음, 검색 결과 2건→1건, 디자인 잠금된 홈/12칩 검증.
5. GitHub Actions `WhatEatO Phase 2 HTTP + mobile QA`가 테스트마다 `phase25-browser-qa` 아티팩트로 이미지 스크린샷 7일 보관.
6. `src/app/globals.css`, `src/app/page.tsx`, `src/components/Header.tsx`, `src/components/SearchBox.tsx`, `preview/*` 등 잠금 파일은 수정 금지; DESIGN LOCK 검사 통과 유지.

## 사전 데이터 품질 검사
- 기존 10,000건은 2026-10-12 LOCALDATA에서 등록 확인된 인허가 DB 복제. 등록 상태상 active가 실제 실시간 영업·방문 가능 여부 보장은 아님.
- 도로명 주소 9,662 / 위경도 9,650 / LOCALDATA 원천 매칭 10,000.
- 인허가 카테고리와 상호명 사이 불일치 의심 사례 존재 (예: '농민 사골 순대국'가 '일식'으로 표기). **이 분류를 데이트/카페/맛집의 검증 태그로 자동 변환하지 말 것**.
- 신규 검증 대기열 `data/enrichment-queue/phase25-first20-20261012.json`: 종로구 10개·중구 10개, 각 5개 업종별 2개 추출. 출처 확인 전까지 `publication_state=hold`. 20개는 **연구 대상**, 새로 퍼블리싱된 식당 20개가 아님.

## 실제 Hostinger Next.js 배포 경로 (현재 차단)
1. hPanel에 **Business/Cloud Node.js Web App 기능**이 활성화되었는지 확인. Premium-only라면 해당 앱을 배포할 수 없음. 실제 과금 변경은 사용자가 직접 결정.
2. 기존 운영 도메인 `WhatEatO.com`과 분리된 **임시 HTTPS preview 도메인**을 신규 생성. 기존 홈페이지/프로젝트를 덮어쓰지 않음.
3. Hostinger Node.js 웹앱에 GitHub 저장소 `dannywebstudio/whateato` 연결, **검증된 feature 브랜치**를 먼저 지정. Node 22 / Next.js 15, build `npm run build`, start `npm run start`.
4. 서버에서만 읽는 `DATABASE_URL`을 WhatEatO Neon 전용 DB 연결로 추가. 인증 관련 `AUTH_*` 설정은 실제 로그인 테스트 전까지 공개하지 않음.
5. `NEXT_PUBLIC_LAUNCH_READY=false`, `NEXT_PUBLIC_SITE_URL=https://<preview-domain>`, `WHATEATO_ANALYTICS_ENABLED=false`. 실사용자에게 noindex 정책 유지.
6. `/api/health` 200 / `/api/ready` 200 + `phase_1_5_schema: ready` / 다국어 목록 및 식당 상세 200 확인.
7. 임시 사이트 전용 검사: `WHATEATO_STAGING_BASE_URL=https://<preview-domain> WHATEATO_STAGING_ACK=PREVIEW_ONLY node scripts/verify_phase25_deployed.mjs`. 스크립트는 공용 최종 도메인·GitHub Pages·localhost에서 실행을 거부.
8. 실제 Preview 배포 후 사용자의 **실제 iPhone**, PC Chromium, 브라우저 네트워크 콘솔·화면 점검을 실시. 합성 CI 화면 테스트만으로 프로덕션 QA를 대체하지 않음.
9. GitHub PR 병합 및 운영 연결은 실제 배포 환경 검증·프로덕션 롤백 경로가 확인된 후 수행. 구글 애드센스 이외 광고·제휴 마케팅 도입 없음.

## 배포 이전에 필요한 추가 운영 설정
- 무작위로 생성한 32자 이상 `WHATEATO_ANALYTICS_ADMIN_TOKEN`은 서버 Secret으로만 설정. `NEXT_PUBLIC_` 사용 금지.
- `WHATEATO_ANALYTICS_ENABLED`는 WAF/rate limit 및 명시적 고지·30일 삭제 실행 QA 전까지 **false**.
- `WHATEATO_ANALYTICS_CLEANUP_ENABLED`와 Neon 전용 GitHub Secrets는 보존 워크플로 검증 후 활성화.
- Google 로그인을 사용하려면 OAuth 리디렉션/비밀 값 설정 및 사용자 리뷰 승인 흐름 별도 검증.
- 운영 도메인 WhatEatO.com은 개발 완료 시까지 연결하지 않음.

참고 공식 Hostinger 문서:
- https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
- https://www.hostinger.com/support/node-js-hosting-options-at-hostinger/
