import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand,HeadObjectCommand,HeadBucketCommand} from '@aws-sdk/client-s3';

let cached:S3Client|undefined;
function config(){
 const endpoint=process.env.WHATEATO_S3_ENDPOINT||'';
 const bucket=process.env.WHATEATO_S3_BUCKET||'';
 const key=process.env.WHATEATO_S3_ACCESS_KEY_ID||'';
 const secret=process.env.WHATEATO_S3_SECRET_ACCESS_KEY||'';
 if(!/^https:\/\//i.test(endpoint)||!bucket||!key||!secret)throw Error('object_storage_not_configured');
 return {endpoint,bucket,key,secret};
}
function client(){
 const c=config();
 if(!cached)cached=new S3Client({region:process.env.WHATEATO_S3_REGION||'auto',
   endpoint:c.endpoint,forcePathStyle:true,
   credentials:{accessKeyId:c.key,secretAccessKey:c.secret}});
 return {s3:cached,bucket:c.bucket};
}
export function objectStorageReady(){
 try{config();return true}catch{return false}
}
export async function probeObjectStorage():Promise<boolean>{
  if(!objectStorageReady())return false;
  try{
    const {s3,bucket}=client();
    await s3.send(new HeadBucketCommand({Bucket:bucket}),{
      abortSignal:AbortSignal.timeout(5000)
    });
    return true;
  }catch{return false}
}
export async function savePhoto(key:string,bytes:Buffer){
 if(!/^media\/cms\/[0-9a-f-]{36}\.webp$/.test(key)||bytes.length>8*1024*1024)
   throw Error('invalid_media_key_or_size');
 const {s3,bucket}=client();
 await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:'image/webp',
   CacheControl:'private, no-store'}));
}
export async function deletePhoto(key:string){
 const {s3,bucket}=client();
 await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));
}
export async function photoExists(key:string){
 const {s3,bucket}=client();
 await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}));
}
export async function readPhoto(key:string):Promise<Buffer>{
 if(!/^media\/cms\/[0-9a-f-]{36}\.webp$/.test(key))throw Error('invalid_media_key');
 const {s3,bucket}=client();
 const out=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}));
 if(!out.Body||Number(out.ContentLength||0)>8*1024*1024)throw Error('image_too_large');
 const bytes=Buffer.from(await out.Body.transformToByteArray());
 if(bytes.length<16||bytes.length>8*1024*1024||bytes.toString('ascii',0,4)!=='RIFF'||
   bytes.toString('ascii',8,12)!=='WEBP')throw Error('invalid_media_content');
 return bytes;
}
