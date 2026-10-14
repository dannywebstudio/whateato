-- Staging only; reversible quality holds. 58 identity unresolved -> menu drafts only.
INSERT INTO restaurant_data_quality_reviews
(restaurant_id,issue_code,severity,review_state,evidence_ref,evidence_summary)
VALUES
('d4157100-9e67-47a7-bd8b-c10912f6f7ec'::uuid,'POSSIBLE_CLOSURE','high','pending','https://polle.com/place/1QffVL/%EC%9B%90%EC%A1%B0%20%ED%95%A8%ED%9D%A5%EB%83%89%EB%A9%B4','종로 창경궁로13길 16 원조 함흥냉면 공개 지점 자료에는 폐점 및 2020년 영업 종료 방문 후기 다수. 원본 active 인허가와 충돌하므로 재개점 여부를 확인할 때까지 선정 대상 공개 보류.'),
('eeaed204-e007-4671-a406-57b62801f273'::uuid,'NAME_IDENTITY_MISMATCH','high','pending','https://www.placeview.co.kr/id/MjcxNTk2MjUg','도산가든 인허가 주소 삼일대로17길 19에 다른 이름의 식당(만족오향족발) 자료가 존재. 동일 건물 다른 층/시점 가능성 있어 정체성 재검증 전 공개 보류.'),
('47e72d60-a8cd-4fe6-8c6a-94a49e9b7383'::uuid,'NAME_IDENTITY_MISMATCH','medium','pending','https://www.tabling.co.kr/place/677cc7a066de5f06987510f0','허가 상호 시조명동진성닭칼국수와 동일 주소 현 매장 표기 명동 닭한마리 시조점의 법적 동일성/상호 변경 확인이 필요해 식당 설명·메뉴 공개 승인 전 별도 QA.'),
('3954efcf-50a7-4c7d-b089-44252662f74c'::uuid,'PERMIT_CATEGORY_CONFLICT','medium','pending','https://yeokjeonfnc.com/index.html','역전할머니맥주 종로3가역점 동일 주소 브랜드 메뉴는 호프·안주이지만 인허가 카테고리는 경양식. 소비자 카테고리 검수 필요.')
ON CONFLICT (restaurant_id,issue_code) DO NOTHING;

UPDATE whateato_release_cohort_300_v1 c
SET review_state='hold',reviewer_note='Source conflict requires identity / reopening verification. Reversible release hold, never delete.',reviewed_at=now()
WHERE c.restaurant_id IN('d4157100-9e67-47a7-bd8b-c10912f6f7ec'::uuid,'eeaed204-e007-4671-a406-57b62801f273'::uuid)
AND c.review_state='pending'
AND EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q
 WHERE q.restaurant_id=c.restaurant_id AND q.review_state='pending'
 AND q.issue_code IN('POSSIBLE_CLOSURE','NAME_IDENTITY_MISMATCH'));

UPDATE restaurant_menus SET publication_state='draft'
WHERE restaurant_id='47e72d60-a8cd-4fe6-8c6a-94a49e9b7383'::uuid
AND id IN('00000000-0000-4000-8000-000000009711'::uuid,'00000000-0000-4000-8000-000000009712'::uuid,'00000000-0000-4000-8000-000000009713'::uuid)
AND publication_state='published';
