import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
for(const file of ['src/lib/restaurant-catalog.ts','src/lib/geo-catalog.ts']){
 test(file+' hides unfinished unless manual Google photo approval, both quotas and env present',()=>{
   const s=read(file);
   assert.match(s,/WHATEATO_GOOGLE_PHOTO_APPROVED/);
   assert.match(s,/WHATEATO_GOOGLE_PHOTO_QUOTA_GUARD_READY/);
   assert.match(s,/google_place_manual_identity_approvals_v1/);
   assert.match(s,/google_places_photo_quota_v1/);
   assert.match(s,/readiness\.verified_tags>=1/);
 });
}
test('Google photo API never enables without both operator flags',()=>{
 const s=read('src/lib/google-place-photos.ts');
 assert.match(s,/WHATEATO_GOOGLE_PHOTO_APPROVED==='true'/);
 assert.match(s,/WHATEATO_GOOGLE_PHOTO_QUOTA_GUARD_READY==='true'/);
});
