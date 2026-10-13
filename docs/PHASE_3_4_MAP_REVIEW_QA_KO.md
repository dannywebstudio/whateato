# WhatEatO Phase 3.4 — 배포 전 지도 UI와 리뷰 다국어 QA

2026-10-13 · feature/i18n-analytics-backend-v1 · Draft PR #6

## 완료한 개발
- `maplibre-gl ^6` 지도 화면 컴포넌트 `src/components/RestaurantMap.tsx` 구현.
- 지도 이동/확대 시 실제 `GET /api/v1/map/markers?bbox=...` 호출, 공개 식당만 지도 마커로 렌더링, 200개 상한·데이터 부족/영역 과대/조회 실패 상태 표시.
- 마커 클릭 후 식당 상세 링크, 접근성 보조용 식당 이름·주소 목록 제공. 허가 DB 좌표가 실시간 영업·입구 위치를 보장하지 않는다는 안내 유지.
- MapLibre용 지도 스타일은 **MapTiler**만 연결하도록 고정했으며, 공개 키 `NEXT_PUBLIC_MAPTILER_API_KEY`가 비어 있으면 **외부 지도 타일에 요청하지 않음**. 구매나 키 생성은 수행하지 않았음.
- `SearchBoxSynced`에 지도 검색 target을 추가해 `q`, `f`, `hl` 필터를 URL로 보존. 잠긴 `SearchBox.tsx`, Homepage, global CSS, Header와 Preview는 수정 없음.
- 리뷰 도메인 헬퍼 UUID 정규식 버그를 수정해 유효한 8-4-4-4-12 UUID를 허용. 실제 DB CI에 공개 승인 리뷰 3건·미승인 리뷰 1건의 **가짜 합성** 자료를 넣어 공개 내용·평균 노출을 검증함.
- `ReviewForm`에 한국어·영어·일본어·중국어 레이블·확인·오류 안내 추가. 실제 로그인/Google OAuth 대화형 QA는 향후 독립 스테이징에서 수행.
- React SSR 리뷰 평균 검증 시 HTML 주석을 처리하도록 CI 테스트를 보완. 키 없는 지도 상태·필터 선택·외부 타일 요청 0건 검사, PC·모바일 스크린샷도 CI에서 생성.

## 지도 서비스 구매 전 확인
- MapTiler의 공식 클라우드 약관에 따르면 **Free 요금제는 비상업적 사용 및 상용 제품의 연구개발(R&D)** 용도로 한정된다. WhatEatO는 AdSense 광고 기반 사업을 염두에 두고 있어 운영 웹사이트에 무료 플랜을 임의 활성화하지 말 것.
- 실제 서비스 가능 요금제·과금·attribution·API 요청 할당량을 먼저 확인하고, **스테이징과 운영 도메인마다 별도의 HTTP-origin 제한 공개 키** 발급.
- 키는 클라이언트용 공개 키이므로 `NEXT_PUBLIC_`를 사용하되, 원본 비밀값을 GitHub에 커밋하지 않음.
- API 키 연결 시에는 실제 지도 타일/스마트폰 WebGL/과금 감시/라이선스 표시를 실기기·실계정에서 최종 QA해야 함.

공식 참고: https://maplibre.org/maplibre-gl-js/docs/ ,
https://docs.maptiler.com/guides/credentials/api-key/ ,
https://www.maptiler.com/terms/cloud/

## 아직 완료하지 않은 항목
1. 지도 서비스에 대한 정식 사용권 및 실제 도메인 기반 지도 타일 QA.
2. 구글 계정 로그인·관리자 승인/거절 UI와 실계정 통합 테스트.
3. 실식당 대표 사진 사용권 확보, 실제 영업 상태/메뉴/태그/편집 점수 검증 완료.
4. 스테이징 배포와 실제 Windows/iPhone 실기기 테스트.
5. GitHub main 병합/Hostinger 업그레이드/운영 배포.

**코드상 인터랙티브 지도와 리뷰 다국어 UI를 구현했다는 것은 곧바로 프로덕션에서 실제 타일 지도를 제공한다는 뜻이 아니다.** 승인되지 않은 사진·메뉴·별점은 계속 공개 금지.
