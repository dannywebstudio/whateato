#!/usr/bin/env node
// Run AFTER the Hostinger Next.js release is online.
// Usage: node scripts/verify_hostinger_launch_http.mjs https://OWNED_DOMAIN
// No credentials needed; GET only, no live writes.
import assert from 'node:assert/strict';
const raw=process.argv[2]||'';
assert.match(raw,/^https:\/\/[a-z0-9.-]+$/i,'Supply exact HTTPS canonical origin, without path');
const base=raw.replace(/\/$/,'');
const publicId='16918f58-4e63-4e49-a013-aad17e499ad4'; // 광화문 미진
const hiddenId='3c8fc01a-c3da-4b32-bc04-efd87b545484'; // unresolved / not in launch cohort
const requests=[
 ['home','/',200],
 ['search','/search?q=%EA%B4%91%ED%99%94%EB%AC%B8',200],
 ['map','/map',200],
 ['public_detail','/restaurant/'+publicId,200],
 ['public_api','/api/v1/restaurants/'+publicId+'?hl=ko',200],
 ['hidden_detail','/restaurant/'+hiddenId,404],
 ['hidden_api','/api/v1/restaurants/'+hiddenId+'?hl=ko',404],
 ['robots','/robots.txt',200],
 ['sitemap','/sitemap.xml',200],
];
let failed=0;
for(const [label,path,expected] of requests){
 try{
  const res=await fetch(base+path,{redirect:'follow',signal:AbortSignal.timeout(20000)});
  const body=await res.text();
  const ok=res.status===expected;
  if(label==='robots' && process.env.EXPECT_INDEXABLE==='true' && body.includes('Disallow: /\n'))throw Error('production robots blocks all crawlers');
  if(label==='sitemap' && process.env.EXPECT_INDEXABLE==='true'){
   if(!body.includes(base+'/'))throw Error('sitemap points to a different canonical origin');
   if(body.includes(hiddenId))throw Error('hidden restaurant leaked into sitemap');
  }
  if(label==='public_api' && ok){
   const j=JSON.parse(body);
   if(j.restaurant?.id!==publicId)throw Error('public JSON identity mismatch');
  }
  console.log((ok?'PASS':'FAIL')+' '+label+': HTTP '+res.status+' expected '+expected);
  if(!ok)failed++;
 }catch(e){
  failed++;console.error('FAIL '+label+': '+String(e).slice(0,200));
 }
}
if(failed)process.exitCode=1;
else console.log('PASS: release HTTP read-only QA completed');
