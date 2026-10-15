#!/usr/bin/env node
// Ephemeral/local PostgreSQL ONLY. No production or staging writes.
import assert from 'node:assert/strict';
import pg from 'pg';
import {encode} from 'next-auth/jwt';
const url=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
assert.equal(process.env.WHATEATO_OWNER_CMS_ENABLED,'true');
const origin='http://127.0.0.1:3000';
const ownerId='cccccccc-cccc-4ccc-8ccc-ccccccccccc3';
const jwt=await encode({token:{sub:ownerId},secret:process.env.AUTH_SECRET,
 salt:'authjs.session-token',maxAge:3600});
const headers={Cookie:'authjs.session-token='+jwt,Origin:origin,'Content-Type':'application/json'};
async function request(path,method='GET',body){
 const res=await fetch(origin+path,{method,headers,redirect:'manual',
  ...(body===undefined?{}:{body:JSON.stringify(body)})});
 const parsed=await res.json();
 return {status:res.status,data:parsed};
}
const source='https://example.org/verified-synthetic-venue';
const payload={
 name_ko:'Synthetic 2026 Tourist Kitchen',road_address_ko:'55 Example Road, Seoul',
 lot_address_ko:null,region_sido:'Seoul',region_sigungu:'Jung-gu',region_dong:'Myeongdong',
 latitude:37.56,longitude:126.98,source_url:source
};
const created=await request('/api/v1/owner/catalog','POST',payload);
assert.equal(created.status,201,JSON.stringify(created.data));
const id=created.data.restaurant_id;
const dupe=await request('/api/v1/owner/catalog','POST',payload);
assert.equal(dupe.status,409,JSON.stringify(dupe.data));
assert.equal(dupe.data.existing_id,id);
const detail=await request('/api/v1/owner/catalog/'+id);
assert.equal(detail.status,200);
assert.equal(detail.data.restaurant.publication_status,'draft');
assert.equal(detail.data.restaurant.cms_origin,true);
async function newBatch(key){
 const r=await request('/api/v1/owner/bulk/batches','POST',
  {client_key:key,title:'New restaurant review'});
 assert.equal(r.status,201,JSON.stringify(r.data));return r.data.id;
}
async function runBatch(batchId,items){
 const saved=await request('/api/v1/owner/bulk/batches/'+batchId+'/items','POST',{items});
 assert.equal(saved.status,201,JSON.stringify(saved.data));
 for(const action of ['submit','approve','apply']){
  const result=await request('/api/v1/owner/bulk/batches/'+batchId+'/actions','POST',
   {action,...(action==='submit'?{}:{confirm_batch_id:batchId})});
  assert.equal(result.status,200,JSON.stringify({action,body:result.data}));
  if(action==='apply')assert.equal(result.data.state,'completed',JSON.stringify(result.data));
 }
}
const newBatchId=await newBatch('synthetic-manual-new-001');
await runBatch(newBatchId,[
 {source_key:'profile',restaurant_id:id,kind:'localization',payload:{
  locale:'en',display_name:'Tourist Kitchen in Seoul',
  short_description:'English verified copy for a tourist-friendly restaurant.',
  source_notes:'Independently verified synthetic CI evidence only.'
 }},
 {source_key:'publish',restaurant_id:id,kind:'restaurant_publish',payload:{
  evidence_url:source,confirm_live:true
 }}
]);
const oldId='11111111-1111-4111-8111-111111111111';
const addressBatch=await newBatch('synthetic-edit-address-001');
await runBatch(addressBatch,[{
 source_key:'street-v1',restaurant_id:oldId,kind:'address',payload:{
  road_address_ko:'55 Updated Test Lane, Seoul',lot_address_ko:null,
  region_sido:'Seoul',region_sigungu:'Gangnam-gu',region_dong:'Yeoksam-dong',
  latitude:37.50,longitude:127.04,evidence_url:source
 }
}]);
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{
 const newVenue=await client.query(
  'SELECT publication_status,business_status,latitude,longitude FROM restaurants WHERE id=$1',[id]);
 assert.equal(newVenue.rows[0].publication_status,'published');
 assert.equal(newVenue.rows[0].business_status,'active');
 assert.equal(newVenue.rows[0].latitude,37.56);
 const old=await client.query(
  'SELECT road_address_ko,region_sigungu,latitude,longitude,ST_AsText(location::geometry) AS point FROM restaurants WHERE id=$1',[oldId]);
 assert.equal(old.rows[0].region_sigungu,'Gangnam-gu');
 assert.equal(old.rows[0].latitude,37.5);
 assert.match(old.rows[0].point,/127.04 37.5/);
 const history=await client.query(
  'SELECT previous_data,new_data,evidence_url FROM whateato_cms_address_history WHERE restaurant_id=$1',[oldId]);
 assert.equal(history.rows.length,1);
 assert.equal(history.rows[0].previous_data.road_address_ko,'Synthetic One');
 const media=await client.query(
  "SELECT column_name FROM information_schema.columns WHERE table_name='restaurant_images' AND column_name='cms_photo_role'");
 assert.equal(media.rows.length,1);
}finally{await client.end()}
console.log('PASS: draft new venue, duplicate prevention, English approval, owner publish, address audit and geography, photo roles');
