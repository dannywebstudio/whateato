#!/usr/bin/env node
// Live, read-only deployment verification. No login, secrets, cookies or DB writes.
import assert from 'node:assert/strict';
const origin='https://whateato.com';
async function get(path){
 const response=await fetch(origin+path,{signal:AbortSignal.timeout(18000),redirect:'follow',headers:{'User-Agent':'WhatEatO-Legal-Release-QA/1.0'}});
 const body=await response.text();
 return {status:response.status,body};
}
const home=await get('/');
assert.equal(home.status,200,'public homepage should be reachable');
for(const link of ['/privacy?hl=en','/terms?hl=en','/contact?hl=en']){
 assert.ok(home.body.includes(link.replace(/&/g,'&amp;')), 'homepage footer missing '+link);
}
for(const [locale,privacyTitle,termsTitle] of [
 ['ko','개인정보처리방침','이용약관'],
 ['en','Privacy Policy','Terms of Service'],
 ['ja','プライバシーポリシー','利用規約'],
 ['zh-CN','隐私政策','服务条款']
]){
 const suffix='?hl='+encodeURIComponent(locale);
 const privacy=await get('/privacy'+suffix);
 assert.equal(privacy.status,200,'privacy status '+locale);
 assert.ok(privacy.body.includes(privacyTitle),'privacy translation '+locale);
 assert.ok(privacy.body.includes('pakrsky2@naver.com'),'existing contact disclosure '+locale);
 const terms=await get('/terms'+suffix);
 assert.equal(terms.status,200,'terms status '+locale);
 assert.ok(terms.body.includes(termsTitle),'terms translation '+locale);
 const contact=await get('/contact'+suffix);
 assert.equal(contact.status,200,'reused contact status '+locale);
 assert.ok(contact.body.includes('pakrsky2@naver.com'),'existing contact preserved '+locale);
 console.log('PASS legal pages: '+locale+' /privacy /terms existing /contact');
}
console.log('PASS: deployed WhatEatO legal footer and 4-language policy links');
