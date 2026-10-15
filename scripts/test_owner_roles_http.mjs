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

// Full synthetic lifecycle: invisible -> owner approve -> search/detail/map -> revoke.
// Production and Neon databases are never contacted in this test.
const syntheticId='77777777-7777-4777-8777-777777777777';
const publicSearch='/api/v1/restaurants?q=Test%20Location&hl=ko&limit=30';
const publicDetail='/api/v1/restaurants/'+syntheticId+'?hl=ko';
const publicMap='/api/v1/map/markers?bbox=37.57,126.98,37.59,127.01&hl=ko';
const before=await req(publicSearch);
assert.equal(before.status,200);
assert.ok(!(before.data.items||[]).some(x=>x.id===syntheticId),
 'published but unapproved restaurant cannot leak in search');
assert.equal((await req(publicDetail)).status,404,
 'unapproved restaurant detail must return 404');

const local=new pg.Client({connectionString:process.env.DATABASE_URL});
await local.connect();
try {
 await local.query('BEGIN');
 await local.query("UPDATE restaurants SET road_address_ko='서울특별시 종로구 테스트로 30', region_sido='서울특별시', region_sigungu='종로구', region_dong='테스트동', latitude=37.5784, longitude=126.9855, location=ST_SetSRID(ST_MakePoint(126.9855,37.5784),4326)::geography, publication_status='published', business_status='active' WHERE id=$1",[syntheticId]);
 await local.query("UPDATE restaurant_localizations SET short_description='A fully verified synthetic venue for owner publication integration testing.', verified_at=now(), publication_state='published' WHERE restaurant_id=$1 AND locale='en'",[syntheticId]);
 await local.query("INSERT INTO restaurant_localizations (restaurant_id,locale,display_name,short_description,publication_state,source_notes,verified_at) VALUES($1,'ko','테스트 등록 식당','사용자에게 공개될 수 있는지 검증하는 격리된 테스트 전용 식당 설명입니다.','published','https://example.org/synthetic-evidence',now())",[syntheticId]);
 await local.query("INSERT INTO restaurant_opening_hours (restaurant_id,timezone,publication_state,source_url,verified_at) VALUES($1,'Asia/Seoul','published','https://example.org/verified-hours',now())",[syntheticId]);
 await local.query("INSERT INTO restaurant_opening_intervals (restaurant_id,weekday,start_minute,end_minute) VALUES($1,1,660,1260)",[syntheticId]);
 await local.query("INSERT INTO restaurant_tag_assignments (restaurant_id,tag_code,verification_state,evidence_ref,verified_at) VALUES($1,'cafe','verified','https://example.org/verified-cafe',now())",[syntheticId]);
 const menu=await local.query("INSERT INTO restaurant_menus (restaurant_id,price_krw,position,publication_state,evidence_ref,price_verified_at) VALUES($1,6500,0,'published','https://example.org/verified-menu',now()) RETURNING id",[syntheticId]);
 await local.query("INSERT INTO restaurant_menu_localizations(menu_id,locale,name) VALUES($1,'ko','테스트 커피'),($1,'en','Synthetic Coffee')",[menu.rows[0].id]);
 await local.query('COMMIT');
} catch(error){await local.query('ROLLBACK').catch(()=>{});throw error}
finally{await local.end()}

const accepted=await req(publicationRoute,'POST',ownerCookie,publicAction);
assert.equal(accepted.status,200,JSON.stringify(accepted.data));
assert.equal(accepted.data.public_approved,true);
const liveSearch=await req(publicSearch);
assert.equal(liveSearch.status,200);
assert.ok((liveSearch.data.items||[]).some(x=>x.id===syntheticId),
 'approved restaurant must immediately appear in public search');
const liveDetail=await req(publicDetail);
assert.equal(liveDetail.status,200,JSON.stringify(liveDetail.data));
assert.equal(liveDetail.data.restaurant?.id,syntheticId);
const liveMap=await req(publicMap);
assert.equal(liveMap.status,200,JSON.stringify(liveMap.data));
assert.ok((liveMap.data.items||[]).some(x=>x.id===syntheticId),
 'approved restaurant must appear on map');

const revoked=await req(publicationRoute,'POST',ownerCookie,{
 action:'revoke',confirm_restaurant_id:syntheticId
});
assert.equal(revoked.status,200,JSON.stringify(revoked.data));
assert.equal(revoked.data.public_approved,false);
assert.ok(!(await req(publicSearch)).data.items.some(x=>x.id===syntheticId),
 'revoked restaurant disappears from search');
assert.equal((await req(publicDetail)).status,404,
 'revoked restaurant detail must return 404');
assert.ok(!(await req(publicMap)).data.items.some(x=>x.id===syntheticId),
 'revoked restaurant disappears from map');
