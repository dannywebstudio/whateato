-- Stage-only, non-destructive review queue for suspicious non-food labels.
-- Does not hide/delete restaurants or change business/publication status.
-- The keyword is NOT evidence of non-food operation; manual proof is required.
-- Never execute against the production branch without separate owner approval.
INSERT INTO restaurant_data_quality_reviews
 (restaurant_id, issue_code, severity, review_state, evidence_ref, evidence_summary)
SELECT r.id,'OTHER','medium','pending',NULL,
 'Phase1 검토 후보: 상호명에 문화시설/사무소/학원 등 키워드 포함. 인허가 업종만으로 비음식점 확정 불가. 공식 매장·영업자료 및 주소 확인 전에는 삭제하거나 숨기지 않음.'
FROM restaurants r
WHERE r.name_ko ~* '(문화공간|전시관|미술관|공연장|스터디카페|독서실|노래방|사진관|공유오피스|문화센터|학원|사무소|사무실|헬스장|피트니스|부동산|복지관)'
ON CONFLICT (restaurant_id,issue_code) DO NOTHING;
