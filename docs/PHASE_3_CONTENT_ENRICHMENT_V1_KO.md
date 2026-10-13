# WhatEatO Phase 3 — 근거 기반 식당 콘텐츠 수집·검토·전달 파이프라인 v1
2026-10-12 · Draft PR #6 · DESIGN LOCK v1.0 유지

## 이번 실제 구현
1. `scripts/enrichment_v1.mjs`
   - `inspect <packet.json>`: 문서 구조, 4개 언어, 원본 UUID, 정확한 상호명/주소 대조를 위한 필드, 출처 HTTPS URL, 출처 확인 날짜(365일 이내), 메뉴 가격 타입, 사진 저장키, 증빙 URL, 평가 점수/방법론을 검증. DB 접속·수정하지 않음.
   - `stage <packet.json>`: 전용 **staging DB**에서만 트랜잭션으로 리뷰 대기 데이터를 등록. Neon 브랜치 ID `br-autumn-pine-b36z3utm` 확인 + 명시적인 환경변수 2개 필요. 운영 DB를 대상으로 실행할 수 없도록 거부.
   - 원본 등록된 `restaurants.id`, `name_ko`, `road_address_ko`가 **정확하게 동일하지 않으면 트랜잭션 롤백**.
   - 기존 `published` 번역·메뉴, `verified` 태그, `approved` 편집 별점·사진은 덮어쓰거나 강등하지 않음.
   - 새 번역은 `review`, 생활 태그는 `proposed`, 메뉴는 `draft`, 사진은 `pending`/`draft`, 별점은 `review`로 저장. 신규 공개 데이터 **0** 유지.
   - 같은 메뉴를 두 번 stage 해도 결정적 메뉴 ID 사용으로 중복 생성 방지.
2. `src/app/api/v1/images/[id]/route.ts`: 서버 소유 이미지 저장소의 승인 사진만 안전하게 제공.
   - `rights_status='approved'`·`rights_verified_at IS NOT NULL`·사용권 증빙·공개 상태·식당 공개 상태 모두 필요.
   - 내부 `/api/v1/images/{uuid}` 주소만 클라이언트에 제공; 실제 저장키나 절대경로 노출 없음.
   - 서버 환경변수 `WHATEATO_MEDIA_ROOT`가 절대 경로로 설정돼야 사용 가능.
   - 경로 이탈, 심볼릭 링크로 외부 경로 접근, 비정상 확장자/SVG, 이미지 시그니처 불일치, 8MB 초과 파일 등 차단.
   - 이용 권한 취소가 바로 반영되도록 응답은 `Cache-Control: no-store`.
   - **실제 사진 파일·스토리지 계정은 아직 미확보**; 이번 CI에서는 합성 1×1 PNG만 사용.
3. `scripts/test_enrichment_v1.mjs`을 로컬 PostgreSQL CI에 추가.
   - 검증 실패, 아이덴티티 불일치 롤백, 검증·승인된 콘텐츠 원형 보존, 중복 없는 다시 적용, 공개되지 않은 별점/태그/메뉴/사진 시험.
4. `scripts/test_phase2_http.mjs`에 실제 PNG 반환과 미승인 이미지 요청 404 검사 추가.
5. 두 개의 실명 식당 연구 패킷을 PR에 생성. 4개 언어 초안, 메뉴 이름·원문 정보 출처 URL 기입. **사진 사용권 없음 / 독립 별점 없음 / 가격 최신성 검증 전이므로 가격 없음.**
6. `scripts/report_enrichment_progress.mjs`: 첫 20곳 중 연구 패킷 완료·남은 개수 검사, 상호명/주소 원장과 대조.

