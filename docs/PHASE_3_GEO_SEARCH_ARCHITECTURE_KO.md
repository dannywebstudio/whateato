# WhatEatO Phase 3 — 지도 검색 엔진 백엔드 v1 (2026-10-12)

## 진행 결정
**배포 이전에 기능·데이터·자동화 검증을 최대한 완성한다.** Hostinger 업그레이드나 실제 도메인 배포를 이 단계에서 요구하지 않는다. 사용자 승인 DESIGN LOCK v1.0을 보존한다.

## 이번 개발 범위 (실제 구현)
- `GET /api/v1/map/markers?bbox=south,west,north,east&hl=ko&f=cafe&q=...&limit=100`
  - 중심점/외부 지도 제공자 없이 좌표가 검증 가능하고 공개 상태인 식당만 반환.
  - 한국 좌표 범위 위도 33~39.5, 경도 124~132; 위도/경도 역전, NaN, Infinity, 비정상 입력 거부.
  - 한번에 최대 위도·경도 1.5도 뷰포트와 200개 마커로 제한; `has_more`로 중간 생략 여부 명시.
  - 영업 인허가 활성+퍼블리싱 식당만 노출; verified/evidence/verified_at가 없는 생활 태그는 검색·출력에서 제외.
  - 다국어 이름·태그 명칭은 승인된 번역만 사용하고 없으면 한국어 원문 fallback.
  - 승인·검증된 WhatEatO 독립 점수만 출력. 허가 확인되지 않은 사진이나 비공개 storage key는 응답에 포함하지 않음.
- `GET /api/v1/restaurants/nearby?lat=37.571&lon=126.98&radius_km=3&hl=en&limit=50`
  - 반경 0.25~20km만 허용. 거리 상자 사전 필터 후 Haversine 구면 거리 계산.
  - 거리가 가까운 순으로 정렬하고 이름/id로 안정적인 tie-break.
  - 반환 `distance_km`는 **직선 거리**이며 걸어서 이동할 때의 도로 길이가 아님.
- 스테이징 Neon DB에 **비파괴 005 좌표 검색 인덱스**를 적용, 인덱스 생성 확인.
  - `db/migrations/005_geo_search_indexes.sql`; 운영 DB 반영과 대용량 벤치마크는 후속 검증으로 분리.
- 실제 PostgreSQL 기반 CI 합성 데이터에 위경도를 부여. 정상 2곳, 숨김 1곳, 폐업 1곳으로 HTTP 검증.
  - 마커 필터·페이지 limit+1·거리 반경·공개 상태·미승인 태그·주소·비정상 입력·사진 정보 노출 방지를 검증.
- `/map`의 원래 자리표시자와 HOME/CSS/Header/SearchBox/Preview의 시각적 디자인은 바꾸지 않음. 실제 지도 타일 공급자 및 지도 화면에 마커 렌더링은 **미구현**. 무허가 지도 타일 호출이나 지도처럼 보이는 허위 그림을 만들지 않음.

## 정확한 데이터 범위
- 실제 운영 DB 10,000건: 종로구 6,640 / 중구 3,359 / 은평구 1.
- 도로명 주소 약 9,662건, 좌표 9,650건. 인허가 기록의 좌표는 방문 입구를 보장하지 않으며 실시간 영업 여부도 아님.
- 검증·권리 허가된 신규 메뉴/별점/사진/태그/소개가 없는 식당은 기본 위치·이름/주소만 제공.
- 처음 20개 식당은 연구 후보이며 `data/enrichment-queue/phase25-first20-20261012.json`에서 모두 hold 상태.

## API 사용 예시 (실서버 배포 후)
```http
GET /api/v1/map/markers?bbox=37.56,126.97,37.59,127.01&hl=ko&limit=100
GET /api/v1/restaurants/nearby?lat=37.5711&lon=126.98&radius_km=3&hl=en&f=cafe
```

## 다음 게이트
1. CI에서 새 실제 HTTP 시나리오·Design Lock 모두 통과.
2. 좌표 검증 및 중복 기록 판단 고도화 (지도 pin은 permit 좌표와 입구 주소가 다를 수 있음).
3. 상용/공개 이용 조건을 준수하는 **지도 제공자**를 정한 다음, 기존 `/map` 컨테이너에서 지도 타일·마커·상호작용 구현. **이 화면은 잠긴 Home 디자인을 바꾸지 않더라도 시각적 변화가 생기므로, 기존 컨테이너 범위에서만 추가하며 사용자 승인 원칙 유지.**
4. 태그/설명/메뉴/사진/편집 별점 데이터를 출처 검증 후 대량 채우는 별도 Pipeline.
5. 현재 단계에서 Hostinger, 도메인 또는 GitHub `main` 배포하지 않음.


## 2026-10-13 지도 UI 연동: MapLibre + MapTiler (브랜치 내 개발)
- `src/components/RestaurantMap.tsx`, `src/app/map/page.tsx`로 지도 영역 화면을 실제 지도로 렌더링할 수 있게 구현. 새로운 지도 라이브러리 `maplibre-gl ^6`을 사용.
- 지도 중심은 서울 시청 일대, 마커 데이터는 오직 `/api/v1/map/markers`의 영업 인허가 활성·사이트 공개 식당으로 제한하며, 출처 불명 추정 별점·사진은 추가하지 않음.
- 지도 이동 종료 시 범위(bbox)로 실시간 목록 새로 조회, 확대 필요 안내, 최대 200개 마커 및 접근성용 별도 식당 목록(화면에서 처음 20곳) 표시. 마커 선택 시 식당 상세 링크 제공.
- `SearchBoxSynced`를 Map에서도 재사용하도록 확장하여 언어, 검색어, 태그 선택 상태가 화면에서 유지됨. **DESIGN LOCK 파일은 변경 없음**.
- **외부 타일 요청을 막는 기본값:** `NEXT_PUBLIC_MAPTILER_API_KEY`가 없으면 지도 공급자를 호출하지 않고 기존과 비슷한 빈 지도 영역에 정확한 연결 불가 안내만 표시. 시험 CI에서는 API 키 제공 없음.
- 실제 키를 활성화하려면 프로젝트 소유자가 MapTiler 라이선스와 계정을 승인하고, **스테이징 전용 및 운영 전용으로 각각 origin-restricted 브라우저 키**를 발급받아 해당 환경에 배치. 유출·악용에 대비해 월별 사용량 경보 설정 권장.
- **상업용 사이트 운영에 MapTiler Free를 무조건 사용하면 안 됨**: 무료 플랜은 비상업적 사용 및 상용 제품 R&D 용도로 제한됨. WhatEatO가 애드센스 등 광고가 붙는 상업용 사이트일 경우 별도 적합 요금제/권리 확인이 필수.
- 지도 타일 상호작용과 제공자 과금·실기기 WebGL 검증은 실제 유료/허가 키가 없어 **미검증**. 테스트는 키 없을 때 무요청 fallback, 정상 로컬 Postgres 지리 검색 API, 데스크톱/모바일의 기본 SSR 흐름만 확인.
- 공식 자료:
  - https://maplibre.org/maplibre-gl-js/docs/
  - https://docs.maptiler.com/guides/credentials/api-key/
  - https://docs.maptiler.com/sdk-js/examples/switch-from-maplibre/
  - https://www.maptiler.com/terms/cloud/
