-- Staging-only, branch/address-verified published menu list. No prices asserted.
INSERT INTO restaurant_menus(id,restaurant_id,price_krw,position,publication_state,evidence_ref)
VALUES
('6d0bd7f0-4d24-48e1-98c2-74fd19020621'::uuid,'b90a773c-e405-423b-ae44-7b340501b024'::uuid,NULL,10,'published','https://www.tabling.co.kr/place/677ccac066de5f06987be562 | https://polle.com/place/40IXKT/온더보더 | cross-checked 2026-10-14 at 종로3길 17 D타워'),
('7e3bc2ac-572b-4779-9b16-7db3c0b6425e'::uuid,'b90a773c-e405-423b-ae44-7b340501b024'::uuid,NULL,11,'published','https://www.tabling.co.kr/place/677ccac066de5f06987be562 | https://polle.com/place/40IXKT/온더보더 | cross-checked 2026-10-14 at 종로3길 17 D타워')
ON CONFLICT(id) DO NOTHING;

INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
VALUES
('6d0bd7f0-4d24-48e1-98c2-74fd19020621'::uuid,'ko','풀드포크 타코'),
('6d0bd7f0-4d24-48e1-98c2-74fd19020621'::uuid,'en','Pulled pork taco'),
('6d0bd7f0-4d24-48e1-98c2-74fd19020621'::uuid,'ja','プルドポークタコス'),
('6d0bd7f0-4d24-48e1-98c2-74fd19020621'::uuid,'zh-CN','手撕猪肉塔可'),
('7e3bc2ac-572b-4779-9b16-7db3c0b6425e'::uuid,'ko','콰트로 화이타'),
('7e3bc2ac-572b-4779-9b16-7db3c0b6425e'::uuid,'en','Quattro fajitas'),
('7e3bc2ac-572b-4779-9b16-7db3c0b6425e'::uuid,'ja','クアトロ・ファヒータ'),
('7e3bc2ac-572b-4779-9b16-7db3c0b6425e'::uuid,'zh-CN','四拼法吉塔')
ON CONFLICT(menu_id,locale) DO NOTHING;

UPDATE restaurant_menus m SET publication_state='published',
 evidence_ref=CASE WHEN m.restaurant_id='a5271953-1b28-4d31-8c53-52d79d7641b9'::uuid
 THEN 'https://www.tabling.co.kr/place/677cd68866de5f069891271a | https://polle.com/place/383gF3/소수헌 | cross-checked 2026-10-14 at 만리재로21길 8' ELSE 'https://www.tabling.co.kr/place/677ccac066de5f06987be562 | https://polle.com/place/40IXKT/온더보더 | cross-checked 2026-10-14 at 종로3길 17 D타워' END
WHERE m.publication_state='draft'
AND m.id IN (
 '5e61cf07-aaed-4200-9188-18b2f82faafb'::uuid,
 '1de05f65-bb3c-423f-a8fd-aa8ec1cbf4e7'::uuid,
 '9ea27556-3ae2-4439-a3ad-d5b0c4ca8611'::uuid
)
AND (SELECT count(DISTINCT ml.locale) FROM restaurant_menu_localizations ml
 WHERE ml.menu_id=m.id AND ml.locale IN ('ko','en','ja','zh-CN')
 AND nullif(btrim(ml.name),'') IS NOT NULL)=4;
