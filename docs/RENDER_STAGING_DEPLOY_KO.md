# WhatEatO — Render 무료 테스트 서버 배포 가이드

2026-10-13 / 대상: **실제 Next.js SSR + Neon 스테이징 DB 테스트**, NOT production.

## 준비 상태
- GitHub 개발 브랜치: `feature/i18n-analytics-backend-v1`, Draft PR #6, 기존 main/Hostinger/운영 DB에 영향 없음.
- Render 무료 Web Service용 `render.yaml` 준비됨. 새 서비스 이름 `whateato-staging`, Node 22, Singapore, 실시간 SSR.
- 아직 Render API/ChatGPT 플러그인 호출 없이 실제 서비스가 생성된 것은 **아님**. Blueprint config commit은 배포가 아니다.
- 기존 Next.js API가 요구하는 quality schema 008은 **Neon STAGING에만** 적용됨. 운영 DB와 혼동하면 503 오류.
- Render 무료 플랜의 자동 휴면/임시 파일 삭제를 감안해 실사용자의 리뷰/이미지 업로드는 처음부터 활성화하지 않음.

## Render Blueprint 생성 (연결된 계정 권한 필요)
1. Render Dashboard https://dashboard.render.com/ 접속, New → Blueprint.
2. 저장소 `dannywebstudio/whateato` 접근 허용, **Blueprint branch** = `feature/i18n-analytics-backend-v1`.
3. Repo root의 `render.yaml`로 `whateato-staging`만 생성. 요금제 **Free**인지 확인. Render Postgres 같은 추가 데이터베이스 **생성하지 않음**.
4. Blueprint의 `DATABASE_URL`은 Render Secrets/Environment에만 입력. **Neon staging branch `br-autumn-pine-b36z3utm`의 연결문자열**을 사용. 운영 `br-misty-darkness-b3lr98mz` 연결문자열 사용 금지. 비밀번호는 채팅·GitHub·커밋에 붙여 넣지 말 것.
5. Render가 임시 `.onrender.com` URL을 할당하면 환경변수 `NEXT_PUBLIC_SITE_URL`에 **실제로 할당된 HTTPS URL** 입력한 다음 리빌드/재배포. 예시 URL을 실제 링크로 추정해 쓰지 말 것.
6. `NEXT_PUBLIC_LAUNCH_READY=false`, `WHATEATO_ANALYTICS_ENABLED=false`, `WHATEATO_REVIEW_MODERATION_ENABLED=false` 유지. Google OIDC secrets를 연결하지 않은 상태에서는 로그인/리뷰 제출 실사용 테스트 하지 않음.
7. Render 자동 배포는 `off`. 검증한 브랜치 커밋을 수동 Deploy할 것. 상용 도메인/DNS/Hostinger 계정 변경 없음.

## 테스트
- `https://<실제로-할당된-URL>/api/health`: HTTP 200
- `/api/ready`: HTTP 200, `ready=true`, `phase_1_5_schema=ready`, `catalog_quality_schema=ready`, `review_moderation_schema=disabled`, `analytics_collection_enabled=false`
- `/api/v1/restaurants?hl=ko&limit=2`: 승인된 공개 인허가 레코드 결과, DB 조회 에러가 없어야 함
- `/search?q=광화문&hl=ko`: Next.js SSR 검색 결과
- `/api/v1/map/markers?bbox=37.56,126.96,37.60,127.02`: 식당 좌표 목록 (타일 지도 UI는 MapTiler 키 없을 시 비활성 상태가 정상)
- `node scripts/verify_phase25_deployed.mjs`를 실행하기 전 `WHATEATO_STAGING_BASE_URL`에 *실제* URL, `WHATEATO_STAGING_ACK=PREVIEW_ONLY` 제공. 이 검사는 식당 데이터를 수정하지 않음.
- Playwright PC/모바일 자동 검증은 GitHub Actions의 합성 PostgreSQL fixture로 먼저 시행, 실제 Render 링크에서 별도 시각/기능 QA 수행.

## 사진
- 실제 승인된 식당 사진 수는 현재 0건. **서버 배포가 사진 확보 또는 사용권 승인을 대체하지 않음**.
- 현재 사진 API는 `WHATEATO_MEDIA_ROOT` 절대 경로의 서버 로컬 사진 파일만 지원. Render Free 로컬 저장소는 영구 저장되지 않으므로 **이미지 실제 공개 전 외부 오브젝트 스토리지와 검증 파이프라인을 따로 연결**해야 함.
- 가짜 음식점 사진·임의 점수·데이터 자동 생성 금지.

## 전환 및 롤백
- Render는 개발용 테스트 서버. Hostinger Business로 이동 시 **동일한 GitHub 코드**, DB 연결정보, 환경변수, HTTPS/OAuth 도메인 설정을 복사/수정하고 독립 QA 후 DNS를 전환.
- 현재 `main`으로 병합하지 않음. Neon production schema에 008이 미적용이므로 feature 코드와 운영 DB를 바로 묶어 배포하지 말 것.
- 테스트 서버 오류 시 Render에서 서비스 중지/이전 Deploy로 롤백 가능. 기존 GitHub Pages는 변경하지 않음.
