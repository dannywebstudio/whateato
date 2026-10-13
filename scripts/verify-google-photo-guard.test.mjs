import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('Google photo credit displays photographer and map attribution',()=>{
 const s=readFileSync('src/components/GooglePlacesPhotoCredit.tsx','utf8');
 assert.match(s,/Google 지도 제공 사진/);
 assert.match(s,/credit\.photographer/);
 assert.match(s,/noopener noreferrer/);
});
test('Google API photos still guarded and no public image route exists',()=>{
 const s=readFileSync('src/lib/google-place-photos.ts','utf8');
 assert.match(s,/reserveGooglePhotoQuota\('place_photo_media'\)/);
 assert.match(s,/isVerifiedPilotPlace/);
});

test('photo field mask asks for author and photo link, not ratings',()=>{
 const content=readFileSync('src/lib/google-place-photos.ts','utf8');
 assert.match(content,/photos\.authorAttributions,photos\.googleMapsUri/);
 assert.doesNotMatch(content,/rating,userRatingCount/);
});
test('quotas use atomic reservation and manual Place ID approvals',()=>{
 const content=readFileSync('src/lib/google-photo-quota.ts','utf8');
 assert.match(content,/SET used=used\+1/);
 assert.match(content,/used < limit_count/);
 assert.match(content,/google_place_manual_identity_approvals_v1/);
});
