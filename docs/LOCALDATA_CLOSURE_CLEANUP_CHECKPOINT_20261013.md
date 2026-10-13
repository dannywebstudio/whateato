# LOCALDATA closure cleanup checkpoint — 2026-10-13
- Neon STAGING contains 10,000 restaurants. All currently have `business_status=active`. This status is **not fresh official proof**.
- No confirmed current official 폐업일자/인허가취소일자 records for the previously flagged exact permit IDs have been retrieved; zero restaurant records deleted.
- Government LOCALDATA states that 최종수정일자 is NOT a closure date and historic closure/cancellation dates can contain errors: https://www.localdata.go.kr/devcenter/bbs/devQnaDetail.do?bbsId=B0000100&menuNo=20003&nttId=1276
- Implemented `scripts/audit_localdata_closures.mjs` for **read-only** exact permit number reconciliation between fresh UTF-8 LOCALDATA CSV and catalog export. Produces `localdata-closure-audit.json`; does not contact or alter DB.
- Source format example: official CSV columns `관리번호,상세영업상태명,폐업일자,소재지전체주소`. Catalog export: `id,sbiz_source_key,name_ko,road_address_ko`.
- Source key must match exactly (catalog `localdata:<관리번호>`). Multiple official rows per key are ambiguous, no automatic approval. Only verified 폐업/취소/말소/만료 status with explicit matching closure/cancellation date becomes a candidate. Relocation cases require distinct official permit evidence and dates.
- No irreversible delete script has been executed. A second confirmation step should ensure dependent visitor reviews and audit logs are preserved, with a transactionally consistent targeted-delete plan.
- No Google/Naver registration evidence required once official closure and exact permit are confirmed.
