# Hostinger Business 배포 방법

1. Hostinger hPanel → Websites → Add website → Node.js web app / Deploy web app.
2. **새로운 WhatEatO 전용 임시 도메인**을 사용하고 기존 사이트를 절대 덮어쓰지 마세요.
3. Import Git repository → `dannywebstudio/whateato` → `main` 브랜치 선택.
4. Next.js, Node.js 22, repository root (/), build command `npm run build`, start command `npm run start`.
5. 환경변수 `NEXT_PUBLIC_LAUNCH_READY=false` 및 `NEXT_PUBLIC_SITE_URL=https://<assigned-preview-domain>` 설정. DATABASE_URL은 아직 추가하지 않습니다.
6. Deploy 클릭 → 새 임시 사이트에 접근. `/api/health`가 `status:ok`면 웹 배포 정상. `/api/ready`는 DB 미연결 상태에서 503 반환이 정상입니다.
7. DB 생성 후 WhatEatO 전용 PostgreSQL/PostGIS URI를 Hostinger 비밀 환경변수로만 설정하고 식당 데이터 적재를 진행합니다.

주의: 지금 GitHub 저장소는 Public으로 확인되었습니다. 비공개 전환은 GitHub Settings → General → Danger Zone → Change repository visibility 에서 가능합니다. API 키, 비밀번호, .env, 유료/이용 제한 데이터는 절대 저장소에 올리지 마세요.
