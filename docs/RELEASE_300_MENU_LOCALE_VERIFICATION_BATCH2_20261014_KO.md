# WhatEatO 서울 핵심 300곳 — 추가 메뉴 검증 배치 (2026-10-14)

**대상:** Neon `br-autumn-pine-b36z3utm` Staging ONLY. 운영 DB, 사진, 별점, 실제 서비스 배포 미변경.

## 이번 배치에서 새로 작업한 식당 7곳 (총 22개 메뉴)

| 순위 | 식당 | 이번 확인·등록 메뉴 수 | 대조 출처 |
|---:|---|---:|---|
| 8 | 서촌명가 | 기존 초안 3개 → 공개 근거 대조 | 서울시 식품안전정보, 다이닝코드 |
| 35 | 육대장 광화문점 | 3개 | 테이블링, 다이닝코드 |
| 81 | 카린지&린가네 광화문점 | 4개 | 테이블링, 뽈레 |
| 40 | 대성집 | 3개 | 테이블링, 한국 관광 소개정보 |
| 55 | 종가 김치찌개 | 3개 | 테이블링, 뽈레 |
| 56 | 공릉닭한마리 | 3개 | 예약 메뉴 안내, 다이닝코드 |
| 88 | 남해굴국밥 | 3개 | 테이블링, 당근 동네업체 |

**실제로 이번 배치에서 추가/승격한 메뉴 22개**는 한국어·영어·일본어·중국어 간체 이름 4개씩 보유. 모든 지점 주소는 인허가 원본과 공개 자료를 대조. 새 가격은 단 하나도 기입하지 않음. **현재 판매 및 가격을 점주가 보증했다는 의미는 아니며, 공개 메뉴 자료의 지점·메뉴 교차 확인 수준임.**

서촌명가: 청국장, 생선구이, 제육정식.  
육대장: 옛날전통육개장, 부대육개장, 차돌육개장.  
카린지&린가네: 카린지점보카츠, 점보유린카츠, 가쓰오떡볶이, 야끼소바.  
대성집: 도가니탕, 수육, 해장국.  
종가 김치찌개: 생삼겹180g, 생목살180g, 김치찌개.  
공릉닭한마리: 닭한마리, 닭한마리반, 닭두마리.  
남해굴국밥: 굴국밥, 굴떡국, 굴순두부.

## 실제 URL 근거

- 서촌명가: https://fsi.seoul.go.kr/front/M0000011/foodsafety/foodMapGuide.do?pageIndex=1&searchKeyword=&srcCggCode=-1&srcCrtfcGbn=20 / https://www.diningcode.com/profile.php?rid=DbMRM7W6D6sl
- 육대장: https://www.tabling.co.kr/place/677ccc0c66de5f06987e5809 / https://www.diningcode.com/profile.php?rid=poa37lBmMHv3
- 카린지: https://www.tabling.co.kr/place/677cd44466de5f06988d183d / https://polle.com/place/2Tq0db/%EC%B9%B4%EB%A6%B0%EC%A7%80%20%EB%A6%B0%EA%B0%80%EB%84%A4
- 대성집: https://www.tabling.co.kr/place/6762812a66de5f0698ee0a5f / https://www.ktriptips.com/kor/food/2438867
- 종가: https://www.tabling.co.kr/place/677cc7a066de5f06987510d0 / https://polle.com/place/46RKUB/%EC%A2%85%EA%B0%80%20%EA%B9%80%EC%B9%98%EC%B0%8C%EA%B0%9C
- 공릉: https://autoreserve.com/ko/restaurants/c5jCegiKAHtywsD4DEn3 / https://www.diningcode.com/profile.php?rid=XEwdq0FWIpKB
- 남해굴국밥: https://www.tabling.co.kr/place/677cc7a066de5f0698751155 / https://www.daangn.com/kr/local-profile/%EB%82%A8%ED%95%B4%EA%B5%B4%EA%B5%AD%EB%B0%A5-co8wtymc8kq7/

## 누적 데이터 품질 현황 (Staging 조회)

| 항목 | 현재 |
|---|---:|
| 후보 | 300곳 |
| 검증 근거 기재 메뉴가 있는 식당 | 18곳 |
| 검증 근거 기재 메뉴 항목 | 52개 |
| 해당 메뉴에 누락된 언어 이름 | 0개 |
| 메뉴 출처 미기재 | 0개 |
| 4언어 현지화 공개된 식당 | 3곳 |
| 식당별 4언어 리뷰 초안 보유 | 19곳 |
| 일반/인허가 기반 번역 초안 보유 | 278곳 |
| 최종 사용자/운영 승인 | 0곳 |
| 공개 배포 게이트 | BLOCKED |

기존 1차 조사와 다른 작업에서 추가된 행이 있으므로, 누적치는 해당 시점 DB 조회값. 이번 배치의 명시적 변경은 7개 지점, 22개 메뉴 및 6개 지점의 4언어 식당별 소개문 24개 편집 검토행이다.

**품질 예외 검토:**
- 카린지&린가네: 인허가 ‘경양식’ vs 소비자용 일식/이자카야 분류 차이 → pending.
- 도마: 2024년 블로그 확인 메뉴는 현행 판매 여부 불확실 → 메뉴 미발행, 보류.

## 재실행 SQL

- `sql/staging_release_300_menu_verified_batch_07.sql`
- `sql/staging_release_300_i18n_review_batch_08.sql`
- `sql/staging_release_300_menu_verified_batch_09.sql`
- `sql/staging_release_300_i18n_review_batch_10.sql`
- `sql/staging_release_300_quality_review_batch_11.sql`

## 미완료

**282곳**에 아직 공개 근거 메뉴가 없다. 현지화 4개 언어 초안이 존재해도 실제 메뉴·영업 검증과 편집 QA가 완료된 것은 아니다. 이용자에게 검증 안 된 메뉴를 임의 생성하거나 공개 표시하지 않는다. 사진·별점 제외, 배포 별도 승인.
