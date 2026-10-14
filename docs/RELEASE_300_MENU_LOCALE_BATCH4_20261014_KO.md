# WhatEatO 서울 300곳 정리 — 4언어 검수 및 메뉴 보강 배치 4
**Date:** 2026-10-14 · **DB:** Neon Staging `br-autumn-pine-b36z3utm` ONLY  
**GitHub:** Draft PR #9 `feature/db-quality-release-v1`  
**No change:** Neon Production, Render production/preview, original source names, Google API usage, photos or ratings.

## 이번 실행 기록
1. 기존 검수대기 14곳 중 **13곳**의 한국어·영어·일본어·중국어 문장·출처·메뉴 명칭을 확인하고 Stage `approved`로 전환. 52 locale records `review -> published`. 한국어 원본과 공개 명칭을 비교하면서 부정확한 중문/일문 상호 로마자·발음을 수정.
2. **콘크리트 팔레트**: 메뉴 자료는 있지만 `옥수수빙수`/`우유팥빙수` 가격이 출처별 19,000원 대 21,000원으로 달라 기존 관측을 보존하고 `review`로 유지.
3. **제주 굴 보쌈** (수표로20길 34) 공개 지점·주소·메뉴 자료 대조 → 굴보쌈 대(44,000원), 족발 대(44,000원), 족발+보쌈(45,000원), 아구찜 소(35,000원), **4개 메뉴 × 4언어**, 4개 언어 식당 설명, Stage 승인.
4. **1358** (돈화문로8길 26) 공개 커피 메뉴와 관측가격 2,500원, 4개 언어 소개문을 `review`로 작성. 온라인 영업시간(08:30~09:00)이 이상하므로 현재 영업 여부 확인 전 `approved` **아님**.
5. **이문 설농탕** (우정국로 38-13), **킨토토 혜화점** (창경궁로 248-4), **진아춘 광화문점** (새문안로 92), **영춘옥** (돈화문로5가길 13): 총 메뉴 12개(각 3개), 출처 확인 가격, 모든 4개 언어, 식당별 4개 언어 소개문 `approved`.
6. 전체 300곳 일감/QA CSV 스냅샷을 현 DB에서 다시 생성.

## 누적 검증값 (Staging)

| 항목 | 1차 상태 | 이번 종료 시점 |
|---|---:|---:|
| 선정 식당 | 300 | **300** |
| Stage 승인 식당 | 9 | **27** |
| 공개된 4언어 장소 설명 | 9곳 | **27곳 (108행)** |
| 검증 근거 메뉴가 있는 식당 | 27 | **33** |
| 출처·메뉴 등록 | 89 | **106개** |
| 가격 기입된 메뉴 | 86 | **103개** |
| 메뉴 4언어명 누락 | 0 | **0** |
| 메뉴 출처 누락 | 0 | **0** |
| Stage 보류 | 2 | **2** |
| Google 예산 DB에 잡힌 호출 | 0 | **0** |

참고: 기존 등록 콘텐츠의 검증은 **지점 주소와 공개 메뉴 자료 교차 대조** 수준이다. 사용자 현장방문/사업주 실시간 메뉴·가격 확인을 뜻하지 않음.

작업 대기열: 지점별 메뉴 찾기 258곳, 신원/분류 심사 11곳, 번역 심사 2곳, 폐업/정체성 보류 2곳, Stage 승인 완료 27곳.

## 대조 근거

- 동성각: https://www.tabling.co.kr/place/677cc7a066de5f0698751064 / https://polle.com/place/2Pinw8/%EB%8F%99%EC%84%B1%EA%B0%81
- 함흥곰보냉면: https://www.tabling.co.kr/place/677ccaa266de5f06987ba6b9 / https://polle.com/place/19i7QA/%ED%95%A8%ED%9D%A5%20%EA%B3%B0%EB%B3%B4%EB%83%89%EB%A9%B4
- 콘크리트 팔레트: https://www.tabling.co.kr/place/677cd21566de5f0698890f93 (각 빙수 일부 19,000원) / https://www.diningcode.com/profile.php?rid=JakX0yyEzkll (21,000원)
- 제주 굴 보쌈: https://www.diningcode.com/profile.php?rid=GjDI9LnISr49 / https://dokdokplace.kr/stores/i2/i201/i20103/seoul/jongno-gu/%EC%A2%85%EB%A1%9C1.2.3.4%EA%B0%80%EB%8F%99/
- 1358: https://www.diningcode.com/profile.php?rid=8zV1q7lmULH6 / https://www.koobig.com/494496
- 이문 설농탕: https://www.tabling.co.kr/place/677cc7a066de5f0698751182
- 킨토토 혜화점: https://www.tabling.co.kr/place/677cd4f466de5f06988e5511 / https://polle.com/place/2o2bC8/%ED%82%A8%ED%86%A0%ED%86%A0
- 진아춘 광화문점: https://polle.com/place/1wJLsu/%EC%A7%84%EC%95%84%EC%B6%98 / https://new.emmaru.com/matzip/matzip.do?code=M191016095556518854I&f=1&s=1&t=1
- 영춘옥: https://www.tabling.co.kr/place/677cc7a166de5f06987511c8 / https://polle.com/place/1rvDjR/%EC%98%81%EC%B6%98%EC%98%A5

## 안전/가용성 정책
- 새 메뉴 가격은 출처·확인일과 함께 `whateato_menu_price_observations_v1`로 보관. 최신 가격을 보증하지 않음.
- 4언어 문장은 메뉴·지점과 일치하는 자료를 바탕으로 자체 작성한 문장. 제3자 상세 페이지의 리뷰·사진·별점은 복제하지 않음.
- Google Places/Translation을 이번 작업에 **호출하지 않았으므로 내부 사용량 0회**, 기존 API 게이트는 OFF 유지.
- 모든 Stage 승인은 Production 서비스에 공개된 것이 아니다. **300곳 전체 공개 품질 Gate는 여전히 BLOCKED**.
- 4개 언어 UI 렌더/모바일 검증은 전체 300곳 대상 완료되지 않았고, 기존 실패 CI도 별도 해결 필요.

## 재현 파일
- `sql/staging_release_300_locale_menu_review_batch_26.sql`
- `sql/staging_release_300_locale_review_promotion_batch_27.sql`
- `sql/staging_release_300_jeju_gulbossam_batch_28.sql`
- `sql/staging_release_300_1358_cafe_menu_locale_review_batch_29.sql`
- `sql/staging_release_300_next_four_tourist_venues_batch_30.sql`
- `data/release-cohort-300-v1-review.csv`
- `data/release-cohort-300-v1-work-queue.csv`

**Next:** address-matched menu source research for 258 venues, vet 11 identity conflicts, 2 incomplete venue locales; separately fix CI and prepare controlled deployment only when owner approves rollout.
