#!/usr/bin/env node
// A complete owner-cookie route test against the EPHEMERAL local CI database.
// Does NOT contact Google and NEVER targets Neon/Render.
import assert from 'node:assert/strict';
import pg from 'pg';
import {encode} from 'next-auth/jwt';
const url=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
assert.equal(process.env.WHATEATO_OWNER_CMS_ENABLED,'true');
assert.equal(process.env.WHATEATO_CMS_BOOTSTRAP_ENABLED,'false');
const base='http://127.0.0.1:3000';
const cookie='authjs.session-token';
const secret=process.env.AUTH_SECRET||'';
assert.ok(secret.length>=32);
const reviewer='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const editor='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2';
const moderator='dddddddd-dddd-4ddd-8ddd-ddddddddddd4';
const owner='cccccccc-cccc-4ccc-8ccc-ccccccccccc3';
const db=new pg.Client({connectionString:process.env.DATABASE_URL});
await db.connect();
try{
  for(const [id,subject] of [[editor,'synthetic-google-editor-subject'],[moderator,'synthetic-google-moderator-subject'],[owner,'synthetic-google-owner-subject']])
    await db.query('INSERT INTO whateato_review_accounts(id,google_subject) VALUES($1,$2)',[id,subject]);
  await db.query(`INSERT INTO whateato_admin_accounts(account_id,role) VALUES
    ($1,'editor'),($2,'moderator'),($3,'owner')`,[editor,moderator,owner]);
}finally{await db.end()}
async function signedCookie(subject){
 const jwe=await encode({
  token:{sub:subject},
  secret,salt:cookie,maxAge:3600
 });
 return cookie+'='+jwe;
}
const [reviewerCookie,editorCookie,moderatorCookie,ownerCookie]=await Promise.all([
 reviewer,editor,moderator,owner
].map(signedCookie));
const origin=base;
async function req(path,method='GET',cookieValue='',body,requestOrigin=origin){
 const headers={...(cookieValue?{Cookie:cookieValue}:{}),
   ...(body!==undefined?{'Content-Type':'application/json'}:{}),
   ...(method==='GET'?{}:{Origin:requestOrigin})};
 const response=await fetch(base+path,{method,headers,redirect:'manual',
   ...(body===undefined?{}:{body:JSON.stringify(body)})});
 const raw=await response.text();
 let data;try{data=JSON.parse(raw)}catch{data={}};
 return {status:response.status,data,raw};
}
assert.equal((await req('/api/v1/owner/catalog','GET',reviewerCookie)).status,403,
  'A signed-in reviewer must not become staff');
assert.equal((await req('/api/v1/owner/catalog','GET',moderatorCookie)).status,403,
  'Moderator must not read unpublished restaurant contents');
assert.equal((await req('/api/v1/owner/reviews','GET',editorCookie)).status,403,
  'Editor must not moderate reviews');
assert.equal((await req('/api/v1/owner/catalog','GET',editorCookie)).status,200,
  'Editor should see private catalog');
assert.equal((await req('/api/v1/owner/catalog','GET',ownerCookie)).status,200,
  'Owner should see private catalog');
assert.equal((await req('/api/v1/owner/reviews','GET',moderatorCookie)).status,200,
  'Moderator should see private reviews');
assert.equal((await req('/api/v1/owner/bulk/batches','POST',ownerCookie,{client_key:'owner-auth-test-001',title:'Synthetic owner batch'},'https://evil.invalid')).status,403,
  'Authenticated cross-site mutation denied');
assert.equal((await req('/api/v1/owner/bulk/batches','POST',ownerCookie,{client_key:'owner-auth-test-001',title:'Synthetic owner batch'},'')).status,403,
  'Missing origin mutation denied');
