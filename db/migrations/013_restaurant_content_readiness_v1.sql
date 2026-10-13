-- Non-destructive content readiness inventory for owner-approved editorial gates.
CREATE OR REPLACE VIEW restaurant_content_readiness_v1 AS
SELECT r.id,r.sbiz_source_key,r.name_ko,r.region_sido,r.region_sigungu,
  (NULLIF(BTRIM(r.name_ko),'') IS NOT NULL) AS has_name,
  (COALESCE(NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) IS NOT NULL) AS has_address,
  (r.latitude BETWEEN 33 AND 39.5 AND r.longitude BETWEEN 124 AND 132) AS has_valid_coordinates,
  (NULLIF(BTRIM(r.category_code),'') IS NOT NULL) AS has_category,
  COALESCE(loc.published_languages,0) AS published_languages,
  COALESCE(m.menus,0) AS verified_menus,
  COALESCE(t.tags,0) AS verified_tags,
  COALESCE(i.images,0) AS approved_images,
  COALESCE(er.ratings,0) AS approved_external_ratings,
  e.identity_flag,e.review_state,
  CASE WHEN e.identity_flag IN ('third_party_marked_closed','possible_separate_permit_or_relocation','current_name_mismatch_sinsinwon','category_mismatch','branch_alias','price_conflict')
    THEN 'identity_or_evidence_hold'
    WHEN COALESCE(e.review_state,'')='pending' THEN 'research_review'
    WHEN COALESCE(loc.published_languages,0)=0 THEN 'needs_description_research'
    WHEN COALESCE(i.images,0)=0 OR COALESCE(m.menus,0)=0 THEN 'needs_media_or_menu'
    ELSE 'content_review' END AS next_action
FROM restaurants r
LEFT JOIN LATERAL (SELECT count(DISTINCT locale)::int AS published_languages FROM restaurant_localizations WHERE restaurant_id=r.id AND publication_state='published' AND NULLIF(BTRIM(short_description),'') IS NOT NULL) loc ON true
LEFT JOIN LATERAL (SELECT count(*)::int AS menus FROM restaurant_menus WHERE restaurant_id=r.id AND publication_state='published' AND NULLIF(BTRIM(evidence_ref),'') IS NOT NULL) m ON true
LEFT JOIN LATERAL (SELECT count(*)::int AS tags FROM restaurant_tag_assignments WHERE restaurant_id=r.id AND verification_state='verified' AND verified_at IS NOT NULL AND NULLIF(BTRIM(evidence_ref),'') IS NOT NULL) t ON true
LEFT JOIN LATERAL (SELECT count(*)::int AS images FROM restaurant_images WHERE restaurant_id=r.id AND publication_state='published' AND rights_status='approved' AND rights_verified_at IS NOT NULL AND NULLIF(BTRIM(usage_rights_reference),'') IS NOT NULL) i ON true
LEFT JOIN LATERAL (SELECT count(*)::int AS ratings FROM restaurant_external_ratings WHERE restaurant_id=r.id AND publication_state='published' AND approved_at IS NOT NULL AND NULLIF(BTRIM(publication_permission_ref),'') IS NOT NULL) er ON true
LEFT JOIN restaurant_external_research e ON e.restaurant_id=r.id
WHERE r.publication_status='published';
