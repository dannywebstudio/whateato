# WhatEatO URL·크롤링·사이트맵 점검서 (2026-11-19)

## 상태 및 근거
- 근거: `src/app`, `src/lib/public-seo.ts`, `src/lib/seo-locales.ts`, `src/app/robots.ts`, `src/app/sitemap.ts`, `src/components/Header.tsx` (현재 통합 브랜치).
- Search Console 실제 오류 목록/Googlebot 최종 응답은 현재 연결 권한만으로 확인되지 않음. 코드로 확인된 현상과 Search Console에서 관찰된 문제를 구분할 것.
- 운영 도메인 강제 통일: `https://whateato.com` (HTTPS, non-www). HTTP→HTTPS와 www→non-www는 호스팅/CDN에서 직접 301/308로 처리하고, 중간 리디렉션을 줄여야 함.

## URL 인벤토리와 검색 허용 정책

| 유형 | URL | 색인/사이트맵 | 내부 링크 |
|---|---|---|---|
| 홈 | `/` | 환경변수 SEO 활성화 때만 등록 | 전역 로고 |
| 블로그 목록 EN | `/blog` | 색인 | 헤더/글의 뒤로가기 |
| 블로그 목록 KO/JA/ZH | `/blog?hl=ko`, `?hl=ja`, `?hl=zh-CN` | 실제 발행 번역이 있을 때 등록 | 목록 메뉴·게시물 링크 |
| 블로그 글 EN | `/blog/:slug` | 공개된 원고만 색인 | 블로그 카드 |
| 블로그 글 JA | `/ja/blog/:slug` | 공개된 일본어 원고만 색인 | 블로그 카드·언어 전환 |
| 블로그 글 KO/ZH | `/blog/:slug?hl=ko`, `?hl=zh-CN` | 해당 번역이 발행된 원고만 색인 | 블로그 카드·언어 전환 |
| 음식점 KO | `/restaurant/:uuid` | 공개 승인/검증된 매장만 색인 | 지도/검색 카드 |
| 음식점 EN/JA/ZH | `/restaurant/:uuid?hl=en`, `?hl=ja`, `?hl=zh-CN` | 해당 언어의 실제 검증된 번역만 색인 | 음식점 카드·블로그 관련 매장 |
| 지도 탐색 | `/map?... ` | 사용자 탐색 화면으로 noindex, 사이트맵 미포함 | 헤더·카드 |
| 검색 필터 | `/search?... ` | 조건 조합 중복 방지 noindex, 사이트맵 미포함 | 홈 검색·지도 |
| 계정·관리·API | `/login`, `/my-page`, `/account`, `/admin`, `/api/...` | 비공개/noindex, 사이트맵 미포함 | 로그인 UI |
| 법률 안내 | `/privacy`, `/terms` | noindex, 사이트맵 미포함 | 공통 하단 |
| 문의 | `/contact` | 루트 layout의 noindex를 상속하므로 색인되지 않음 | 헤더·하단 |

## 크롤링 관련 위험

1. **국가 기반 클라이언트 URL 변경:** 현재 `Header.tsx`가 초기 방문 때 `router.replace()`로 `/blog`, `/restaurant/:id`를 `?hl=...`로 이동시킬 수 있음. 이는 sitemap/서버 canonical URL과 렌더링 후 URL을 불일치시킴. Google도 언어·IP 기반 자동 리디렉션을 피하라고 권고. 코드수정은 **디자인 잠금/소유자 승인 정책**과 충돌하므로 별도의 승인된 Header 동작 변경 PR로 진행.
2. **기존 북마크·링크에서 생긴 중복 URL:** `/blog?hl=en`, `/blog/:slug?hl=en`, `/blog/:slug?hl=ja`, `/restaurant/:uuid?hl=ko` 등은 canonical과 달라질 수 있음. 우선 새 내부 링크는 canonical만 생성. 구 URL의 HTTP 301/308 교체는 실제 Search Console 오류 대상 확인 후 시행.
3. **SEO 환경변수 게이트:** `WHATEATO_SEO_PUBLIC_ENABLED=true`와 `NEXT_PUBLIC_SITE_URL=https://whateato.com`가 모두 있어야 `/robots.txt`에서 전체 크롤링이 허용되고 사이트맵에 URL이 나옴. 불일치하면 robots `Disallow: /`와 빈 sitemap이 되므로 가장 먼저 확인.
4. **동적 사이트맵:** 공개 승인 음식점마다 상세 내용을 조회하므로 승인 수가 급증하면 응답 시간이 증가할 수 있음. 기존 owner 승인·triage·검증된 언어·비공개 제외 규칙을 유지한 상태에서 추후 일괄 조회와 안전한 캐시 전략을 별도 최적화.
5. **지도/검색 색인 제외는 의도된 정책:** 지도 핀·검색 결과는 개별 `/restaurant/:uuid`에서 색인. 지도 검색 필터 조합을 사이트맵에 넣으면 중복·얇은 페이지와 크롤링 낭비가 생길 수 있음.

## 배포 직후 점검

1. 실제 배포 브랜치/환경변수 확인, `https://whateato.com/robots.txt` 및 `https://whateato.com/sitemap.xml`의 HTTP 200/내용 검사
2. `node scripts/audit_public_seo_routes.mjs https://whateato.com 16`로 대표 sitemap URL의 직접 200, canonical 일치, noindex/중복, HTTP/www 리디렉션 체인 검사
3. `node scripts/verify_public_seo_live.mjs` 검증. 다국어 음식점 URL을 UUID 단위로 고유 카운트해 검색 API와 대조
4. Search Console → 색인 생성 → 페이지 → 리디렉션 오류에서 **예시 URL**, 마지막 크롤링 일시, 사용자 지정/Google 선택 canonical, URL 검사 결과를 확보
5. 해당 URL의 301/302/307/308 Location 홉과 최종 응답, robots/페이지 noindex, canonical, hreflang, 내부 링크, sitemap 포함 여부를 함께 비교
6. Search Console `sitemap.xml`을 다시 제출하고, 오류 페이지의 **수정 사항 확인(Validate Fix)** 후 수일~수주 단위로 재크롤링 추이를 확인. 단순히 '리디렉션된 페이지'인 301 원본은 오류가 아닐 수 있음

## 변경 기준
- 사용 중인 기존 SEO 정규 URL을 한꺼번에 `/ko`, `/zh` 등 새 주소로 변경하지 않음.
- 사용자 공개 승인되지 않은 식당·미발행 초안·개인 URL을 sitemap에 넣지 않음.
- `robots.txt`의 noindex 대상과 인증 페이지를 인위적으로 색인 허용하지 않음.
- 실제 오류 URL이 식별되기 전 서버 전역 리디렉션 규칙을 함부로 수정하지 않음.
