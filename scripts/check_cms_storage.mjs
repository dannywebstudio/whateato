#!/usr/bin/env node
// Startup diagnostics only: never mutate an object, never log credentials.
import {S3Client,HeadBucketCommand} from '@aws-sdk/client-s3';
const endpoint=process.env.WHATEATO_S3_ENDPOINT||'';
const bucket=process.env.WHATEATO_S3_BUCKET||'';
const accessKeyId=process.env.WHATEATO_S3_ACCESS_KEY_ID||'';
const secretAccessKey=process.env.WHATEATO_S3_SECRET_ACCESS_KEY||'';
if(!endpoint||!bucket||!accessKeyId||!secretAccessKey){
 console.log('CMS_STORAGE_PREFLIGHT: not_configured');
 process.exit(0);
}
if(!/^https:\/\//.test(endpoint)){
 console.warn('CMS_STORAGE_PREFLIGHT: invalid_https_endpoint');
 process.exit(0);
}
try{
 const s3=new S3Client({endpoint,region:process.env.WHATEATO_S3_REGION||'auto',
  forcePathStyle:true,credentials:{accessKeyId,secretAccessKey},
  maxAttempts:1
 });
 await s3.send(new HeadBucketCommand({Bucket:bucket}),{abortSignal:AbortSignal.timeout(8000)});
 console.log('CMS_STORAGE_PREFLIGHT: reachable (private, HEAD only)');
}catch{
 console.warn('CMS_STORAGE_PREFLIGHT: unreachable (upload will fail closed)');
}
