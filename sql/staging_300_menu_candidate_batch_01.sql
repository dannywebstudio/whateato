-- 2026-10-14 official brand and matching-branch sources, staging only.
-- The five candidate dishes are NOT approved public menus. All remain pending,
-- branch_verified=false, price_krw=NULL, locale names editorial drafts.
INSERT INTO whateato_release_menu_candidate_v1
(restaurant_id,menu_name_ko,localized_names,source_url,source_kind,source_scope,source_checked_on,branch_verified,review_state,price_krw,evidence_note)
VALUES
('58a03e79-6fe5-4076-a097-367caf150dec','로스가츠정식',
 '{"ko":"로스가츠정식","en":"Pork loin cutlet set","ja":"ロースカツ定食","zh-CN":"日式炸猪里脊套餐"}'::jsonb,
 'https://hohosikdang.com/%EB%A9%94%EB%89%B4-%EC%86%8C%EA%B0%9C/','official_brand','brand','2026-10-14',false,'pending',NULL,
 '공식 브랜드 메뉴 기재와 대학로점 공식 지점 존재는 확인. 지점별 현재 취급 여부는 미확인; 번역은 편집 초안. 가격 미확인.'),
('58a03e79-6fe5-4076-a097-367caf150dec','사케동',
 '{"ko":"사케동","en":"Salmon rice bowl","ja":"サーモン丼","zh-CN":"三文鱼盖饭"}'::jsonb,
 'https://hohosikdang.com/%EB%A9%94%EB%89%B4-%EC%86%8C%EA%B0%9C/','official_brand','brand','2026-10-14',false,'pending',NULL,
 '공식 브랜드 메뉴에 등재. 대학로점 현재 제공 확인 전 게시 금지. 4언어 번역은 검수 필요.'),
('58a03e79-6fe5-4076-a097-367caf150dec','오므라이스',
 '{"ko":"오므라이스","en":"Omurice (omelet rice)","ja":"オムライス","zh-CN":"蛋包饭"}'::jsonb,
 'https://hohosikdang.com/%EB%A9%94%EB%89%B4-%EC%86%8C%EA%B0%9C/','official_brand','brand','2026-10-14',false,'pending',NULL,
 '공식 브랜드 메뉴에 등재. 지점별 메뉴 차이 가능성, 가격은 비워둠. 4언어 명칭 수동 QA 필요.'),
('b90a773c-e405-423b-ae44-7b340501b024','풀드포크 타코',
 '{"ko":"풀드포크 타코","en":"Pulled pork taco","ja":"プルドポークタコス","zh-CN":"手撕猪肉塔可"}'::jsonb,
 'https://www.diningcode.com/profile.php?rid=rhCqlarHAQHc','third_party','branch','2026-10-14',false,'pending',NULL,
 '해당 지점 소개의 메뉴 참고. 공식 지점/현행 판매 재확인 전 게시 금지. 공개 가격은 반영하지 않음.'),
('b90a773c-e405-423b-ae44-7b340501b024','콰트로 화이타',
 '{"ko":"콰트로 화이타","en":"Quattro fajitas","ja":"クアトロ・ファヒータ","zh-CN":"四拼法吉塔"}'::jsonb,
 'https://www.diningcode.com/profile.php?rid=rhCqlarHAQHc','third_party','branch','2026-10-14',false,'pending',NULL,
 '해당 지점 소개에서 발견한 메뉴. 명칭·판매상태와 번역 QA 필요. 공식 확인 없으므로 검토 대기. 가격 비움.')
ON CONFLICT (restaurant_id,menu_name_ko) DO NOTHING;
