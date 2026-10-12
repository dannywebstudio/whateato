# WhatEatO LOCALDATA Import v1.0 — 운영 가이드

## 현재 상태
- 영업 데이터 676,107행만 포함된 검증 CSV는 GitHub Actions 실행 #38217967995의 whateato-active-only artifact에 보관한다.
- 원본 공개 데이터 2,303,303행 중 폐업 1,627,196행을 제거했다.
- 정제본 SHA-256: b3aa8b1c6e8ea108bd6ecbd06a4f46c1211d2c996265384570e0e0b1d207deec
- 정제본 파일 크기: 254,159,405바이트, 인코딩 UTF-8-SIG.
- 운영 Neon에는 restaurants, restaurant_source_refs 및 PostGIS가 적용돼 있다. 이 마이그레이션은 본 PR에 포함되지 않았으므로 기존 PR #1의 001_core.sql / 002_verified_search.sql로 버전 관리한다.

## 데이터 처리
- 상세영업상태명 == 영업인 기록만 대상으로 한다. 폐업 기록은 무조건 제외.
- 원본 관리번호에 localdata: 접두어를 붙여 기존 sbiz_source_key 필드에 저장. 같은 출처의 중복 관리번호는 한 번만 저장.
- restaurant_source_refs.provider = localdata, source_record_id = 원본 관리번호.
- 사업장명, 도로명/지번주소, 업태구분명, 지역, 좌표만 적재. 전화번호 등 다른 39개 원본 필드는 DB에 저장하지 않음.
- 좌표는 LOCALDATA EPSG:5174 → WGS84 EPSG:4326. 결측/이상 좌표는 null 유지: 주소 검색은 가능하되 지도 핀에는 표시하지 않음.
- 공적 인허가상 영업은 실시간 문 열림을 뜻하지 않는다. 영업시간 검증 전까지 open-now 판단 금지.
- 검증 근거 없는 AI/고객 평점은 저장하지 않는다.

## 실제 실행 절차
1. GitHub PR 코드를 검토하고 merge. workflow_dispatch는 보통 workflow가 기본 브랜치에 존재할 때 활성화된다.
2. GitHub → https://github.com/dannywebstudio/whateato/settings/secrets/actions → New repository secret:
   Name = NEON_DATABASE_URL
   Value = Neon 콘솔의 WhatEatO 프로젝트 / neondb production connection string (SSL 사용).
   이 값을 채팅, 이슈, Actions 로그, 소스코드에 붙이지 말 것.
3. GitHub Actions → WhatEatO LOCALDATA Import v1 → Run workflow:
   sample_rows = 10000
   commit_to_neon = false : 안전한 검증만 진행 (기본값)
   commit_to_neon = true : 실제 DB 쓰기. 10,000행 상한 및 CSV SHA 검증을 강제.
4. 첫 10,000행 시험 적재 후 Neon에서 아래를 조회한다.

~~~sql
SELECT COUNT(*) FROM restaurants
WHERE sbiz_source_key LIKE 'localdata:%'
  AND publication_status='published'
  AND business_status='active';

SELECT COUNT(*) FROM restaurants
WHERE sbiz_source_key LIKE 'localdata:%'
  AND latitude IS NOT NULL AND longitude IS NOT NULL;

SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;
~~~

5. 시험 적재가 성공하기 전 전체 676,107건 자동 적재를 금지한다. 이후 용량, 검색 속도 및 중복 검증 후 별도 승인.

## 중요: 정제본 artifact 수명
- GitHub Actions #38217967995 결과물은 retention-days: 7이므로 만료될 수 있다.
- 별도 정제본이 ChatGPT Library /WhatEatO/WhatEatO_active_only_verified.zip 에 보관돼 있다.
- Artifact가 만료되면 데이터 입력 방식을 갱신해야 한다 (비공개 Google Drive 인증 또는 장기보관 버킷).
- CSV는 GitHub 서버 임시 디스크로 다운로드되며 어떤 CSV 원본도 저장소 commit에 포함되지 않는다.

## QA 통과 기준
- 안전장치 단위 테스트 통과.
- GitHub 정제본 SHA-256 검증.
- 10,000행 dry-run 성공 및 보고서.
- DB commit 기본 비활성화, commit 시 secret/무결성/상한 검사.
- 실제 Neon 적재는 별도 수동 실행으로 commit_to_neon=true 지정 시에만 수행.
