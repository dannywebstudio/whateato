#!/usr/bin/env node
// Isolated, localhost-only real PostgreSQL + Next.js test of owner review deletion.
import assert from 'node:assert/strict';
import pg from 'pg';
import {encode} from 'next-auth/jwt';
const database=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(database.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
assert.equal(process.env.WHATEATO_OWNER_CMS_ENABLED,'true');
const base='http://127.0.0.1:3000';
const venue='77777777-7777-4777-8777-777777777777';
const reviewId='99999999-9999-4999-8999-999999999999';
const author='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1';
const photoIds=['88888888-8888-4888-8888-888888888880','88888888-8888-4888-8888-888888888881'];
const photos=photoIds.map(id=>'media/reviews/'+id+'.webp');
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
try{
 await db.query(`INSERT INTO whateato_user_reviews
  (id,restaurant_id,account_id,rating,body,moderation_status,reviewed_at)
  VALUES($1,$2,$3,4,'Synthetic approved review with photos to test private owner deletion.', 'published',now())`,
  [reviewId,venue,author]);
 await db.query(`
  INSERT INTO whateato_review_category_scores
    (review_id,taste,service,tourist_friendliness,value_for_money,cleanliness)
  VALUES ($1,5,4,3,4,5)`,[reviewId]);
 for(const [i,id] of photoIds.entries()){
  await db.query(`
    INSERT INTO whateato_review_photo_assets
      (id,review_id,storage_key,mime_type,width,height,bytes,position,
       scan_state,rights_state,moderation_state)
    VALUES($1,$2,$3,'image/webp',800,600,1000,$4,'passed','approved','approved')`,
    [id,reviewId,photos[i],i]);
 }
 await db.query(`INSERT INTO whateato_review_moderation_audit(review_id,decision,reason_code)
  VALUES ($1,'published','approved_guidelines')`,[reviewId]);
}finally{await db.end()}
const signed=async sub=>'authjs.session-token='+await encode({
 token:{sub},salt:'authjs.session-token',secret:process.env.AUTH_SECRET,maxAge:3600
});
const [owner,editor,moderator]=await Promise.all([
 'cccccccc-cccc-4ccc-8ccc-ccccccccccc3',
 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4'
].map(signed));
const path='/api/v1/owner/reviews/'+reviewId;
async function call(cookie,origin=base,confirmation='DELETE',id=reviewId){
 const r=await fetch(base+path,{method:'DELETE',
  headers:{...(cookie?{Cookie:cookie}:{}),Origin:origin,'Content-Type':'application/json'},
  body:JSON.stringify({reason_code:'spam',confirm_review_id:id,confirmation})});
 return {status:r.status,body:await r.json()};
}
assert.equal((await call('')).status,403,'Anonymous delete must be denied');
assert.equal((await call(editor)).status,403,'Editor cannot delete reviews');
assert.equal((await call(moderator)).status,403,'Moderator cannot permanently delete reviews');
assert.equal((await call(owner,'https://evil.invalid')).status,403,'CSRF blocked');
assert.equal((await call(owner,base,'delete')).status,400,'Typed DELETE required');
assert.equal((await call(owner,base,'DELETE','11111111-1111-4111-8111-111111111111')).status,400,
 'ID confirmation must match exact review');
const getPublic=()=>fetch(base+'/api/restaurants/'+venue+'/reviews').then(x=>x.json());
const before=await getPublic();
assert.equal(before.reviews.some(r=>r.id===reviewId),true);
const result=await call(owner);
assert.equal(result.status,200,JSON.stringify(result.body));
assert.equal(result.body.deleted,true);
assert.equal(result.body.queued_photos,2);
assert.equal((await call(owner)).status,404,'Repeat must not report a fresh deletion');
const after=await getPublic();
assert.equal(after.reviews.some(r=>r.id===reviewId),false,'Deleted review must vanish immediately');
const check=new pg.Client({connectionString:process.env.DATABASE_URL});await check.connect();
try{
 for(const [table,query] of [
  ['whateato_user_reviews','SELECT count(*)::int AS n FROM whateato_user_reviews WHERE id=$1'],
  ['whateato_review_category_scores','SELECT count(*)::int AS n FROM whateato_review_category_scores WHERE review_id=$1'],
  ['whateato_review_photo_assets','SELECT count(*)::int AS n FROM whateato_review_photo_assets WHERE review_id=$1'],
  ['whateato_review_moderation_audit','SELECT count(*)::int AS n FROM whateato_review_moderation_audit WHERE review_id=$1']
 ]){
  const x=await check.query(query,[reviewId]);
  assert.equal(x.rows[0].n,0,table+' must not retain deleted content');
 }
 const history=await check.query(`
  SELECT reason_code,previous_state,queued_photo_count,actor_role
  FROM whateato_review_deletion_audit WHERE review_id=$1`,[reviewId]);
 assert.equal(history.rowCount,1);
 assert.equal(history.rows[0].reason_code,'spam');
 assert.equal(history.rows[0].previous_state,'published');
 assert.equal(history.rows[0].queued_photo_count,2);
 assert.equal(history.rows[0].actor_role,'owner');
 const queued=await check.query(`
  SELECT storage_key,completed_at FROM whateato_review_photo_cleanup
  WHERE storage_key=ANY($1::text[]) ORDER BY storage_key`,[photos]);
 assert.equal(queued.rowCount,2);
 assert.ok(queued.rows.every(row=>row.completed_at===null),
  'Without object-storage credentials, removals must persist for later retry');
}finally{await check.end()}
console.log('PASS: review hard-delete owner-only, exact confirmation/CSRF, 2 photos queued, PII-free audit, public score removal');
