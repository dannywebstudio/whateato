-- STAGING ONLY: original permit data is retained. No deletions, no fabricated menu/address corrections.
INSERT INTO restaurant_data_quality_reviews(restaurant_id,issue_code,severity,review_state,evidence_ref,evidence_summary)
VALUES
('dc473b8f-d043-40e5-ad78-5ed7b4195354'::uuid,'PERMIT_CATEGORY_CONFLICT','medium','pending','https://www.tabling.co.kr/place/677cc7a066de5f0698751174','히말라야 종각점: 인허가 업종 경양식과 실제 인도·네팔 음식업소 안내가 일치하지 않음. 메뉴·주소는 대조했으나 소비자용 업종과 원본 인허가 분류 차이 검토 전 공개 승인 보류.'),
('40044245-014c-420f-8a10-0676d0c67807'::uuid,'PERMIT_CATEGORY_CONFLICT','medium','pending','https://www.diningcode.com/profile.php?rid=pnHPNYYQmnb1','진미통닭: 인허가 업종 분식과 공개된 통닭·치킨 전문 업종 간 표시 차이. 원본 코드는 그대로 유지하고 업종명 확인 후 공개 승인 판단.'),
('2db318a0-d504-4e2e-bf3e-c75d629b2418'::uuid,'PERMIT_CATEGORY_CONFLICT','low','pending','https://www.tabling.co.kr/place/677ccb5566de5f06987d0c86','카페 레이어드 안국: 원본 인허가 업종 기타이며 실제 소비자 노출 업종은 디저트카페. 정제된 표시 카테고리 승인 전 원본 기타를 그대로 보존하고 검토.'),
('7df70021-5624-4433-a94d-931f5cbb2741'::uuid,'BRANCH_ADDRESS_COLLISION','high','pending','https://www.diningcode.com/profile.php?rid=ygREB8CZWizP','부촌육회 인허가 원본 주소 종로 192-1과 공개된 부촌육회 본점 종로 200-12 불일치. 본점 및 별관 상호 혼동 위험. 지점 신원과 정확한 주소 확인 전 메뉴 입력·공개 승인 금지.')
ON CONFLICT(restaurant_id,issue_code) DO NOTHING;

UPDATE whateato_release_cohort_300_v1 c SET review_state='hold',
reviewer_note='Public Bucheon Yukhoe main-branch address 200-12 vs permit 192-1. Reversible release hold; do not copy menus from a different branch.',
reviewed_at=now()
WHERE restaurant_id='7df70021-5624-4433-a94d-931f5cbb2741'::uuid
AND review_state='pending'
AND EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q
WHERE q.restaurant_id=c.restaurant_id AND q.issue_code='BRANCH_ADDRESS_COLLISION' AND q.review_state='pending');
