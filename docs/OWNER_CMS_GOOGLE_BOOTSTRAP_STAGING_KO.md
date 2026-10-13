# WhatEatO CMS 프리뷰 — Google 로그인 활성화 체크리스트 (2026-10-14)

이 가이드는 **프리뷰만** 대상으로 한다. 실제 운영 홈페이지 / 데이터베이스는 변경하지 않는다.

## 현재까지 설정된 부분
- 관리자 코드: `feature/cms-admin-ui-v1` / Draft PR #8
- Render FREE 프리뷰: https://whateato-cms-preview.onrender.com/admin
- Neon 프로젝트 `whateato`, **staging branch** `br-autumn-pine-b36z3utm`.
- 마이그레이션 014(배치 CMS), 015(관리자 권한과 이미지 메타데이터)는 스테이징에만 적용됐다.
- Neon **private** object bucket `whateato-cms-preview-media` 생성.
- 버킷의 **스테이징 브랜치 전용** storage:read/storage:write 자격증명은 Render 프리뷰의 비밀 환경변수로만 보관. 소스코드에는 없음. 최종 검증은 서버 시작 시 `CMS_STORAGE_PREFLIGHT: reachable` 로그로 판정.
- `AUTH_SECRET`, 대량 배치 API 토큰, 리뷰 검수 API 토큰, `AUTH_URL`, `AUTH_TRUST_HOST` 사전 등록. 실제 값은 어디에도 복사하거나 공개하지 않는다.
- 활성화 스위치(OWNER/BULK/MODERATION)는 기본 OFF. 로그인할 Google OAuth 자격증명과 실제 owner 이메일은 아직 설치하지 않았다.

## 관리자 소유자(Owner) 로그인 설정 — 사용자 화면에서 직접 실행
1. Google Cloud Console > APIs & Services > Credentials / Google Auth Platform에서 프로젝트 및 OAuth 동의 화면 설정.
2. 본인만 사용할 테스트 단계라면 `External` 앱의 테스트 사용자로 사용할 Google 계정을 등록. 화면의 사용 언어는 관리자가 한국어를 선택해도 일반 방문자 사이트는 **English-first** 유지.
3. `OAuth client ID` > `Web application` 생성:
   - Authorized JavaScript origin: `https://whateato-cms-preview.onrender.com`
   - Authorized redirect URI: `https://whateato-cms-preview.onrender.com/api/auth/callback/google`
4. **Render 프리뷰 서비스의 Environment**에서 다음 세 가지 항목을 직접 입력. **대화/GitHub/issues/스크린샷에 비밀키 붙여 넣지 말 것.**
   - `AUTH_GOOGLE_ID` = 위에서 발급한 client ID
   - `AUTH_GOOGLE_SECRET` = 위에서 발급한 client secret
   - `WHATEATO_CMS_BOOTSTRAP_GOOGLE_EMAIL` = owner로 승인할 **본인의 Google 계정 이메일 정확히 하나**
5. 사용자에게서 'Google 설정 완료' 메시지를 받은 뒤 관리자가 프리뷰의 `WHATEATO_OWNER_CMS_ENABLED=true`, `WHATEATO_CMS_BOOTSTRAP_ENABLED=true`, `WHATEATO_BULK_ADMIN_ENABLED=true`, `WHATEATO_REVIEW_MODERATION_ENABLED=true` 로 변경하고 빌드/접속 테스트.
6. 관리자 계정으로 `/admin`에서 로그인. Google이 verified=true로 보낸 이메일이 정확히 설정 이메일과 일치하고 **현재 활성 owner가 하나도 없을 때만** 해당 Google subject의 내부 UUID에 owner 역할이 부여된다. 이메일은 DB에 보관하지 않는다.
7. 로그인이 완료되면 **반드시** `WHATEATO_CMS_BOOTSTRAP_ENABLED=false` 로 되돌린 뒤 Render 환경변수에서 `WHATEATO_CMS_BOOTSTRAP_GOOGLE_EMAIL` 삭제. 기본 로그인은 이후에도 계속 가능하다.
8. 관리자를 추가할 때는 임의의 Google 로그인 사용자 전체를 허용하지 말고 각각 DB 역할을 수동 승인한다.

## 최종 검증
- `/admin` 접근: 미로그인 차단, 일반 로그인 사용자 차단, owner 허용.
- `/api/v1/owner/readiness`는 owner만 접근 가능하고, **비밀번호를 노출하지 않는** 연결 상태를 보여준다.
- 테스트 식당 하나로 임시저장 → 승인 요청 → 승인 → 20개씩 게시 → 비공개 → 복구 검증.
- 이미지 1장 업로드 시: 서버 8MiB 제한, 회전·리사이즈·EXIF 제거, WebP 변환, storage 업로드, DB draft, owner 승인 후에만 public route 접근. 승인 전 404 반환.
- 방문후기 테스트: 익명 사용자/일반 리뷰 작성자는 리뷰 관리자 권한 불가, owner는 승인·거절·숨김 가능. 관리자는 점수/본문 수정 불가.
- 실제 사진과 실사용자 리뷰는 **스테이징 테스트 완료 전 입력·승인하지 말 것**.
- 마지막으로 PC·모바일 프리뷰 스크린샷 QA 후 별도 owner 배포 승인. 기존 DESIGN LOCK의 공개 UI는 임의 변경 금지.

## 장애 복구
- `WHATEATO_OWNER_CMS_ENABLED=false` 로 프리뷰 관리자 API를 즉시 비활성화할 수 있다.
- 이 프리뷰는 staging DB와 storage 키에만 접근한다. 운영 브랜치와 비공개 스토리지를 교차 연결하지 말 것.
- 사진 스토리지 자격증명은 staging 브랜치 한정 `storage:read` + `storage:write` 범위. 외부에 유출되었다면 Neon에서 해당 스토리지 credential을 취소하고 새로운 값으로 교체.
- 어떤 단계에서도 관리자/Google/OAuth/Neon/S3 비밀 토큰을 대화창에 보내지 말 것.