const created=await req('/api/v1/owner/bulk/batches','POST',editorCookie,{
 client_key:'owner-auth-test-001',title:'Synthetic owner batch'
});
assert.equal(created.status,201,JSON.stringify(created.data));
const id=created.data.id;
const submit=await req('/api/v1/owner/bulk/batches/'+id+'/items','POST',editorCookie,{items:[{
 source_key:'en-profile-from-editor',restaurant_id:'77777777-7777-4777-8777-777777777777',
 kind:'localization',payload:{
  locale:'en',display_name:'English Visitor Restaurant',
  short_description:'A synthetic restaurant built only for private CI.',
  source_notes:'CI evidence verified by synthetic automated fixture'
 }
}]});
assert.equal(submit.status,201,JSON.stringify(submit.data));
assert.equal((await req('/api/v1/owner/bulk/batches/'+id+'/actions','POST',editorCookie,{
 action:'submit'
})).status,200);
assert.equal((await req('/api/v1/owner/bulk/batches/'+id+'/actions','POST',editorCookie,{
 action:'approve',confirm_batch_id:id
})).status,403,'Editors must never approve');
assert.equal((await req('/api/v1/owner/bulk/batches/'+id+'/actions','POST',ownerCookie,{
 action:'approve',confirm_batch_id:id
})).status,200);
const applied=await req('/api/v1/owner/bulk/batches/'+id+'/actions','POST',ownerCookie,{
 action:'apply',confirm_batch_id:id
});
assert.equal(applied.status,200,JSON.stringify(applied.data));
assert.equal(applied.data.state,'completed');
const result=await req('/api/v1/owner/bulk/batches/'+id,'GET',ownerCookie);
assert.equal(result.status,200);
assert.equal(result.data.batch.applied,1);
// Owner-only public publication is an additional, explicit approval step.
const publicationRoute='/api/v1/owner/catalog/77777777-7777-4777-8777-777777777777/public';
const publicAction={action:'approve',confirm_restaurant_id:'77777777-7777-4777-8777-777777777777',
  evidence_url:'https://example.org/independent-restaurant-validation'};
assert.equal((await req(publicationRoute,'POST',reviewerCookie,publicAction)).status,403,
  'an ordinary visitor cannot make catalog entries public');
assert.equal((await req(publicationRoute,'POST',editorCookie,publicAction)).status,403,
  'content editors cannot publish restaurants to search and sitemap');
assert.equal((await req(publicationRoute,'POST',ownerCookie,publicAction,'https://evil.invalid')).status,403,
  'owner-only approval still enforces CSRF origin verification');
assert.equal((await req(publicationRoute,'POST',ownerCookie,
  {...publicAction,confirm_restaurant_id:'11111111-1111-4111-8111-111111111111'})).status,400,
  'approval requires exact restaurant ID confirmation');
const notReady=await req(publicationRoute,'POST',ownerCookie,publicAction);
assert.equal(notReady.status,409,
  'owner cannot approve a restaurant missing independently verified hours and content');
assert.equal(notReady.data.error,'public_approval_preflight_failed');
assert.ok(notReady.data.blockers?.includes('verified_opening_hours'));
const ownerPage=await req('/admin','GET',ownerCookie);
assert.equal(ownerPage.status,200);
assert.match(ownerPage.raw,/Restaurant CMS/);
const anonymousPage=await req('/admin','GET');
assert.match(anonymousPage.raw,/관리자 접근 제한/);
const db2=new pg.Client({connectionString:process.env.DATABASE_URL});
await db2.connect();
try{
 const r=await db2.query(`SELECT display_name,publication_state FROM restaurant_localizations
 WHERE restaurant_id='77777777-7777-4777-8777-777777777777' AND locale='en'`);
 assert.equal(r.rows[0]?.display_name,'English Visitor Restaurant');
 assert.equal(r.rows[0]?.publication_state,'published');
}finally{await db2.end()}
console.log('PASS: signed Google-style JWT cookie, staff roles, CSRF, editor draft, owner approval/publish and admin SSR');
