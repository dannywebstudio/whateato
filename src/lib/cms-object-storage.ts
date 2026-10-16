import path from 'node:path';
import {mkdir,readFile,writeFile,unlink,stat,realpath} from 'node:fs/promises';
import {S3Client,PutObjectCommand,GetObjectCommand,DeleteObjectCommand,HeadObjectCommand,HeadBucketCommand} from '@aws-sdk/client-s3';

const MEDIA_KEY=/^media\/(?:cms|reviews|blog)\/[0-9a-f-]{36}\.webp$/;
const MAX_BYTES=8*1024*1024;
// A configured media directory opts into the tested persistent local storage.
// Set WHATEATO_MEDIA_STORAGE=s3 to explicitly retain S3 for existing deployments.
function localDir():string|null{
 if(process.env.WHATEATO_MEDIA_STORAGE==='s3')return null;
 const dir=process.env.WHATEATO_MEDIA_DIR?.trim();
 if(!dir)return null;
 if(!path.isAbsolute(dir))throw Error('invalid_local_media_directory');
 const normalized=path.resolve(dir).replace(/\\\\/g,'/');
 if(normalized==='/'||normalized.startsWith('/tmp/')||normalized.includes('/hbuilds/')||
   normalized.endsWith('/public_html')||normalized.includes('/public_html/')||
   normalized.includes('/.next/')||normalized.includes('/node_modules/'))
  throw Error('unsafe_local_media_directory');
 return normalized;
}
async function localPath(key:string){
 if(!MEDIA_KEY.test(key))throw Error('invalid_media_key');
 const root=localDir();
 if(!root)throw Error('local_storage_not_configured');
 // Do not follow symlinked roots to deployment-managed or public directories.
 await mkdir(root,{recursive:true,mode:0o700});
 const actual=await realpath(root);
 if(actual!==root)throw Error('local_media_directory_symlink_not_allowed');
 const full=path.resolve(root,key);
 if(!full.startsWith(root+path.sep))throw Error('invalid_media_path');
 return full;
}
function validImage(bytes:Buffer){
 if(bytes.length<16||bytes.length>MAX_BYTES||bytes.toString('ascii',0,4)!=='RIFF'||
 bytes.toString('ascii',8,12)!=='WEBP')throw Error('invalid_media_content');
}
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
 try{if(localDir())return true;config();return true}catch{return false}
}
export async function probeObjectStorage():Promise<boolean>{
 if(!objectStorageReady())return false;
 try{
   if(localDir()){
     const full=await localPath('media/blog/00000000-0000-0000-0000-000000000000.webp');
     const root=path.dirname(full);await mkdir(root,{recursive:true,mode:0o700});
     await stat(root);return true;
   }
   const {s3,bucket}=client();
   await s3.send(new HeadBucketCommand({Bucket:bucket}),{abortSignal:AbortSignal.timeout(5000)});
   return true;
 }catch{return false}
}
export async function savePhoto(key:string,bytes:Buffer){
 if(!MEDIA_KEY.test(key)||bytes.length>MAX_BYTES)throw Error('invalid_media_key_or_size');
 validImage(bytes);
 if(localDir()){
   const full=await localPath(key);await mkdir(path.dirname(full),{recursive:true,mode:0o700});
   await writeFile(full,bytes,{flag:'wx',mode:0o600});return;
 }
 const {s3,bucket}=client();
 await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:'image/webp',
   CacheControl:'private, no-store'}));
}
export async function deletePhoto(key:string){
 if(!MEDIA_KEY.test(key))throw Error('invalid_media_key');
 if(localDir()){
  const full=await localPath(key);
  await unlink(full).catch(e=>{if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e});return;
 }
 const {s3,bucket}=client();
 await s3.send(new DeleteObjectCommand({Bucket:bucket,Key:key}));
}
export async function photoExists(key:string){
 if(!MEDIA_KEY.test(key))throw Error('invalid_media_key');
 if(localDir()){await stat(await localPath(key));return}
 const {s3,bucket}=client();await s3.send(new HeadObjectCommand({Bucket:bucket,Key:key}));
}
export async function readPhoto(key:string):Promise<Buffer>{
 if(!MEDIA_KEY.test(key))throw Error('invalid_media_key');
 if(localDir()){
   const full=await localPath(key);
   const meta=await stat(full);
   if(!meta.isFile()||meta.size>MAX_BYTES)throw Error('invalid_media_size');
   const bytes=await readFile(full);validImage(bytes);return bytes;
 }
 const {s3,bucket}=client();
 const out=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}));
 if(!out.Body||Number(out.ContentLength||0)>MAX_BYTES)throw Error('image_too_large');
 const bytes=Buffer.from(await out.Body.transformToByteArray());
 validImage(bytes);
 return bytes;
}
