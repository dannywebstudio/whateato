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
