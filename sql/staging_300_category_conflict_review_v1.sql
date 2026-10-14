-- Stage-only pending review: official restaurant category and permit category disagree.
INSERT INTO restaurant_data_quality_reviews
(restaurant_id,issue_code,severity,review_state,evidence_ref,evidence_summary)
VALUES ('58a03e79-6fe5-4076-a097-367caf150dec',
'PERMIT_CATEGORY_CONFLICT','medium','pending',
'https://hohosikdang.com/%EB%B8%8C%EB%9E%9C%EB%93%9C-%EC%86%8C%EA%B0%9C/',
'공식 호호식당 브랜드 설명은 대학로점 일본 가정식 전문점이라고 안내하지만 인허가 DB는 한식으로 분류됨. 소비자용 업종명 변경은 원본 유지 및 식당 운영자/현장 검증 후 수동 승인할 것.')
ON CONFLICT(restaurant_id,issue_code) DO NOTHING;
