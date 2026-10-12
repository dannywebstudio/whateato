#!/usr/bin/env node
// End-to-end moderation tests against local synthetic PostgreSQL only.
// Runs AFTER ordinary SSR/browser QA because this script changes fixture states.
import assert from 'node:assert/strict';
import pg from 'pg';
const url=process.env.DATABASE_URL||'';
const parsed=new URL(url);
assert.ok(['localhost','127.0.0.1'].includes(parsed.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
assert.equal(process.env.WHATEATO_REVIEW_MODERATION_ENABLED,'true');
const secret=process.env.WHATEATO_REVIEW_ADMIN_TOKEN;
assert.ok(secret?.startsWith('ci-only-review-moderation-token-'));
const base='http://127.0.0.1:3000';
const auth={Authorization:'Bearer '+secret};
const headers={...auth,'Content-Type':'application/json'};
async function request(path,init={}){
  const r=await fetch(base+path,init);
  const raw=await r.text();
  let body;
  try{body=JSON.parse(raw)}catch{body=raw}
  return {status:r.status,body,headers:r.headers};
}
const queue='/api/v1/admin/reviews';
assert.equal((await request(queue)).status,401,'admin queue must require auth');
assert.equal((await request(queue,{headers:{Authorization:'Bearer incorrect-unsafe'}})).status,401);
assert.equal((await request(queue,{headers:{...auth,Origin:'https://malicious.invalid'}})).status,401);
assert.equal((await request(queue+'?limit=999',{headers:auth})).status,400);
const pending=await request(queue+'?limit=3',{headers:auth});
assert.equal(pending.status,200);
assert.equal(pending.headers.get('cache-control'),'no-store, private');
assert.equal(pending.body.items.length,3);
assert.equal(pending.body.has_more,true);
assert.equal(pending.body.moderation_status,'pending');
assert.ok(!JSON.stringify(pending.body).includes('account_id'));
assert.ok(!JSON.stringify(pending.body).includes('google_subject'));
const all=await request(queue+'?limit=50',{headers:auth});
assert.equal(all.status,200);
assert.equal(all.body.items.length,4);
assert.equal(all.body.has_more,false);
assert.ok(all.body.items.every(x=>x.rating>=1&&x.rating<=5));
const firstId='11111111-1111-4111-8111-111111111111';
const secondId='22222222-2222-4222-8222-222222222222';
const pendingOne=all.body.items.find(x=>x.restaurant_id===firstId);
const three=all.body.items.filter(x=>x.restaurant_id===secondId);
assert.ok(pendingOne?.id);
assert.equal(three.length,3);
assert.equal((await request('/api/restaurants/'+secondId+'/reviews')).body.reviews.length,0);
const reviewUrl='/api/v1/admin/reviews/'+pendingOne.id;
async function patch(path,payload,extraHeaders={}){
  return request(path,{method:'PATCH',headers:{...headers,...extraHeaders},body:JSON.stringify(payload)});
}
assert.equal((await patch('/api/v1/admin/reviews/not-a-uuid',{decision:'reject',reason_code:'spam'})).status,400);
assert.equal((await patch(reviewUrl,{decision:'reject',reason_code:'invalid'})).status,400);
assert.equal((await patch(reviewUrl,{decision:'approve',reason_code:'spam'})).status,400);
assert.equal((await patch(reviewUrl,{decision:'reject'})).status,400);
assert.equal((await patch(reviewUrl,{decision:'reject',reason_code:'spam',account_id:'illegal'})).status,400);
assert.equal((await patch(reviewUrl,{decision:'reject',reason_code:'spam'},{Authorization:'Bearer wrong'})).status,401);
const reject=await patch(reviewUrl,{decision:'reject',reason_code:'spam'});
assert.equal(reject.status,200,'reject pending review');
assert.equal(reject.body.status,'rejected');
assert.equal((await patch(reviewUrl,{decision:'approve'})).status,409,'rejected review cannot later be approved');
for(const row of three){
  const approval=await patch('/api/v1/admin/reviews/'+row.id,{decision:'approve'});
  assert.equal(approval.status,200,'manual approval');
  assert.equal(approval.body.status,'published');
  assert.equal(approval.body.reason_code,'approved_guidelines');
  assert.equal((await patch('/api/v1/admin/reviews/'+row.id,{decision:'approve'})).status,409,
    'duplicate approval must not create a second audit event');
}
const empty=await request(queue,{headers:auth});
assert.equal(empty.status,200);
assert.equal(empty.body.items.length,0,'moderation queue drained');
const publicOne=await request('/api/restaurants/'+firstId+'/reviews');
assert.equal(publicOne.status,200);
assert.equal(publicOne.body.reviews.length,3);
assert.ok(publicOne.body.reviews.every(x=>x.rating>=3));
const publicTwo=await request('/api/restaurants/'+secondId+'/reviews');
assert.equal(publicTwo.status,200);
assert.deepEqual(publicTwo.body.reviews.map(x=>x.rating).sort(),[2,4,5]);
const secondHtml=await request('/restaurant/'+secondId+'?hl=en');
assert.equal(secondHtml.status,200);
assert.match(secondHtml.body,/Approved reviews.*?3/);
assert.match(secondHtml.body,/3\.7/,'3 approved scores average to 3.7');
const client=new pg.Client({connectionString:url});
await client.connect();
try{
  const audits=await client.query(`
    SELECT decision,reason_code,count(*)::int AS n
    FROM whateato_review_moderation_audit GROUP BY decision,reason_code ORDER BY decision`);
  assert.deepEqual(audits.rows.map(x=>({decision:x.decision,reason:x.reason_code,n:x.n})),[
    {decision:'published',reason:'approved_guidelines',n:3},
    {decision:'rejected',reason:'spam',n:1}
  ]);
  const privacy=await client.query(`
    SELECT count(*)::int AS pending FROM whateato_user_reviews WHERE moderation_status='pending'`);
  assert.equal(privacy.rows[0].pending,0);
}finally{await client.end()}
console.log('PASS: token-gated manual approve/reject, audit, moderation queue, no stale writes, approved-only public review averages');
