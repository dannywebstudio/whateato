# WhatEatO Phase 3.5 — 리뷰 수동 승인·거절 및 감사 이력

2026-10-13 · Draft PR #6 · GitHub feature branch, 미배포.

## 실제 구현

1. 비파괴 스키마 `db/migrations/007_review_moderation_audit.sql`
   - 리뷰 ID, 승인/거절 결과, 사유 코드, 결정 시각만 저장.
   - Google 사용자 식별자, 이메일, 리뷰 본문, 관리자 토큰을 **감사 테이블에 저장하지 않음**.
   - 계정/리뷰가 삭제되면 이 리뷰에 연결된 감사 정보도 cascade 삭제.
2. `GET /api/v1/admin/reviews?limit=20&offset=0`
   - 관리자 Bearer 토큰 인증 시 **미승인 pending 리뷰** 목록을 확인.
   - 응답은 리뷰 ID·식당 ID/이름·점수·본문·작성/수정 시각만 포함, 회원 계정 ID·Google subject 불포함.
   - `no-store, private` 반환, 페이지 크기 최대 50, offset 최대 1000.
3. `PATCH /api/v1/admin/reviews/{reviewId}`
   - JSON `{"decision":"approve"}` → `published`.
   - JSON `{"decision":"reject","reason_code":"spam"}` → `rejected`.
   - 사유 코드: spam / abusive / personal_data / off_topic / unverifiable_claim / other.
   - **pending만 수동 결정 가능**하고 승인/거절·감사 이력을 PostgreSQL 단일 CTE 문으로 원자적 기록.
   - 이미 결정된 리뷰는 409 응답. 폐업/사이트 비공개 식당의 리뷰 승인 불가; 거절은 가능.
   - 관리자 외 브라우저 Origin 거부, JSON 페이로드 상한, 악의적 필드 거부, UUID 및 Bearer 토큰 확인.
4. 인증·활성화
   - 서버 환경변수 `WHATEATO_REVIEW_MODERATION_ENABLED=true` 및 `WHATEATO_REVIEW_ADMIN_TOKEN` (32자 이상) 둘 다 없으면 503. **기본값은 기능 비활성**.
   - 관리자 토큰은 Analytics용 토큰과 분리. `NEXT_PUBLIC_`/프론트엔드/로컬스토리지에 절대 넣지 않음.
   - 스테이징/운영마다 별도 랜덤 비밀키 및 HTTPS, 접근 IP 제한·WAF 속도 제한 필요.
   - 단순 공유 Bearer 방식이므로 개별 담당자별 검토 책임을 추적할 수 없다. 운영 전에 개인별 운영자 계정/로그 통합을 검토할 것.

## 테스트
- `scripts/test_review_moderation_http.mjs`는 **로컬 Postgres 합성 데이터에서만 동작**.
- 1개 기존 미승인 리뷰 거절, 별개 식당에 넣은 3개 미승인 리뷰 승인.
- 미승인 리뷰 비공개, 승인된 리뷰 3개만 평균 계산, 거절 후 재승인 차단, 중복 승인 감사 데이터 차단.
- 토큰 미제공/오류, 외부 Origin, 잘못된 사유, 예상 외 JSON 필드, 잘못된 UUID, 비정상 페이지 크기 차단.
- CI의 가짜 토큰은 코드에서만 보이는 시험 상수이므로 절대 실제 서비스에 사용하면 안 됨.
- 기존 데스크톱/모바일 Chromium/검색/SEO/지도/사진/Design Lock QA를 **모두 통과한 이후** 리뷰 상태 변경 시험을 실행.

## 실행 확인 및 제한
- GitHub CI: `WhatEatO web CI`, `WhatEatO Phase 2 HTTP + mobile QA`, `WhatEatO Design Lock`가 모두 녹색인 최종 커밋만 배포 검토 가능.
- 실제 운영 리뷰 승인/거절 **0회**: 해당 엔드포인트는 공개 배포 전이므로 실제 사용자 리뷰가 변경되지 않음.
- 관리자용 **대시보드 화면**은 아직 구현 전. 지금은 토큰 보호 API와 자동 테스트만 존재.
- 구글 실제 로그인, 관리자의 본인 확인, 실계정 사용자 리뷰의 개인정보·법적 QA는 서버 배포 후 별도 수행.
- DESIGN LOCK v1.0 파일 및 운영 Neon branch, `main`, 실제 Hostinger 배포는 변경하지 않음.
