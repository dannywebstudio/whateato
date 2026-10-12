# WhatEatO — 자체 리뷰 + Google 로그인 최소 수집 v1

## 제품 원칙
- WhatEatO Design Lock v1.0 유지. 기존 Header, Home, Map, Search, Blog CSS/레이아웃 수정 없음.
- Google OAuth 범위는 openid email (profile 범위는 요청하지 않음).
- 로그인 과정에서 이메일 인증 여부를 확인하되 **DB에 이메일 주소/이름/사진 저장 금지**.
- DB에는 Google 안정 식별자 sub 와 앱 내부 UUID, 계정 생성 시각만 기록.
- 세션 쿠키에는 WhatEatO 내부 UUID만 넣고 외부 프로필 데이터는 제거. Session maxAge 7일.
- Google Drive/Contacts/Calendar, 위치, 전화번호, 생년월일 접근 없음.
- 자체 리뷰: 식당 1곳당 1개/계정; 수정 시 상태 pending으로 환원. 공개 전 수동 moderation.
- 리뷰 작성 화면에는 30~1500자 및 별점 1~5. 정보는 작성자가 자발적으로 제공.
- 리뷰는 가입자 실명·이메일을 표시하지 않으며 실제 방문 증명이 없으므로 '방문 확인' 딱지 금지.
- 후기는 익명 표기로 노출하되 완전한 익명은 아님: 서비스 DB에는 계정 연결이 존재.
- 자동 점수 요약은 승인된 자체 리뷰 3건 이상에서만 표기.
- 리뷰 원문을 외부 플랫폼에서 크롤링하여 복제하거나 AI로 바꿔쓰는 방식 금지.

## DB migration (승인된 WhatEatO 전용 Neon 프로젝트)
db/migrations/003_reviews_auth_minimal.sql 적용. 기존 restaurants를 수정하지 않는 추가 테이블 CREATE만 포함.
- whateato_review_accounts
- whateato_user_reviews
- whateato_review_licenses
- whateato_licensed_review_signals

## Google Cloud Console 설정
1. Google Cloud Console > Google Auth Platform > Clients, 새 OAuth client 만들기: Web application.
2. 승인된 JavaScript origins: 실제 운영 Node.js 홈페이지 도메인 HTTPS origin.
3. 승인된 Redirect URI: https://YOUR-NEXTJS-DOMAIN/api/auth/callback/google
4. Branding / Audience / 데이터 처리 목적 / 개인정보 처리방침 URL 설정. 공개 전에 실제 사업자·문의처·위탁·보존 정책을 정식 확정.
5. **Next.js 서버(HOSTINGER 등)의 비공개 Secrets에만** DATABASE_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET 설정.
6. 리버스 프록시 Host 검증이 필요할 경우 신뢰 가능한 배포 환경에서만 AUTH_TRUST_HOST=true 설정.
7. 로그인 진입 경로: /account. OAuth 콜백은 /api/auth/callback/google.
8. 로그인/로그아웃, POST /api/restaurants/{UUID}/reviews (pending), DELETE, GET, 계정 삭제 QA를 실제 HTTPS 주소에서 확인.

## 배포 구분
- GitHub Pages 정적 미리보기 https://dannywebstudio.github.io/whateato/ 에는 서버 세션/Google OAuth/리뷰 POST 불가능.
- 오직 HTTPS 기반 Node.js Next.js 서버에서만 로그인 및 리뷰 제출 가능.
- 공개 미리보기에서 가짜 로그인 또는 성공 메시지 표시 금지.
- OAuth Client Secret, Neon DB URL, Auth Secret을 GitHub 공개 파일·NEXT_PUBLIC_*에 절대 입력하지 말 것.

## 리뷰 moderation 운영 (관리자 오프라인)
- 리뷰 접수는 pending, 즉 공개되지 않음.
- 사람이 원문, 개인정보, 타인 명예훼손, 스팸/조작, 일방적 평가 여부를 검토.
- 승인 예: UPDATE whateato_user_reviews SET moderation_status='published',reviewed_at=now() WHERE id='<정확한 UUID>' AND moderation_status='pending';
- 반려: moderation_status='rejected'. 전부 자동 승인하지 않음.
- 사용자는 수정 시 pending 재검토. 사용자 삭제는 실제 DB DELETE로 처리.
- 계정 삭제는 CASCADE로 본인이 작성한 리뷰까지 삭제.
- abuse rate limit / 관리자 신고 기능 / 이용약관 / 개인정보 처리방침 / 연령정책 / 이용자 동의·고지 / 로그 보존범위는 실제 공개 전에 별도 보안 QA 필수.

## 외부 이용허락 리뷰
- 라이선스 공급처 계약/동의 문서, 사용 범위, 기간, 집계 허용 여부 기록.
- 신호는 원문/사진 대신 service_negative, service_positive, food_negative, food_positive 등 분류값만 저장.
- **라이선스 승인 + 집계 허용 + 만료 전 + 서로 다른 3건 이상의 신호** 충족 시에만 외부 참고 통계 표시.
- 네이버/구글 리뷰를 계약 없이 스크래핑·저장하는 작업은 절대 포함하지 않음.
- 외부 공급처 승인 전에는 결과가 비어 있어야 정상.
- 하나의 의견을 확정적 사실이나 식당의 본질적 평가로 단정하는 문구 금지.

## 보안/프라이버시 출고 체크
- Google OAuth OIDC 검증, nonce/state/PKCE 처리는 Auth.js.
- CSRF: Auth.js sign-in server actions + 리뷰 API same-origin POST/DELETE 및 JSON content-type 강제.
- 모든 리뷰 SQL 파라미터 바인딩, UUID 검증, 서버 세션 기반 권한 확인.
- 사용자 본인 리뷰만 수정/삭제 가능, 외부 API에 admin/write license endpoint 없음.
- 모니터링에서 IP/이메일/Google token 노출 금지.
- GitHub design-lock workflow PASS가 필수.
- 현재 상태는 **기능 구현/검증 단계**. Google Cloud OAuth 클라이언트, 서버 환경변수, migration 및 실제 가입 QA 이전에는 운영 준비 완료라고 선언 금지.
