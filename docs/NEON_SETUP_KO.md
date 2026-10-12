# WhatEatO Neon Free — 독립 DB 연결 매뉴얼

1. Neon에서 **WhatEatO 전용 신규 프로젝트**를 생성한다. DB 지역은 앱/API와 가능한 가까운 곳으로 설정한다.
2. Neon SQL Editor에서 `db/migrations/001_core.sql` 전체를 한 번 실행한다.
3. 연결 문자열은 GitHub 저장소에 붙여넣거나 커밋하지 않는다. 배포 앱의 **서버 전용 환경변수 `DATABASE_URL`**에 설정한다.
4. 최초에는 사용자 PC에서 **읽기 전용 샘플 검사**:
   ```powershell
   python scripts/import_sbiz_lite.py --file "C:\WhatEatO\data\sbiz.csv" --limit 10000
   ```
   원본 형식이 cp949라면 `--encoding cp949`. 이 수집기는 **소상공인 상가정보(SBIZ) CSV 전용**이다. 행정안전부 인허가 CSV를 이 파일로 넣지 않는다.
5. 원본 컬럼이 확인되고 Neon 전용 DB에 연결한 후:
   ```powershell
   python -m pip install "psycopg[binary]>=3.2,<4"
   $env:DATABASE_URL = "<Neon dedicated database connection string>"
   python scripts/import_sbiz_lite.py --file "C:\WhatEatO\data\sbiz.csv" --limit 10000 --commit
   ```
   환경변수를 터미널에 입력할 때 화면 공유·명령 기록·로그 노출에 주의한다. 실제 비밀값을 채팅에 보내지 않는다.
6. Neon SQL Editor에서:
   ```sql
   SELECT COUNT(*) FROM restaurants;
   SELECT pg_size_pretty(pg_database_size(current_database())) AS db_total;
   SELECT pg_size_pretty(pg_total_relation_size('restaurants')) AS restaurant_table_and_indexes;
   SELECT name_ko,road_address_ko FROM restaurants ORDER BY updated_at DESC LIMIT 5;
   ```
7. 스토리지 사용량 확인 후만 적재량 확대한다. **원본 전체 700MB가 Neon Free 1GB에 들어간다고 보장하지 않는다.** 인덱스와 PostgreSQL 관리 공간 추가를 고려한다.
8. 실제 영업시간과 AI 평점은 이 CSV에 없다. 자료를 별도 검증해 `restaurant_hour_sources`, `restaurant_open_intervals`, `restaurant_ai_ratings`, `restaurant_rating_evidence`에 적재해야 한다. 임의의 별점·영업시간 삽입 금지.

## 검증 문구
- 영업시간 없는 경우: 영업시간 미확인
- 180일 넘게 검증되지 않은 경우: 영업시간 미확인
- 정규 시간 확인 시에만: 영업 중 추정 / 영업 종료 추정
- 최소 2개 독립 출처의 실제 음식 품질 평가 근거 + 검토 승인 후에만: AI 예비평점
- 방문객 별점과 AI 추정 점수는 절대 혼합하지 않는다.

## 운영 제한
현재 Hostinger **Premium**에서는 Node.js 서버앱을 직접 구동하지 못하므로, GitHub에 구현 코드를 저장해도 라이브 사이트의 DB 연결이 자동 완료되지는 않는다. Next.js 서버 호스팅 환경을 선택하거나 정적 프런트엔드 + 외부 서버리스 API 구조를 별도로 구현해야 한다.
