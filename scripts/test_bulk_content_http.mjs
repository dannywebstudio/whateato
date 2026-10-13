#!/usr/bin/env node
// Destructive synthetic API test; refuses ANY non-local database and non-CI token.
import assert from 'node:assert/strict';
import pg from 'pg';
const url=process.env.DATABASE_URL||'';
const db=new URL(url);
assert.ok(['127.0.0.1','localhost'].includes(db.hostname),'localhost only');
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
assert.equal(process.env.WHATEATO_BULK_ADMIN_ENABLED,'true');
assert.ok(process.env.WHATEATO_BULK_ADMIN_TOKEN?.startsWith('ci-only-bulk-admin-token-'));
const base='http://127.0.0.1:3000/api/v1/admin/bulk/batches';
const secret=process.env.WHATEATO_BULK_ADMIN_TOKEN;
const auth={Authorization:'Bearer '+secret,'Content-Type':'application/json'};
async function req(path,method='GET',body,headers=auth){
 const res=await fetch(base+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 let payload;try{payload=await res.json()}catch{payload={}};
 return {status:res.status,payload};
}
const cafe='11111111-1111-4111-8111-111111111111';
const bistro='22222222-2222-4222-8222-222222222222';
const lot='77777777-7777-4777-8777-777777777777';
const it=(source_key,restaurant_id,kind,payload)=>({source_key,restaurant_id,kind,payload});
const source='https://example.org/synthetic-evidence-only';
const en=(name)=>({locale:'en',display_name:name,
 short_description:'Evidence-backed English tourist introduction for a Korean restaurant.',
 full_description:'This is entirely synthetic copy used only in localhost integration tests.',
 source_notes:'synthetic-ci-source-evidence-2026'});
const hours={source_url:source,days:Array.from({length:7},(_,weekday)=>({
 weekday,intervals:weekday===0?[]:[[660,900],[960,1200]]
}))};
async function newBatch(key,title='Synthetic bulk test'){
 const r=await req('', 'POST',{client_key:key,title});
 assert.equal(r.status,201,JSON.stringify(r));
 return r.payload.id;
}
async function ingest(id,items,expected=201){
 const r=await req('/'+id+'/items','POST',{items});assert.equal(r.status,expected,JSON.stringify(r));return r;
}
async function action(id,operation,expected=200){
 const r=await req('/'+id+'/actions','POST',{
  action:operation,...(['approve','apply','reject'].includes(operation)?{confirm_batch_id:id}:{})
 });assert.equal(r.status,expected,JSON.stringify(r));return r.payload;
}
async function run(id){
 let state;
 for(let i=0;i<5;i++){
   const response=await action(id,'apply');state=response.state;
   if(!response.has_more)return response;
 }
 throw Error('bounded apply did not finish');
}
assert.equal((await req('', 'GET',undefined,{})).status,401);
assert.equal((await req('', 'GET',undefined,{Authorization:'Bearer incorrect'})).status,401);
assert.equal((await req('', 'GET',undefined,{...auth,Origin:'https://evil.invalid'})).status,401);
const batch=await newBatch('ci-synthetic-bulk-001');
const replay=await req('', 'POST',{client_key:'ci-synthetic-bulk-001',title:'Synthetic bulk test'});
assert.equal(replay.status,200);assert.equal(replay.payload.id,batch);
const items=[
 it('profile-en',bistro,'localization',en('Tourist Bistro')),
 it('profile-ko',bistro,'localization',{...en('관광객식당'),locale:'ko'}),
 it('signature-menu',bistro,'menu',{key:'kimchi_soup',locale:'en',name:'Kimchi Stew',position:0,evidence_ref:source}),
 it('traveler-tag',bistro,'tag',{code:'traveler_friendly',enabled:true,evidence_ref:source}),
 it('weekly-schedule',bistro,'hours',hours),
 it('invalid-foreign-key',bistro,'tag',{code:'not_a_real_tag',enabled:true,evidence_ref:source})
];
await ingest(batch,items);
const again=await ingest(batch,items);assert.equal(again.payload.inserted,0);
assert.equal((await ingest(batch,[{...items[0],payload:en('Conflicting name')}],409)).status,409);
assert.equal((await req('/'+batch+'/actions','POST',{action:'approve',confirm_batch_id:batch})).status,409);
assert.equal((await action(batch,'submit')).state,'review');
assert.equal((await action(batch,'approve')).state,'approved');
const done=await run(batch);
assert.equal(done.state,'completed_with_errors');
assert.equal(done.total.applied,5);
assert.equal(done.total.failed,1);
const detail=await req('/'+batch);
assert.equal(detail.status,200);
assert.equal(detail.payload.batch.state,'completed_with_errors');
assert.equal(detail.payload.recent_audit.filter(x=>x.action==='failed').length,1);
assert.equal((await req('/'+batch+'/items','POST',{items:[items[0]]})).status,409);
const second=await newBatch('ci-synthetic-bulk-002');
await ingest(second,[it('korean-only',lot,'localization',{...en('한글만'),locale:'ko'})]);
await action(second,'submit');
const englishGate=await req('/'+second+'/actions','POST',{action:'approve',confirm_batch_id:second});
assert.equal(englishGate.status,409);
assert.equal(englishGate.payload.error,'english_first_profile_required');
assert.equal((await action(second,'reject')).state,'rejected');
const hidden=await newBatch('ci-synthetic-bulk-003');
await ingest(hidden,[it('hide-bistro',bistro,'visibility_hide',{
 evidence_ref:source,evidence_summary:'Synthetic temporary hide request with a reviewable evidence record.',
 confirm_hide:true
})]);
await action(hidden,'submit');await action(hidden,'approve');assert.equal((await run(hidden)).state,'completed');
const dbClient=new pg.Client({connectionString:url});await dbClient.connect();
try{
 const check=await dbClient.query(`
 SELECT
  (SELECT display_name FROM restaurant_localizations WHERE restaurant_id=$1 AND locale='en') AS english_name,
  (SELECT count(*)::int FROM restaurant_menus WHERE restaurant_id=$1 AND publication_state='published') AS menus,
  (SELECT count(*)::int FROM restaurant_opening_intervals WHERE restaurant_id=$1) AS intervals,
  (SELECT count(*)::int FROM restaurant_data_quality_reviews WHERE restaurant_id=$1 AND reviewer_ref='content_batch_admin' AND review_state='confirmed_hold') AS held
 `,[bistro]);
 assert.equal(check.rows[0].english_name,'Tourist Bistro');
 assert.equal(check.rows[0].menus,1);assert.equal(check.rows[0].intervals,12);
 assert.equal(check.rows[0].held,1);
 const restore=await newBatch('ci-synthetic-bulk-004');
 await ingest(restore,[it('restore-bistro',bistro,'visibility_restore',{})]);
 await action(restore,'submit');await action(restore,'approve');assert.equal((await run(restore)).state,'completed');
 const hold=await dbClient.query(`SELECT count(*)::int AS n FROM restaurant_data_quality_reviews WHERE restaurant_id=$1 AND reviewer_ref='content_batch_admin'`,[bistro]);
 assert.equal(hold.rows[0].n,0);
 const checkSource=await dbClient.query(`SELECT count(*)::int AS n FROM restaurants WHERE id=ANY($1::uuid[])`,[[cafe,bistro,lot]]);
 assert.equal(checkSource.rows[0].n,3,'underlying permit rows may not be deleted');
 const review=await dbClient.query(`SELECT id FROM whateato_user_reviews WHERE restaurant_id=$1 AND moderation_status='published' LIMIT 1`,[cafe]);
 await dbClient.query(`INSERT INTO whateato_review_category_scores(review_id,taste,service,tourist_friendliness,value_for_money,cleanliness) VALUES($1,5,4,NULL,4,5)`,[review.rows[0].id]);
 const summary=await dbClient.query(`SELECT eligible_reviews,average_rating::text FROM whateato_review_category_averages_v1 WHERE restaurant_id=$1`,[cafe]);
 assert.equal(summary.rows[0].eligible_reviews,1);
 assert.equal(summary.rows[0].average_rating,'4.5');
}finally{await dbClient.end()}
console.log('PASS: bulk authorization, idempotency, publication gates, per-item rollback, evidence and English-first, reversible holds, normalized review scores');
