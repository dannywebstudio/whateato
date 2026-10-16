#!/usr/bin/env node
// Read-only external reachability QA; no private account or production mutation.
import assert from 'node:assert/strict';
const root='https://whateato.com';
const langs=['ko','en','ja','zh-CN'];
async function probe(path){
 const response=await fetch(root+path,{redirect:'manual',signal:AbortSignal.timeout(20000),
  headers:{'User-Agent':'WhatEatO-Login-ReadOnly-QA/1.0'}});
 return {status:response.status,headers:response.headers,html:await response.text()};
}
const provider=await probe('/api/auth/providers');
assert.equal(provider.status,200,'Google provider endpoint must be ready');
const providers=JSON.parse(provider.html);
assert.equal(providers?.google?.id,'google','Google authentication must be enabled');
assert.deepEqual(Object.keys(providers),['google'],'Google must be the only enabled sign-in provider');
for(const lang of langs){
 const hl=encodeURIComponent(lang);
 const login=await probe('/login?hl='+hl);
 assert.equal(login.status,200,'Login page '+lang+' must return 200');
 assert.match(login.html,/Google/,'Login page '+lang+' needs Google sign in');
 assert.match(login.html,/\/privacy\?hl=/,'Login page must link privacy');
 assert.match(login.html,/\/terms\?hl=/,'Login page must link terms');
 assert.match(login.html,/name="robots" content="noindex/,'Do not index Login pages');
 const mine=await probe('/my-page?hl='+hl);
 assert.ok([302,303,307,308].includes(mine.status),'anonymous My Page must redirect; got '+mine.status);
 assert.ok((mine.headers.get('location')||'').includes('/login'),'redirect must be Login');
 assert.ok(!mine.html.includes('MyReviewCards'),'private review contents must not be server-rendered anonymously');
 console.log('PASS live Google Login and anonymous My Page redirect: '+lang);
}
console.log('PASS live: Google-only Login in 4 languages; My Page not accessible anonymously.');
