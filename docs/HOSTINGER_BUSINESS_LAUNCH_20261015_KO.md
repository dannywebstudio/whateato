# WhatEatO — Hostinger Business 정식 런칭 이관 작업서

**GitHub release branch:** `release/hostinger-launch-v1`
**Target:** Hostinger **Business** → **새 Node.js Web App** (Next.js, server-side).
**Previously running:** Render preview `https://whateato-cms-preview.onrender.com` — leave as rollback/QA, do not delete.
**Dedicated launch database:** Neon project `aged-wildflower-47196131`, branch `launch-hostinger-20261015` (`br-muddy-cloud-b36g5pir`), created from verified Staging at launch cut. It is NOT the existing Neon default/primary branch.

## IMPORTANT — Hostinger plan correction (2026-10-15)

**Owner confirmed they have Hostinger Premium, NOT Business.**
According to Hostinger's official support, **Premium shared web hosting does not offer managed Node.js / Next.js server-side web app deployment**. Do NOT tell the owner to select their Premium plan for a new Node.js web app; this path is blocked until the hosting plan is upgraded to a compatible Business/Unlimited-tier or Cloud plan. Naming/pricing of plans may vary by region and account. Do not purchase or upgrade automatically.

Two viable launch paths:
- **Keep Hostinger Premium for domain/DNS and deploy Next.js on Render.** Point a registered domain to Render based on the host's verified domain/DNS instructions; the Render service must run the approved release branch and Neon launch DB, and be independently checked before Search Console registration.
- **Upgrade Hostinger** to a plan showing support for Node.js apps, then use the existing migration guide below to move the full-stack app to Hostinger.

Official reference: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/
Hostinger announcement: https://www.hostinger.com/changelog/nodejs-hosting-now-available-on-business-plans-and-higher

**The rest of the Hostinger web-app setup instructions below apply ONLY after upgrading from Premium to a supported plan.** The release branch and dedicated Neon launch branch are already ready; neither is proof the site has moved.


## 진행 상태

- [x] GitHub release branch created from approved CMS preview.
- [x] Dedicated launch DB clone created. Has 9,998 imported restaurant records.
- [x] Read-only DB check: only **3** source-verified opening-hours restaurants pass mandatory A/B public gate: 광화문 미진, 청진옥, 우래옥.
- [x] Shared SQL gate on search / detail / map. Direct detail for non-public ID gives 404.
- [x] SEO sitemap uses same public restaurant gate. Draft/non-reviewed pages not indexed.
- [ ] Hostinger Business new **Node.js web app** attached to GitHub `dannywebstudio/whateato` **branch `release/hostinger-launch-v1`**.
- [ ] `DATABASE_URL` securely set for **launch-hostinger-20261015** branch (never use default production or leaked connection string).
- [ ] Business domain purchased or existing owned domain confirmed + attached to new web app.
- [ ] TLS and `www` → canonical redirects checked on final domain.
- [ ] Google OAuth redirect URL updated to final hostname (if login enabled), sign-in flows QA.
- [ ] Operator details/contact/legal privacy notice reviewed for public use.
- [ ] Real-site search/map/detail/images/mobile smoke tests PASS.
- [ ] Switch `NEXT_PUBLIC_LAUNCH_READY=true` with `NEXT_PUBLIC_SITE_URL=https://<canonical-domain>` and re-deploy on Hostinger (never preview).
- [ ] Google Search Console final domain ownership confirmed; `https://<canonical-domain>/sitemap.xml` submitted.
- [ ] Ongoing post-launch QA in production.

## A. Hostinger 기존 Business 플랜에 새 웹앱 추가

공식: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/

1. Hostinger Dashboard → **Websites → Add Website** (또는 Create website) → **Deploy Web App / Node.js Web App**.
2. 기존 **Business** 호스팅 플랜 선택. 기존 NookPrep/WordPress 웹사이트는 **삭제/교체하지 말 것**. WhatEatO만 별도 신규 웹앱으로 추가.
3. **Import Git Repository / GitHub integration** → 사용자 GitHub OAuth 승인 → `dannywebstudio/whateato` 선택.
4. **배포 브랜치 `release/hostinger-launch-v1`** 확인. `main`/기존 Render 브랜치가 아님.
5. Framework: **Next.js** / Node.js **22** (또는 호환되는 24), npm install/build 자동 감지. `package.json` scripts: `npm run build`, `npm run start`. Next.js SSR/API는 static HTML로 내보내지 않음.
6. 임시 도메인으로 첫 배포 후 앱이 정상 시작되는지 확인. Hostinger `Deployments`의 빌드 로그 및 서버 로그 확인.
7. **서버 시작 로그**의 `PUBLIC_CATALOG_PREFLIGHT`에 `selected=300`, `A_B=295`, `verified_hours_visible=3`, `total_hidden=9995`가 보여야 함. 다른 수치나 `invalid_schema_or_connection`이면 배포 중단.

Hostinger 자체 GitHub 계정은 플랜당 한 계정만 연결되므로 기존 사이트에 연결된 GitHub 계정과 같게 사용.

## B. Hostinger 환경변수 (대시보드에만 입력, GitHub 금지)

기본 사전 확인용 (도메인 연결 전):
```dotenv
NODE_ENV=production
NEXT_PUBLIC_LAUNCH_READY=false
NEXT_PUBLIC_SITE_URL=https://REPLACE_WITH_OWNED_CANONICAL_DOMAIN
WHATEATO_ANALYTICS_ENABLED=false
WHATEATO_OWNER_CMS_ENABLED=false
WHATEATO_BULK_ADMIN_ENABLED=false
WHATEATO_REVIEW_MODERATION_ENABLED=false
WHATEATO_GOOGLE_ENRICHMENT_ENABLED=false
WHATEATO_RELEASE_COHORT_300_ONLY=false
```

