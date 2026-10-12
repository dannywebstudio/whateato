#!/usr/bin/env node
// Non-mutating live deployment QA. Run only against an intentionally created
// TEMPORARY preview domain, never GitHub Pages, localhost or WhatEatO.com.
// WHATEATO_STAGING_BASE_URL=https://preview.example.tld WHATEATO_STAGING_ACK=PREVIEW_ONLY node scripts/verify_phase25_deployed.mjs
import assert from 'node:assert/strict';
const raw=process.env.WHATEATO_STAGING_BASE_URL;
assert.equal(process.env.WHATEATO_STAGING_ACK,'PREVIEW_ONLY','Explicit staging verification required');
assert.ok(raw,'Set WHATEATO_STAGING_BASE_URL');
const url=new URL(raw);
assert.equal(url.protocol,'https:','Preview requires HTTPS');
assert.ok(!/(^|\.)((localhost)|(github\.io)|(whateato\.com))$/i.test(url.hostname),
  'Do not use GitHub Pages, local host, or the final domain');
assert.ok(!url.username&&!url.password&&!url.search&&!url.hash,'Use plain preview origin URL');
const base=url.origin;
async function get(path) {
  const response=await fetch(base+path,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(10000)});
  const body=await response.text();
  let data;
  try{data=JSON.parse(body)}catch{data=body}
  return {response,data};
}
const health=await get('/api/health');
assert.equal(health.response.status,200,'Next.js health check');
const ready=await get('/api/ready');
assert.equal(ready.response.status,200,'Neon connection');
assert.equal(ready.data.ready,true);
assert.equal(ready.data.phase_1_5_schema,'ready');
assert.equal(ready.data.analytics_collection_enabled,false,'Anonymous events must remain disabled');
const result=await get('/api/v1/restaurants?hl=ko&limit=2');
assert.equal(result.response.status,200);
assert.ok(Array.isArray(result.data.items)&&result.data.items.length>0,'Published records present');
assert.equal(result.response.headers.get('cache-control'),'no-store');
assert.ok(result.data.items.every(x=>x.id&&x.name),'Restaurant list contract');
const first=result.data.items[0];
const detail=await get('/api/v1/restaurants/'+encodeURIComponent(first.id)+'?hl=ja');
assert.equal(detail.response.status,200,'Japanese detail/fallback works');
assert.equal(detail.data.restaurant.id,first.id);
const invalid=await get('/api/v1/restaurants/not-a-uuid');
assert.equal(invalid.response.status,400);
const home=await get('/');
assert.equal(home.response.status,200);
assert.ok(home.data.includes('WhatEatO') && home.data.includes('search-form'));
const search=await get('/search?q='+encodeURIComponent(first.name_ko||first.name)+'&hl=ko');
assert.equal(search.response.status,200);
assert.ok(search.data.includes('class="results"'),'SSR search present');
const detailPage=await get('/restaurant/'+encodeURIComponent(first.id)+'?hl=ko');
assert.equal(detailPage.response.status,200);
assert.ok(detailPage.data.includes('class="content"'),'SSR detail present');
console.log(JSON.stringify({
  result:'PASS',origin:base,record_sample:first.id,
  checks:['health','db-schema','analytics-disabled','list','detail','invalid-id','home','search-SSR','detail-SSR'],
  notes:'Preview-only protocol smoke; not a substitute for screenshot, load or production QA'
},null,2));
