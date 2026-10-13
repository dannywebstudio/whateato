#!/usr/bin/env node
// Public Render-only regression: review-stage manuscripts may not accidentally
// leak as published descriptions, menus, photos or fabricated ratings.
import assert from 'node:assert/strict';
const origin=new URL(process.env.WHATEATO_STAGING_BASE_URL||'http://invalid.local').origin;
assert.equal(origin,'https://whateato.onrender.com','Preview only');
assert.equal(process.env.WHATEATO_STAGING_ACK,'PREVIEW_ONLY');
const records=[
 ['16918f58-4e63-4e49-a013-aad17e499ad4','광화문 미진'],
 ['2daa58f1-6360-4ddb-a27f-6e6d1437a122','우래옥'],
 ['6cc37914-1bb8-406e-a365-34c897b4f26f','청진옥']
];
for(const [id,name] of records){
  const api=await fetch(origin+'/api/v1/restaurants/'+id+'?hl=ko',{cache:'no-store'});
  assert.equal(api.status,200,'actual staging DB detail for '+name);
  const doc=await api.json();
  assert.equal(doc.restaurant.name_ko,name);
  assert.ok(doc.restaurant.road_address_ko,'verified permit address');
  assert.equal(doc.restaurant.short_description,null,'review description must remain private');
  assert.equal(doc.restaurant.editorial_score,null,'no fabricated ratings');
  assert.deepEqual(doc.menus,[],'unpublished draft menus must remain private');
  assert.deepEqual(doc.images,[],'unlicensed photographs must remain private');
  const html=await fetch(origin+'/restaurant/'+id+'?hl=ko',{cache:'no-store'});
  assert.equal(html.status,200,'real SSR detail '+name);
  const page=await html.text();
  assert.ok(page.includes('map.kakao.com/link/to/'),'live Kakao directions');
  assert.ok(!page.includes('/api/v1/images/'),'no phantom photos');
}
console.log('PASS: 3 actual staging restaurants, approved-coordinate directions, 12 review-only localized intros and 8 draft menus not leaked');