assert.equal((await req(publicationRoute,'POST',ownerCookie,{
 action:'revoke',confirm_restaurant_id:syntheticId
})).status,409,'double revoke blocked');

const verify=new pg.Client({connectionString:process.env.DATABASE_URL});
await verify.connect();
try{
 const audit=await verify.query("SELECT action FROM whateato_public_restaurant_approval_audit_v1 WHERE restaurant_id=$1 ORDER BY id",[syntheticId]);
 assert.deepEqual(audit.rows.map(x=>x.action),['approve','revoke'],
  'owner approve and revoke both audited');
 const membership=await verify.query("SELECT is_visible,approval_source FROM whateato_restaurant_public_approvals_v1 WHERE restaurant_id=$1",[syntheticId]);
 assert.equal(membership.rows[0]?.is_visible,false);
 assert.equal(membership.rows[0]?.approval_source,'owner');
}finally{await verify.end()}
console.log('PASS: isolated owner publication -> search/detail/map -> revoke, permissions and audit');

// Only localhost ephemeral CI: exercise My Page ownership, edit moderation and no-approval delete.
const myReviewer='eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee5';
const myVenue='22222222-2222-4222-8222-222222222222';
const myText='My review was collected for local integration testing and describes only a synthetic visit.';
const updatedText='I revised this synthetic restaurant review. This change must wait for moderator approval.';
const myDb=new pg.Client({connectionString:process.env.DATABASE_URL});
await myDb.connect();
try{
 await myDb.query("INSERT INTO whateato_review_accounts(id,google_subject) VALUES($1,'synthetic-my-page-only-google-id')",[myReviewer]);
}finally{await myDb.end()}
const myCookie=await signedCookie(myReviewer);
const anonymousMy=await req('/my-page?hl=en');
assert.ok([302,303,307,308].includes(anonymousMy.status),'anonymous My Page must redirect to Google login');
assert.ok(!anonymousMy.raw.includes('My review was collected for local integration testing'),'login redirect must not leak private reviews');
assert.equal((await req('/my-page?hl=en','GET',myCookie)).status,200,'authenticated reviewer can access private My Page');
const firstReview=await req('/api/restaurants/'+myVenue+'/reviews','POST',myCookie,{
 rating:4,body:myText
});
assert.equal(firstReview.status,202,JSON.stringify(firstReview.data));
let visibleInMy=await req('/my-page?hl=en','GET',myCookie);
assert.equal(visibleInMy.status,200);
assert.ok(visibleInMy.raw.includes(myText),'author must see own pending review');
const otherCookie=reviewerCookie;
assert.ok(!(await req('/my-page?hl=en','GET',otherCookie)).raw.includes(myText),
 'another signed-in user must not see private review');
const preEdit=new pg.Client({connectionString:process.env.DATABASE_URL});
await preEdit.connect();
try{
 await preEdit.query("UPDATE whateato_user_reviews SET moderation_status='published',reviewed_at=now() WHERE restaurant_id=$1 AND account_id=$2",[myVenue,myReviewer]);
}finally{await preEdit.end()}
const edit=await req('/api/restaurants/'+myVenue+'/reviews','POST',myCookie,{
 rating:5,body:updatedText
});
assert.equal(edit.status,202,JSON.stringify(edit.data));
const moderated=new pg.Client({connectionString:process.env.DATABASE_URL});
await moderated.connect();
try{
 const row=await moderated.query("SELECT rating,body,moderation_status,reviewed_at FROM whateato_user_reviews WHERE restaurant_id=$1 AND account_id=$2",[myVenue,myReviewer]);
 assert.equal(row.rows[0]?.moderation_status,'pending');
 assert.equal(row.rows[0]?.reviewed_at,null);
 assert.equal(row.rows[0]?.body,updatedText);
 assert.equal(row.rows[0]?.rating,5);
}finally{await moderated.end()}
assert.ok(!(await req('/api/restaurants/'+myVenue+'/reviews')).raw.includes(updatedText),
 'edited review cannot become public before moderator approval');
assert.ok((await req('/my-page?hl=en','GET',myCookie)).raw.includes(updatedText),
 'author can still view pending edits');
const anotherDelete=await req('/api/restaurants/'+myVenue+'/reviews','DELETE',otherCookie);
assert.equal(anotherDelete.status,200);
assert.ok((await req('/my-page?hl=en','GET',myCookie)).raw.includes(updatedText),
 'another user DELETE may not erase owners review');
const myDelete=await req('/api/restaurants/'+myVenue+'/reviews','DELETE',myCookie);
assert.equal(myDelete.status,200);
assert.equal(myDelete.data.deleted,true);
assert.ok(!(await req('/my-page?hl=en','GET',myCookie)).raw.includes(updatedText),
 'author delete immediately removes card');
console.log('PASS: private My Page, Google-style auth, author-only review, edit pending moderation, immediate delete');
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
