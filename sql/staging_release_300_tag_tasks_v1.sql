-- Staging view. Unverified claims must stay proposed until branch-level evidence is reviewed.
CREATE OR REPLACE VIEW whateato_release_cohort_tag_tasks_v1 AS
SELECT c.cohort_rank,c.restaurant_id,c.district,r.name_ko,
 COALESCE(stats.verified_count,0)::integer AS verified_tags,
 COALESCE(stats.proposed_count,0)::integer AS proposed_tags,
 COALESCE(stats.ambience_count,0)::integer AS atmosphere_verified,
 COALESCE(stats.food_count,0)::integer AS food_verified,
 CASE
  WHEN COALESCE(stats.food_count,0)=0 THEN 'verify_real_food_type_and_current_menu'
  WHEN COALESCE(stats.ambience_count,0)=0 THEN 'research_venue_specific_atmosphere'
  WHEN COALESCE(stats.verified_count,0)<5 THEN 'expand_source_verified_tags'
  ELSE 'ready_for_tag_editorial_qa' END AS next_tag_action
FROM whateato_release_cohort_300_v1 c JOIN restaurants r ON r.id=c.restaurant_id
LEFT JOIN LATERAL(
 SELECT count(*) FILTER(WHERE verification_state='verified') verified_count,
 count(*) FILTER(WHERE verification_state='proposed') proposed_count,
 count(*) FILTER(WHERE verification_state='verified' AND a.tag_code IN(
  'date_night','quiet_vibe','cozy_vibe','casual_vibe','lively_vibe','traditional_vibe',
  'heritage_restaurant','hanok_interior','fine_dining','group_meals','spacious_interiors',
  'exotic_vibe','business_meal','after_work','counter_seating','rooftop_space',
  'modern_interior','family_dining','spacious_interiors','terrace_seating'
 )) ambience_count,
 count(*) FILTER(WHERE verification_state='verified' AND a.tag_code NOT LIKE 'area_%'
 AND a.tag_code NOT IN(
  'date_night','quiet_vibe','cozy_vibe','casual_vibe','lively_vibe','traditional_vibe',
  'heritage_restaurant','hanok_interior','fine_dining','group_meals','spacious_interiors',
  'exotic_vibe','business_meal','after_work','counter_seating','rooftop_space',
  'modern_interior','family_dining','terrace_seating','reservation_available',
  'solo_dining','lunch','dinner','near_subway'
 )) food_count
 FROM restaurant_tag_assignments a WHERE a.restaurant_id=c.restaurant_id
) stats ON true;