## 실제 식당 연구 대상 / 자료 유의
- `온더보더 광화문 D타워점` UUID `b90a773c-e405-423b-ae44-7b340501b024`.
  출처: [TableNJoy 매장 안내](https://www.tablenjoy.com/store/S3942999). 식당 메뉴 및 위치를 확인하는 연구 참고 자료로만 사용했으며, 사진·별점·상업적 리뷰의 재사용 허가가 있는 것은 아님.
- `호호식당 대학로` UUID `58a03e79-6fe5-4076-a097-367caf150dec`.
  출처: [테이블링 매장 정보](https://www.tabling.co.kr/place/677ccb2966de5f06987cbde8), [핫플 메뉴 안내](https://www.hotple.com/place/%ED%98%B8%ED%98%B8%EC%8B%9D%EB%8B%B9-%EB%8C%80%ED%95%99%EB%A1%9C-%EA%B1%B0%EB%A6%AC-%EC%9D%BC%EC%8B%9D-85806567). 둘 다 제3자 게재 자료이므로 상호·지점·메뉴 최신성, 영업 상태 및 저작권에 대한 별도 인적 확인 필요.
- 4개 언어 설명은 우리 자체 요약·번역 **미승인 초안**이며 실제 사용자에게 공개하지 않음.
- `data/enrichment-queue/phase25-first20-20261012.json`의 20개는 전부 원래 `hold` 상태.
- **현재 연구 패킷 2개/20개**, 승인·공개된 신규 평가 별점·사진·태그·메뉴는 **0개**. 자동 승인·대량 공개는 구현하지 않았음.

## 검사 실행
```bash
node scripts/enrichment_v1.mjs inspect data/enrichment-packets/review/on-the-border-gwanghwamun-20261012.json
node scripts/enrichment_v1.mjs inspect data/enrichment-packets/review/hoho-daehangno-20261012.json
node scripts/report_enrichment_progress.mjs
```

DB에 검토 초안을 넣는 작업은 별도 Neon staging 접속 권한, 명시적 브랜치 지정 및 비밀 DB URL이 필요함:
```bash
# 로컬 셸의 비밀 환경변수: 커밋·공개하지 말 것
export WHATEATO_ENRICHMENT_STAGE_ACK=I_ACK_STAGING_ONLY
export WHATEATO_EXPECTED_NEON_BRANCH_ID=br-autumn-pine-b36z3utm
# DATABASE_URL=해당 Neon staging 접속 문자열 (직접 로컬 비밀로 설정)
node scripts/enrichment_v1.mjs stage data/enrichment-packets/review/on-the-border-gwanghwamun-20261012.json
```
두 번째 명령은 네트워크로 실제 staging DB에 쓰므로 검증 도구의 현재 연결/권한과 대상 분리 상태를 먼저 확인할 것.

## 2026-10-12 실데이터 Neon staging 검토 초안 반영 결과
- 연결 브랜치: `br-autumn-pine-b36z3utm` (**staging**, 운영 브랜치 아님). SQL 트랜잭션 내에서 `current_setting('neon.branch_id',true)` 확인, 식당 UUID·상호명·주소·공개/인허가 상태 일치 검사 통과.
- **온더보더 광화문 D타워점, 호호식당 대학로 2개 식당**에 `restaurant_localizations` 8행 (각 한국어/영어/일본어/중국어), 모두 `publication_state=review`, `verified_at=NULL`.
- `restaurant_menus` 4행 / 한국어 메뉴명 4행, 모두 `publication_state=draft`, 가격 및 가격 검증 시각 NULL.
- 검증·승인된 새 태그, 사진, 독립 별점: **0건**. 이번 단계에서 공개 전환 **0건**.
- 별도 `production` 브랜치 재조회: 총 식당 **10,000건 유지**, 두 연구 대상의 신규 번역 **0행**, 메뉴 **0행**. 운영 브랜치에 해당 초안 변경 없음.
- 이번 staging 검토 초안은 웹사이트 공개 정보가 아니고 독립적인 사실/저작권 검토 절차 전까지 `review`/`draft` 상태를 유지함.


## 다음 Phase 3 작업
- 나머지 **18/20곳**의 공식 메뉴/지점/주소·영업 상태 연구 및 출처 대조.
- 지점별 대표 사진 **권리 확인 → 저장소 업로드 → 관리자 승인** 시스템. 웹 크롤링한 타사 사진을 임의 저장·재배포 금지.
- 별점 산정의 독립 편집 기준 및 human review QA; 외부 플랫폼의 별점을 WhatEatO 독립 평가로 바꾸지 않음.
- 사진 렌더링 및 실제 지도 지도 타일은 디자인 승인·제공자 계약 확인 후 연결. 잠금된 홈페이지/헤더/검색 박스/전역 CSS는 여전히 변경하지 않음.
- Hostinger/Vercel 스테이징 배포 및 운영 도메인 변경은 아직 하지 않음.
