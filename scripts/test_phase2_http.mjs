#!/usr/bin/env node
// Real HTTP smoke against a running local Next.js server and isolated CI fixture.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000';
const rid='11111111-1111-4111-8111-111111111111';
async function get(path){
  const response=await fetch(base+path,{headers:{'Accept':'application/json'}});
  const raw=await response.text();
  let body;
  try{body=JSON.parse(raw)}catch{body=raw}
  return {status:response.status,body};
}
const readyp=await get('/api/ready');
assert.equal(readyp.status,200,'database readiness');
assert.equal(readyp.body.phase_1_5_schema,'ready');
assert.equal(readyp.body.analytics_collection_enabled,false);
const first=await get('/api/v1/restaurants?q='+encodeURIComponent('테스트')+'&hl=en&limit=1');
assert.equal(first.status,200);
assert.equal(first.body.items.length,1);
assert.equal(first.body.has_more,true,'first page has a second published restaurant');
const second=await get('/api/v1/restaurants?q='+encodeURIComponent('테스트')+'&hl=en&limit=1&offset=1');
assert.equal(second.status,200);
assert.equal(second.body.items.length,1);
assert.equal(second.body.has_more,false,'last page must not show a phantom Next link');
const ids=[first.body.items[0].id,second.body.items[0].id].sort();
assert.deepEqual(ids,[rid,'22222222-2222-4222-8222-222222222222'].sort());
const matched=await get('/api/v1/restaurants?q='+encodeURIComponent('테스트')+'&hl=en&f=cafe');
assert.equal(matched.status,200);
assert.equal(matched.body.items.length,1);
assert.equal(matched.body.items[0].name,'Sunny Table');
assert.equal(matched.body.items[0].editorial_score,4.5);
assert.equal(matched.body.items[0].main_menu,'Coffee');
assert.equal(matched.body.items[0].tags[0].label,'Café');
assert.ok(matched.body.items[0].featured_image_metadata?.id);
assert.ok(!matched.body.items[0].featured_image_metadata?.storage_key,
  'unpublished storage location must not leak to API');
const noVerifiedTags=await get('/api/v1/restaurants?hl=ko&f=date_night');
assert.deepEqual(noVerifiedTags.body.items,[],'proposed tag must not match');
const ja=await get('/api/v1/restaurants?hl=ja&q='+encodeURIComponent('테스트카페'));
assert.equal(ja.body.items[0].name,'테스트카페','no fabricated Japanese translation');
const region=await get('/api/v1/restaurants?hl=ko&region='+encodeURIComponent('종로구')+'&f=cafe');
assert.equal(region.body.items.length,1);
const detail=await get('/api/v1/restaurants/'+rid+'?hl=en');
assert.equal(detail.status,200);
assert.equal(detail.body.restaurant.name,'Sunny Table');
assert.equal(detail.body.restaurant.editorial_score,4.5);
assert.equal(detail.body.restaurant.full_description,'Evidence-backed full intro for CI.');
assert.equal(detail.body.menus.length,2);
assert.equal(detail.body.menus.find(x=>x.name==='Coffee').price_krw,7500);
assert.equal(detail.body.menus.find(x=>x.name==='Unverified Price Item').price_krw,null);
assert.equal(detail.body.tags.length,1);
assert.equal(detail.body.images.length,1);
assert.equal((await get('/api/v1/restaurants/bad-id')).status,400);
assert.equal((await get('/api/v1/restaurants/ffffffff-ffff-4fff-8fff-ffffffffffff')).status,404);
const secondDetail=await get('/api/v1/restaurants/22222222-2222-4222-8222-222222222222?hl=en');
assert.equal(secondDetail.body.restaurant.name,'테스트식당','draft translation must be hidden');
assert.equal(secondDetail.body.restaurant.editorial_score,null,'draft score must be hidden');
assert.equal(secondDetail.body.tags.length,0,'proposed tag must be hidden');
assert.equal(secondDetail.body.images.length,0,'unlicensed images must be hidden');
const searchHtml=await get('/search?q='+encodeURIComponent('테스트')+'&hl=en&f=cafe');
assert.equal(searchHtml.status,200);
assert.match(searchHtml.body,/Sunny Table/,'SSR results connected to catalog');
assert.match(searchHtml.body,/Coffee/,'SSR main menu displayed');
assert.ok(!searchHtml.body.includes('Draft Bistro'),'draft translation not visible in UI');
const detailHtml=await get('/restaurant/'+rid+'?hl=en');
assert.equal(detailHtml.status,200);
assert.match(detailHtml.body,/Evidence-backed full intro for CI./);
assert.match(detailHtml.body,/Coffee/);
const disabledAnalytics=await fetch(base+'/api/v1/analytics/events',{
  method:'POST',headers:{'Origin':base,'Content-Type':'application/json'},
  body:JSON.stringify({event_type:'page_view',page_type:'search',locale:'ko'})
});
assert.equal(disabledAnalytics.status,204,'analytics must be opt-in after release security checks');
console.log('PASS: Phase 2 real HTTP, SSR, localization, tag verification, score gate, licensing, pagination and analytics launch gate');
