-- Staging only. 카페르뷰, 서울 중구 퇴계로282, matches Daangn local
-- business owner-facing menu and independent Diningcode branch listing.
-- Americano only. Published menu name with translations, price deliberately null.
UPDATE restaurant_menus m
SET publication_state='published',
 evidence_ref='https://www.daangn.com/kr/local-profile/카페르뷰-w99efytsdisy/ | https://www.diningcode.com/profile.php?rid=o1lZedCMqair | address 퇴계로 282 verified 2026-10-14'
WHERE m.id='cce29e89-ee82-471b-b724-1f5bedf6d0a4'::uuid
 AND m.restaurant_id='855904c3-aaaf-404b-b9ca-755097e76444'::uuid
 AND m.publication_state='draft'
 AND (SELECT count(DISTINCT ml.locale) FROM restaurant_menu_localizations ml
 WHERE ml.menu_id=m.id AND nullif(btrim(ml.name),'') IS NOT NULL)=4;

UPDATE whateato_release_menu_candidate_v1 c SET
 branch_verified=true,review_state='verified_for_branch',
 evidence_note=c.evidence_note||' / independently checked branch 2026-10-14, no prices used'
WHERE c.restaurant_id='b90a773c-e405-423b-ae44-7b340501b024'::uuid
 AND c.menu_name_ko IN ('풀드포크 타코','콰트로 화이타')
 AND c.review_state='pending'
 AND EXISTS(SELECT 1 FROM restaurant_menus m JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id AND ml.locale='ko'
 WHERE m.restaurant_id=c.restaurant_id AND m.publication_state='published' AND ml.name=c.menu_name_ko);