**민감정보 (비공개)**:
- `DATABASE_URL`: Neon Dashboard → branch **launch-hostinger-20261015** → Connection details → **Pooled** connection string. Hostinger secret field에만 입력. UI에는 비밀 값을 보여주거나 공유하지 말 것.
- 인증/리뷰를 운영할 경우 **새 운영용** `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL` 등이 필요. Google Cloud OAuth Authorized redirect URI는 최종 도메인 `https://DOMAIN/api/auth/callback/google`. Google 로그인 외부 승인/검증 상태를 점검하지 않았다면 리뷰/로그인 기능을 공식 출시 기능이라고 광고하지 말 것.
- CMS 파일 업로드용 S3 호환 비밀 키는 기존 Render 앱에서 쓰던 것과 별개로 Hostinger 환경변수에 설정. 필요할 때까지 관리자 업로드 비활성.

**중요:** Launch Ready는 신규 웹앱이 배포되고 TLS·법적 고지·HTTP 테스트를 마친 후 `true`로 변경. 공개 가능할 때 호스트 설정을 바꾸고 재배포해야 SSR/사이트맵/robots가 일치한다.

`PUBLIC_CATALOG_PREFLIGHT`는 DB 접속 실패·공개 코호트 불일치 시 **사이트 실행을 중단**. 다른 브랜치 연결을 방지한다.

## C. 도메인 및 DNS

공식: https://www.hostinger.com/support/how-to-connect-a-custom-domain-to-a-node-js-application/

1. 이미 가진 도메인이 있으면 **그 도메인을 사용**. 아직 소유하지 않았다면 Hostinger Dashboard → Domains → 도메인 검색/구매/결제. 가격과 사용 가능 여부는 호스팅어 화면에서 실시간 확인.
2. 새 **WhatEatO Node.js Web App** 대시보드 → Connect domain → **사용자가 소유한 정식 도메인** 선택.
3. Hostinger가 표시하는 DNS NS 또는 A/CNAME **실제 값만 적용** (다른 WordPress 사이트/메일의 기존 DNS는 변경하지 않음). 임의 IP/NS 하드코딩 금지.
4. 전파 (최대 약 24시간), HTTPS SSL 자동 발급, www 및 root 중 하나를 **하나의 canonical**으로 정리하고 HTTPS redirect 확인.
5. 새 도메인이 적용되면 `NEXT_PUBLIC_SITE_URL`, Auth.js `AUTH_URL`, Google OAuth URL을 최종 hostname으로 통일.

**기존 다른 Hostinger 사이트에 도메인이 이미 붙어 있다면 사이트를 무턱대고 삭제하지 말 것.** Hostinger Node.js 웹앱 생성에 새 사이트가 필요하므로, 기존 사이트 삭제는 해당 사이트 백업 및 사용자 명시적 승인 없이는 금지.

## D. Google 검색 등록

1. 최종 도메인 정상 HTTPS 공개 + `NEXT_PUBLIC_LAUNCH_READY=true` + `robots.txt` 검사.
2. 무료 Google Search Console `https://search.google.com/search-console` → **도메인 속성** 등록(권장) → TXT DNS 소유권 인증 (Hostinger DNS).
3. `https://DOMAIN/sitemap.xml` 제출; `/robots.txt`에서 sitemap 링크가 최종 도메인을 가리키는지 확인.
4. URL 검사로 홈, 검증된 식당 상세 대표 URL 몇 개 색인 요청. Google 크롤링과 실제 색인 여부는 보장할 수 없음.
5. 검색 결과 `/search`, 지도 `/map`, `/admin`, `/api`, `/account`는 색인 대상에서 제외. 사이트맵은 **현재 공개 허용 식당만** 포함한다.
6. 기존 GSC Wizard 연동은 `payment_required` 상태라 직접 GSC 등록은 불가능. Google 공식 Console 무료 인증 경로 사용.

## E. 정식 도메인에서 QA

- Homepage `/`, Search `/search?q=광화문`, API `/api/v1/restaurants?q=광화문`, Map `/map`, Detail `/restaurant/<public-id>`.
- 검증된 시간표를 가진 3곳만 노출. 불허 UUID 직접 상세 API는 `404` (검색·지도·상세 동일). DB 원본 삭제는 없음.
- Korea/English/Japanese/Chinese 언어 링크, 모바일 360/390/768/1440 폭, 지도/핀, 데이터 없는 메뉴·사진 fallback, canonical/OG, sitemap/robots, 404/500, 로그인/리뷰 파일 업로드 별도 QA.
- HTTPS/redirect, CSP, Rate-limit, privacy notice, 운영 복구, 백업/로그 모니터링 검증 후 Search Console 등록 완료 보고.
- 기존 Render preview는 QA/rollback용으로 보존하고 이후 정리 여부를 별도 승인받음.

## 현재까지 실제 구현과 미실행 구분

**완료:** GitHub 릴리즈 브랜치 준비, 분리된 Neon DB 생성 및 3곳 필터 검증, 미리보기와 분리, 공개 식당에 한정하는 SEO 사이트맵 코드.

**Hostinger 대시보드 수동 필요:** GitHub OAuth 연결, 사이트 생성 및 환경변수 입력, 실제 도메인 소유/구매/연결과 DNS 변경, Google 소유권 인증. 현재 ChatGPT에 Hostinger 호스팅/DNS 조작 연결이 없으므로 사용자 호스팅 계정의 변경이 확인되기 전에는 사이트 이전 성공이나 정식 도메인 등록 완료라고 보고하지 않는다.
