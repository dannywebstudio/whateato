#!/usr/bin/env node
// Real HTTP + real ephemeral PostgreSQL; no S3 credentials, no production writes.
import assert from 'node:assert/strict';
import pg from 'pg';
import {encode} from 'next-auth/jwt';
const u=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(u.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
const base='http://127.0.0.1:3000',restaurant='22222222-2222-4222-8222-222222222222';
const accountId='cccccccc-cccc-4ccc-8ccc-ccccccccccc3';
const cookie= 'authjs.session-token='+await encode({
 token:{sub:accountId},salt:'authjs.session-token',secret:process.env.AUTH_SECRET,maxAge:3600
});
const guestHeaders={Origin:base,'Content-Type':'application/json'};
const headers={...guestHeaders,Cookie:cookie};
const adminToken=process.env.WHATEATO_REVIEW_ADMIN_TOKEN||'';
const adminHeaders={Authorization:'Bearer '+adminToken,'Content-Type':'application/json'};
async function req(path,{method='GET',headers:h=headers,body}={}){
 const response=await fetch(base+path,{method,headers:h,
  ...(body===undefined?{}:{body:JSON.stringify(body)})});
 let json;try{json=await response.json()}catch{json={}};
 return {status:response.status,body:json};
}
const path='/api/restaurants/'+restaurant+'/reviews';
const scores={taste:5,service:4,tourist_friendliness:null,value_for_money:3,cleanliness:5};
const text='A synthetic on-site visit review, used solely to verify moderated category averages.';
assert.equal((await req(path,{method:'POST',headers:guestHeaders,body:{categories:scores,body:text}})).status,401);
assert.equal((await req(path,{method:'POST',headers:{...headers,Origin:'https://evil.invalid'},
 body:{categories:scores,body:text}})).status,403);
assert.equal((await req(path,{method:'POST',body:{categories:{...scores,taste:0},body:text}})).status,400);
const created=await req(path,{method:'POST',body:{categories:scores,body:text}});
assert.equal(created.status,202,JSON.stringify(created.body));
assert.equal(created.body.average,4.3);
const id=created.body.id;
const mine=await req(path+'?mine=1');
assert.equal(mine.status,200);
assert.equal(mine.body.review.categories.taste,5);
assert.equal(mine.body.review.moderation_status,'pending');
assert.equal((await req(path,{headers:{}})).body.reviews.length,0);
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
const photoId='55555555-5555-4555-8555-555555555555';
try{
 const legacy=await client.query('SELECT rating FROM whateato_user_reviews WHERE id=$1',[id]);
 assert.equal(legacy.rows[0].rating,4);
 await client.query(`
  INSERT INTO whateato_review_photo_assets
    (id,review_id,storage_key,mime_type,width,height,bytes,position,
     scan_state,rights_state,moderation_state)
  VALUES($1,$2,$3,'image/webp',900,600,456,0,'passed','approved','pending')`,
 [photoId,id,'media/reviews/'+photoId+'.webp']);
}finally{await client.end()}
assert.equal((await req('/api/review-photos/'+photoId,{headers:{}})).status,404);
assert.equal((await req('/api/v1/owner/review-photos/'+photoId,{headers:{}})).status,403);
const queue=await req('/api/v1/admin/reviews?status=pending',{headers:adminHeaders});
assert.equal(queue.status,200,JSON.stringify(queue.body));
const pending=queue.body.items.find(r=>r.id===id);
assert.equal(pending.photos[0].id,photoId);
assert.equal(pending.categories.service,4);
const moderate='/api/v1/admin/reviews/'+id;
const denied=await req(moderate,{method:'PATCH',headers:adminHeaders,
 body:{decision:'approve',reason_code:'approved_guidelines'}});
assert.equal(denied.status,409,'Moderator MUST confirm checking attached food photos');
const approved=await req(moderate,{method:'PATCH',headers:adminHeaders,
 body:{decision:'approve',reason_code:'approved_guidelines',photos_reviewed:true}});
assert.equal(approved.status,200,JSON.stringify(approved.body));
const publicList=await req(path,{headers:{}});
assert.equal(publicList.status,200);
assert.equal(publicList.body.reviews.length,1);
assert.equal(publicList.body.reviews[0].rating,4.3);
assert.equal(publicList.body.reviews[0].photos.length,1);
assert.equal(publicList.body.reviews[0].categories.tourist_friendliness,null);
const changed=await req(path,{method:'POST',body:{categories:{...scores,taste:2},body:text}});
assert.equal(changed.status,202);
assert.equal(changed.body.id,id,'One author must not have duplicate reviews');
assert.equal((await req(path,{headers:{}})).body.reviews.length,0);
const db=new pg.Client({connectionString:process.env.DATABASE_URL});await db.connect();
try{
 const p=await db.query('SELECT moderation_state FROM whateato_review_photo_assets WHERE id=$1',[photoId]);
 assert.equal(p.rows[0].moderation_state,'pending','Photos must be reviewed again after author edits');
}finally{await db.end()}
const reject=await req(moderate,{method:'PATCH',headers:adminHeaders,body:{
 decision:'reject',reason_code:'off_topic'}});
assert.equal(reject.status,200);
assert.equal((await req(path,{headers:{}})).body.reviews.length,0);
const removed=await req(path,{method:'DELETE'});
assert.equal(removed.status,200,JSON.stringify(removed.body));
const db3=new pg.Client({connectionString:process.env.DATABASE_URL});await db3.connect();
try{
 const left=await db3.query('SELECT count(*)::int AS n FROM whateato_review_photo_assets WHERE review_id=$1',[id]);
 assert.equal(left.rows[0].n,0);
 const cleanup=await db3.query('SELECT count(*)::int AS n FROM whateato_review_photo_cleanup WHERE storage_key=$1',
 ['media/reviews/'+photoId+'.webp']);
 assert.equal(cleanup.rows[0].n,1);
 const remaining=await db3.query('SELECT count(*)::int AS n FROM whateato_review_category_scores WHERE review_id=$1',[id]);
 assert.equal(remaining.rows[0].n,0);
}finally{await db3.end()}
console.log('PASS: 5-category auth+CSRF, null category average, photo moderation gate, edit reapproval, author delete and cleanup queue');
