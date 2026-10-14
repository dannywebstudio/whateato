#!/usr/bin/env node
// Manual cleanup only: never invoked on cron. Run with explicit ACK from a trusted server.
// Cleans private image objects already detached by user-delete transactions.
import assert from 'node:assert/strict';
import {S3Client,DeleteObjectCommand} from '@aws-sdk/client-s3';
import pg from 'pg';
assert.equal(process.env.WHATEATO_REVIEW_PURGE_ACK,'CONFIRM_REVIEW_MEDIA_CLEANUP');
const db=process.env.DATABASE_URL;
const endpoint=process.env.WHATEATO_S3_ENDPOINT;
const bucket=process.env.WHATEATO_S3_BUCKET;
assert.ok(db&&/^postgresql?:\/\//.test(db));
assert.ok(endpoint&&/^https:\/\//.test(endpoint)&&bucket);
const client=new pg.Client({connectionString:db});
const s3=new S3Client({endpoint,region:process.env.WHATEATO_S3_REGION||'auto',
 forcePathStyle:true,credentials:{
  accessKeyId:process.env.WHATEATO_S3_ACCESS_KEY_ID,
  secretAccessKey:process.env.WHATEATO_S3_SECRET_ACCESS_KEY
 }});
await client.connect();
let total=0,failed=0;
try{
 const pending=await client.query(`
  SELECT storage_key FROM whateato_review_photo_cleanup
  WHERE completed_at IS NULL AND attempts<1000
  ORDER BY enqueued_at LIMIT 20`);
 for(const row of pending.rows){
  const key=row.storage_key;
  if(!/^media\/reviews\/[0-9a-f-]{36}\.webp$/.test(key))continue;
  try{
   const referenced=await client.query(`
     SELECT 1 FROM whateato_review_photo_assets WHERE storage_key=$1 LIMIT 1`,[key]);
   if(referenced.rowCount){failed++;continue}
   await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));
   await client.query(`UPDATE whateato_review_photo_cleanup
       SET completed_at=now(),attempts=attempts+1
       WHERE storage_key=$1 AND completed_at IS NULL`,[key]);
   total++;
  }catch{
   failed++;
   await client.query(`UPDATE whateato_review_photo_cleanup
       SET attempts=least(attempts+1,1000)
       WHERE storage_key=$1 AND completed_at IS NULL`,[key]).catch(()=>{});
  }
 }
}finally{await client.end()}
console.log(JSON.stringify({completed:total,failed,pending_checked:total+failed}));
if(failed)process.exitCode=2;
