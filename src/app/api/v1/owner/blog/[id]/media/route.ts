import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {savePhoto,deletePhoto,objectStorageReady} from '@/lib/cms-object-storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const respond=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:ownerHeaders});
export async function POST(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();if(!staff||!hasPermission(staff,'publish'))return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id}=await params;if(!isUuid(id))return respond({error:'invalid_post_id'},400);
 if(!objectStorageReady())return respond({error:'image_storage_unavailable'},503);
 if(!req.headers.get('content-type')?.startsWith('multipart/form-data'))
   return respond({error:'multipart_required'},415);
 if(Number(req.headers.get('content-length')||0)>9_000_000)
   return respond({error:'upload_too_large'},413);
 const reader=req.body?.getReader();if(!reader)return respond({error:'empty_upload'},400);
 const parts:Uint8Array[]=[];let size=0;
 try{
  while(true){
   const v=await reader.read();if(v.done)break;
   size+=v.value.byteLength;
   if(size>9_000_000){void reader.cancel();return respond({error:'upload_too_large'},413)}
   parts.push(v.value);
  }
 }catch{return respond({error:'upload_stream_failed'},400)}
 let form:FormData;
 try{
  const request=new Request(req.url,{method:'POST',headers:{
   'Content-Type':req.headers.get('content-type')||''},
   body:new Uint8Array(Buffer.concat(parts))});
  form=await request.formData();
 }catch{return respond({error:'invalid_multipart'},400)}
 const file=form.get('file'),role=form.get('media_role'),alt=form.get('alt_text');
 if(!(file instanceof File)||file.size<256||file.size>8*1024*1024||
  !['image/jpeg','image/png','image/webp'].includes(file.type)||
  !['cover','inline'].includes(String(role))||
  typeof alt!=='string'||alt.trim().length<3||alt.length>180)
  return respond({error:'invalid_image_or_rights_metadata'},400);
 let data:Buffer;let width=0,height=0;
 try{
  const bytes=Buffer.from(await file.arrayBuffer());
  const metadata=await sharp(bytes,{limitInputPixels:32_000_000,failOn:'error'}).metadata();
  if(!metadata.width||!metadata.height||metadata.width<320||metadata.height<240)
   return respond({error:'image_minimum_320x240'},400);
  const result=await sharp(bytes,{limitInputPixels:32_000_000,failOn:'error'})
   .rotate().resize({width:role==='cover'?1200:1400,height:role==='cover'?810:1100,
    fit:role==='cover'?'cover':'inside',withoutEnlargement:true})
   .webp({quality:78,effort:5}).toBuffer({resolveWithObject:true});
  data=result.data;width=result.info.width;height=result.info.height;
  if(data.length>8*1024*1024)return respond({error:'image_optimized_too_large'},413);
 }catch{return respond({error:'image_decode_failed'},400)}
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const photoId=randomUUID(),key='media/blog/'+photoId+'.webp';
 let client;
 try{client=await pool.connect()}catch{return respond({error:'blog_database_connection_failed'},503)}
 let uploaded=false;
 let stage:'begin'|'post'|'count'|'storage'|'media_record'|'audit'|'commit'='begin';
 try{
  await client.query('BEGIN');
  stage='post';
  const post=await client.query('SELECT id FROM whateato_blog_posts WHERE id=$1 FOR UPDATE',[id]);
  if(!post.rowCount){await client.query('ROLLBACK');return respond({error:'post_not_found'},404)}
  stage='count';
  const count=await client.query<{n:number}>(`
    SELECT count(*)::int AS n FROM whateato_blog_media WHERE post_id=$1`,[id]);
  if(count.rows[0].n>=30){
    await client.query('ROLLBACK');return respond({error:'max_30_blog_images'},409);
  }
  stage='storage';
  await savePhoto(key,data);uploaded=true;
  stage='media_record';
  await client.query(`
    INSERT INTO whateato_blog_media(id,post_id,storage_key,media_role,alt_text,
     source_url,rights_reference,file_bytes,width,height,created_by,rights_status,approved_by,approved_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'approved',$11,now())`,[
    photoId,id,key,role,alt.trim(),'','',data.length,width,height,staff.accountId
  ]);
  stage='audit';
  await client.query(`
    INSERT INTO whateato_blog_audit(post_id,actor_id,action)
    VALUES($1,$2,'image_uploaded')`,[id,staff.accountId]);
  stage='commit';
  await client.query('COMMIT');
  return respond({id:photoId,media_role:role,rights_status:'approved',
    image_url:'/api/v1/owner/blog/images/'+photoId,width,height},201);
 }catch(e){
  console.error('[blog-media] upload failed', {stage,code:(e as NodeJS.ErrnoException).code||'unknown'});
  await client.query('ROLLBACK').catch(()=>{});
  if(uploaded)await deletePhoto(key).catch(()=>{});
  const code=(e as NodeJS.ErrnoException).code;
  const reason=stage==='storage'?
   (code==='EACCES'||code==='EPERM'?'media_directory_permission_denied':
    code==='ENOENT'?'media_directory_not_found':
    code==='EROFS'?'media_directory_read_only':
    code==='ENOSPC'?'media_disk_full':
    e instanceof Error&&e.message==='local_media_directory_symlink_not_allowed'?'media_directory_path_mismatch':
    'media_file_write_failed'):
   stage==='media_record'||stage==='audit'?'media_database_write_failed':
   stage==='commit'?'media_database_commit_failed':'media_database_request_failed';
  return respond({error:'blog_image_upload_unavailable',reason,stage},503);
 }finally{client.release()}
}
