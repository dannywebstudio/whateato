#!/usr/bin/env node
// Synthetic localhost-only read-only security regression.
import assert from 'node:assert/strict';
const db=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(db.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
assert.notEqual(process.env.WHATEATO_OWNER_CMS_ENABLED,'true');
const root='http://127.0.0.1:3000';
const paths=[
 '/api/v1/owner/catalog',
 '/api/v1/owner/catalog/11111111-1111-4111-8111-111111111111',
 '/api/v1/owner/bulk/batches',
 '/api/v1/owner/reviews'
];
for(const path of paths){
 const r=await fetch(root+path);
 assert.equal(r.status,403,'Private API must be denied: '+path);
 const body=await r.text();
 assert.ok(!body.includes('google_subject')&&!body.includes('account_id'));
}
for(const path of ['/api/v1/owner/bulk/batches','/api/v1/owner/media']){
 const r=await fetch(root+path,{method:'POST',headers:{Origin:root,'Content-Type':'application/json'},body:'{}'});
 assert.equal(r.status,403,'Mutations denied without staff session: '+path);
}
const view=await fetch(root+'/admin');
assert.equal(view.status,200);
const html=await view.text();
assert.match(html,/관리자 접근 제한/);
assert.doesNotMatch(html,/Restaurant CMS.*?식당 검색/s);
console.log('PASS: admin routes fail closed, no API data leak, disabled unauthenticated CMS');
