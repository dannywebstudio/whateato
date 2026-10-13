#!/usr/bin/env node
// Verifies that a published user's review can be hidden, never edited by admin.
// Runs AFTER the independent bulk fixture in ephemeral local PostgreSQL.
import assert from 'node:assert/strict';
import pg from 'pg';
const dbUrl=process.env.DATABASE_URL||'';
const url=new URL(dbUrl);
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
assert.equal(process.env.WHATEATO_REVIEW_MODERATION_ENABLED,'true');
const token=process.env.WHATEATO_REVIEW_ADMIN_TOKEN||'';
assert.ok(token.startsWith('ci-only-review-moderation-token-'));
const base='http://127.0.0.1:3000/api/v1/admin/reviews';
const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
const published=await fetch(base+'?status=published',{headers});
assert.equal(published.status,200);
const listing=await published.json();
assert.equal(listing.moderation_status,'published');
assert.equal(listing.items.length,1);
const chosen=listing.items[0];
assert.equal(chosen.rating,5);
const patch=()=>fetch(base+'/'+chosen.id,{
 method:'PATCH',headers,body:JSON.stringify({decision:'hide',reason_code:'other'})
});
const first=await patch();
assert.equal(first.status,200,JSON.stringify(await first.json()));
const again=await patch();assert.equal(again.status,409);
const pub=await fetch(base+'?status=published',{headers});
assert.equal((await pub.json()).items.length,0);
const client=new pg.Client({connectionString:dbUrl});await client.connect();
try{
 const events=await client.query(`
  SELECT count(*)::int AS n FROM whateato_review_moderation_audit
  WHERE review_id=$1 AND decision='rejected' AND reason_code='other'`,[chosen.id]);
 assert.equal(events.rows[0].n,1);
 const actual=await client.query(`
  SELECT moderation_status, rating FROM whateato_user_reviews WHERE id=$1`,[chosen.id]);
 assert.equal(actual.rows[0].moderation_status,'rejected');
 assert.equal(actual.rows[0].rating,5,'admin may not edit rating');
 const score=await client.query(`
  SELECT count(*)::int AS n FROM whateato_review_category_averages_v1
  WHERE restaurant_id=$1`,[chosen.restaurant_id]);
 assert.equal(score.rows[0].n,0,'hidden review must no longer affect category average');
}finally{await client.end()}
console.log('PASS: published review hidden with single immutable audit; author score unchanged; public aggregate excluded');
