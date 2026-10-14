-- READ ONLY. Verification-state gate for 300-cohort release tag quality.
-- Rules: every venue has at least one verified location tag, proposed is NOT shown,
-- every tag code has complete ko/en/ja/zh-CN translations, mood labels must
-- have specific external sources (and never inherit permit category guesses).
WITH cohort AS (
 SELECT c.restaurant_id,COUNT(a.tag_code) FILTER (WHERE a.verification_state='verified') verified_count,
 COUNT(a.tag_code) FILTER (WHERE a.verification_state='proposed') proposal_count
 FROM whateato_release_cohort_300_v1 c LEFT JOIN restaurant_tag_assignments a
 ON a.restaurant_id=c.restaurant_id GROUP BY c.restaurant_id
), vocab AS (
 SELECT t.code,COUNT(DISTINCT l.locale) n
 FROM restaurant_tags t LEFT JOIN restaurant_tag_localizations l ON l.tag_code=t.code
 GROUP BY t.code
), violations AS (
 SELECT COUNT(*) FILTER(WHERE a.verification_state='verified' AND
 (a.evidence_ref IS NULL OR a.verified_at IS NULL)) invalid_verified,
 COUNT(*) FILTER(WHERE a.verification_state='proposed' AND a.verified_at IS NOT NULL) falsely_verified,
 COUNT(*) FILTER(WHERE a.verification_state='verified' AND a.tag_code IN(
 'date_night','quiet_vibe','cozy_vibe','casual_vibe','lively_vibe','traditional_vibe',
 'heritage_restaurant','hanok_interior','fine_dining','group_meals',
 'spacious_interiors','exotic_vibe','business_meal','after_work')
 AND COALESCE(a.evidence_ref,'') NOT LIKE 'https://%') unsourced_subjective_ambience
 FROM restaurant_tag_assignments a JOIN whateato_release_cohort_300_v1 c ON c.restaurant_id=a.restaurant_id
)
SELECT (SELECT COUNT(*) FROM cohort) cohort_count,
 (SELECT COUNT(*) FROM cohort WHERE verified_count>0) cohort_with_verified_tag,
 (SELECT COALESCE(SUM(verified_count),0) FROM cohort) verified_links,
 (SELECT COALESCE(SUM(proposal_count),0) FROM cohort) proposed_hidden_links,
 (SELECT count(*) FROM vocab) tag_codes,
 (SELECT count(*) FROM vocab WHERE n=4) four_language_tag_codes,
 invalid_verified,falsely_verified,unsourced_subjective_ambience,
 CASE WHEN (SELECT COUNT(*) FROM cohort)=300
 AND (SELECT COUNT(*) FROM cohort WHERE verified_count>0)=300
 AND (SELECT count(*) FROM vocab WHERE n<4)=0
 AND invalid_verified=0 AND falsely_verified=0
 AND unsourced_subjective_ambience=0 THEN 'PASS' ELSE 'FAIL' END tag_data_gate
FROM violations;
