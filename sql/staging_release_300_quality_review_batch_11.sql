-- Staging only: these are NOT non-food deletion reasons.
-- Identical addresses but mismatched consumer category/source interpretations
-- are held for manual consumer-label QA. No original permit is overwritten.
INSERT INTO restaurant_data_quality_reviews
(restaurant_id,issue_code,severity,review_state,evidence_ref,evidence_summary)
VALUES
 ('cf066202-160e-47fe-a8b2-38697508b857'::uuid,
  'PERMIT_CATEGORY_CONFLICT','medium','pending',
  'https://www.tabling.co.kr/place/677cd44466de5f06988d183d',
  '카린지&린가네 광화문점: 인허가 업종은 경양식, 소비자 공개 목록은 일식/이자카야로 소개. 원본 보존하고 표시 분류 검토 필요.'),
 ('2c876d08-ee29-47b9-85c3-304d1f7d5b48'::uuid,
  'MENU_SOURCE_NEEDS_CURRENT_VERIFICATION','low','pending',
  'https://obliviate.tistory.com/entry/%EC%A2%85%EA%B0%81%EC%A2%85%EB%A1%9C3%EA%B0%80-%ED%95%B4%EC%82%B0%EB%AC%BC-%EC%B5%9C%EA%B3%A0-%EB%A7%9B%EC%A7%91-%EB%8F%84%EB%A7%88',
  '도마 종로16길 32-6: 2024 블로그에서 제철 회와 굴튀김 확인되나 현행 메뉴 일치 확인 부족. 메뉴 미등록 유지 및 추가 검수.')
ON CONFLICT (restaurant_id,issue_code) DO NOTHING;
