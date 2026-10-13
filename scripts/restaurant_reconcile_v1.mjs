/**
 * WhatEatO source reconciliation v1: pure, review-first decision engine.
 * Does not call APIs, persist third-party content or approve publication.
 *
 * Official government permits are the identity/status anchor.
 * NAVER Local is a transient identity cross-check only.
 * Google Places free IDs-only supplies a place ID candidate, NOT an identity assertion.
 */
export const RECONCILIATION_VERSION = 'whateato.reconcile.v1';

const compact = value => String(value ?? '').normalize('NFKC')
  .replace(/<[^>]*>/g, '').replace(/\s+/g, '')
  .replace(/[()\[\]{}.,·'’"\-_/]/g, '').toLowerCase();

const normalizeRoad = value => compact(value)
  .replace(/서울특별시/g, '서울').replace(/인천광역시/g, '인천')
  .replace(/부산광역시/g, '부산').replace(/경기도/g, '경기');

function similarity(a, b) {
  const x = compact(a), y = compact(b);
  if (!x || !y) return false;
  return x === y;
}
const districtOf = s => String(s || '').match(/[가-힣]+(?:구|군)/)?.[0] ?? '';

function addressEquivalent(a, b) {
  const x=normalizeRoad(a),y=normalizeRoad(b);
  // Only accept full-string equivalence; no neighborhood-only approval.
  return x.length>=10 && x===y;
}

/**
 * Input example:
 * {
 *   official:{name,address,permitStatus,permitKey},
 *   naverCandidates:[{title,roadAddress,address}], // ephemeral, never store raw
 *   googleIdCandidates:['ChIJ...'], // ID alone cannot validate name/address
 *   manualIdentityHold:false
 * }
 * Output contains only classifications and counts; no Naver-derived fields.
 */
export function reconcileIdentity(input) {
  const official=input?.official;
  if (!official || !String(official.name||'').trim() ||
      !String(official.address||'').trim() || !String(official.permitKey||'').trim())
    throw Error('official permit identity with name, address and key required');
  const status=compact(official.permitStatus);
  const closed = /폐업|영업종료|closed|취소|말소/.test(status);
  if (closed || input.manualIdentityHold === true)
    return {version:RECONCILIATION_VERSION,decision:'HOLD',reason:closed?'OFFICIALLY_CLOSED':'MANUAL_IDENTITY_HOLD',naverExactMatches:0,naverWeakMatches:0,googleIdsOnlyCount:0,publishable:false};
  const naver = Array.isArray(input.naverCandidates)?input.naverCandidates.slice(0,5):[];
  const googleIds=Array.isArray(input.googleIdCandidates)?input.googleIdCandidates.slice(0,5):[];
  let exact=0,weak=0;
  const district=districtOf(official.address);
  for(const candidate of naver) {
    const matchingName=similarity(official.name,candidate.title);
    const road=candidate.roadAddress||candidate.address||'';
    if(matchingName && addressEquivalent(official.address,road))exact++;
    else if(matchingName && district && String(road).includes(district))weak++;
  }
  let decision='REVIEW',reason='NO_EXACT_CROSS_SOURCE_IDENTITY';
  if(exact===1){decision='CANDIDATE';reason='EXACT_NAME_AND_FULL_ADDRESS_MATCH'}
  if(exact>1){decision='REVIEW';reason='MULTIPLE_EXACT_IDENTITY_MATCHES'}
  return {version:RECONCILIATION_VERSION,decision,reason,
    naverExactMatches:exact,naverWeakMatches:weak,googleIdsOnlyCount:googleIds.length,
    publishable:false}; // Explicit approval is always a separate action.
}

export const CARD_DETAIL_GATES=Object.freeze({
  publicRestaurant:'official_active_and_not_confirmed_hold',
  nameAddress:'official_registry_and_manual_identity_validation',
  openingHours:'independently_verified_and_fresh',
  menus:'source_evidence_and_published',
  tags:'evidence_and_verified',
  description:'independent_editorial_approved',
  images:'media_rights_approved',
  rating:'approved_independent_or_permitted_external_attributed',
  googlePlaces:'ids_only_free_probe_no_licensed_details_persisted',
  naverLocal:'transient_crosscheck_no_cached_results',
});
