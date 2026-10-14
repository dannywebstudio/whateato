# WhatEatO — Google API 무료 사용량 운영 정책 (2026-10-14)

**적용 대상:** 서울 300개 음식점 Staging 데이터 정리 보조.  
**Google 지도 타일:** 사용하지 않음. 기존 지도는 MapLibre + OpenFreeMap 기반.  
**Google 사진/평점/리뷰:** 이번 단계 사용 금지.

## 확인된 공식 무료 한도와 WhatEatO 자체 제한

| 구분 | Google 공식 무료 한도 (일반 종량제, SKU별/월) | WhatEatO 자체 상한 (월 / UTC일) |
|---|---:|---:|
| Places API (New) Text Search **Pro** | 5,000회 | **300 / 20회** |
| Cloud Translation NMT (Basic/Advanced 공통 크레딧) | 월 500,000자 상당 $10 크레딧 | **100,000 / 10,000자** |
| Geocoding (기존 보유 위경도 사용) | 10,000회 | **0회** — 미연결 |
| Maps JavaScript / Dynamic Maps | 10,000 loads | **0회** — OpenFreeMap 사용 |
| Places Photo / Rating / Reviews / Enterprise | 별도 SKU 요금·허용범위 | **0회** — 미연결 |

- 참조: https://developers.google.com/maps/billing-and-pricing/pricing
- 참조: https://cloud.google.com/products/translate/pricing
- Google 예산 경보는 **실제 청구 차단이 아님**: https://developers.google.com/maps/billing-and-pricing/manage-costs
- API SKU/무료 상한은 계정의 요금제, 청구 프로젝트 및 시점에 따라 달라질 수 있다. **Google Cloud 콘솔의 실제 Billing/Quota 사용량이 우선한다.**

## 서버 쪽 안전장치

- `WHATEATO_GOOGLE_ENRICHMENT_ENABLED=false` **기본 OFF**. 명시적으로 true가 되고 서버전용 API 키와 Staging DATABASE_URL이 없으면 Google 호출을 거부한다.
- `db/migrations/016_google_free_tier_budget.sql`의 PostgreSQL 테이블에 월·일 누적을 트랜잭션/행 락으로 **원자적 예약**한다. 여러 GitHub Actions나 워커가 동시 실행해도 우리 코드 경로에서 중복 초과를 억제한다.
- `workKey`가 같은 요청은 해당 월에 재호출할 수 없다. 네트워크 장애·Google 5xx 후에도 자동 재시도·환불을 하지 않고, **시도된 호출은 차감**해 초과 위험을 줄인다.
- Google 요청 전 한도 검사, 한도 미달/연결 실패/DB 테이블 없음에서는 **fail closed**, 서비스는 기존 자료로 계속 운영.
- Places Text Search 요청은 `places.id,places.displayName,places.formattedAddress` 필드만 요청하며 사진·리뷰·평점·영업시간·고비용 Enterprise 필드를 요청하지 않는다.
- Google Places 반환 이름/주소는 **사람의 주소·상호 일치 확인용 일시적 힌트**이며, 결과를 공공데이터 원본으로 대체하거나 장기간 저장하지 않는다. 독립적으로 출처를 확인한 메뉴와 자체 편집 설명을 별도로 DB에 기재한다. Place ID는 정책에 따라 보관 가능: https://developers.google.com/maps/documentation/places/web-service/place-id
- Google Translation 결과는 `review` 초안 용도로만 사용하고, 자동 게시/승인 불가. 번역 호출은 타깃 언어 각각의 **원문 입력 문자 수**를 차감한다.

## 반드시 직접 설정해야 할 Google Cloud Console 안전 설정

1. **전용 Google Cloud 프로젝트 / 전용 Billing 및 server-to-server API 키**를 사용한다. Places API (New)와 Cloud Translation 이외 불필요한 API는 비활성화. 키의 API 사용처를 각 서비스로 제한하고, 브라우저와 GitHub 소스에 키를 공개하지 않는다.
2. Google Maps Platform **APIs & Services → Quotas**에서 Places 검색 API의 일일 요청 상한을 코드보다 같거나 낮게 설정한다(권장 20/day). Cloud Translation에서 문자/분 요청량 제한을 낮춘다. SKU별 실제 청구량은 Billing에서 따로 확인한다.
3. **Billing → Budgets & alerts**에 매우 낮은 지출 경보(예: $1)와 예상 비용 알림을 설정한다. **예산 경보만으로 자동 과금이 중단되지는 않는다**.
4. 사용자 계정의 현재 월 Places/Translation 실제 사용량이 다른 서비스에서 이미 쌓여 있다면, **코드 상한보다 실제 잔여 무료 한도가 적을 수 있다.** Google Cloud Billing에서 이를 확인하기 전까지 `WHATEATO_GOOGLE_ENRICHMENT_ENABLED=false`를 유지한다.
5. 시스템 키는 Render/Hostinger의 **서버 비밀 환경변수**로만 관리한다: `WHATEATO_GOOGLE_PLACES_API_KEY`, `WHATEATO_GOOGLE_TRANSLATE_API_KEY`. React 클라이언트에서 호출하지 않는다.
6. 승인 후 새 무료 API 배치 시작 전 DB `whateato_google_budget_usage_v1`에서 남은 내부 잔량을 확인한다. 운영/다른 워커가 같은 Google 키를 사용하지 않는지 확인한다.

## 실행 플로우 (권장)

1. **무료·무호출 우선**: 원본 인허가/공공데이터/식당 공식 웹사이트에서 상호·주소·메뉴·가격 조사.
2. 지점 구별이 힘들 때에만 Places Text Search **최대 1회/지점** (월 상한 300). 같은 식당 재조회는 월별 workKey로 방지. 별점·사진·리뷰 불호출.
3. 메뉴·가격은 Places API로 확보하지 않고, **식당 공식 메뉴 / 정확한 지점의 제3자 공개 자료**로 검증. Google에서 수집한 콘텐츠를 무단 보관하거나 OpenFreeMap 위에 Google 데이터를 표시하지 않는다.
4. 인허가 원문으로 만든 식당 소개와 자체 작성 메뉴명이 있는 경우에 한해 번역 API를 예산 내 사용한다. 모든 번역을 `review` 후 검수한다. 이미 DB에 4언어 원문이 존재하면 번역 API 호출 생략.
5. 비용 상한 도달 시 배치를 종료하고 내부 원본/수동 검증 경로로 전환한다. 실시간 자동 무한 재시도 금지.

## DB 사용량 조회 (Staging)

```sql
SELECT period_key,sku,used_units,updated_at
FROM whateato_google_budget_usage_v1
ORDER BY period_key DESC,sku;
```

**이 사용량 테이블은 WhatEatO 코드의 예약 건수만 추적하는 자체 미터이지 Google 실제 Billing 기록은 아님.** Render/기타 Google 서비스를 통해 새 요청을 만들면 Google Cloud Console 집계가 우선한다.

## QA

- `scripts/verify_google_free_tier_guard.mjs`에 정책·기본 OFF·허용 SKU·원자적 트랜잭션·중복 방지 계약을 추가해 GitHub 웹 CI에 연결.
- **Staging 마이그레이션 적용. Google 실제 유료 API 호출은 수행하지 않음.**
- 운영 DB·Google Cloud 쿼터·실제 Google API 키 설정 **변경 없음**.
