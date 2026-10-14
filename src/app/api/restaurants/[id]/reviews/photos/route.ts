import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {NextRequest,NextResponse} from 'next/server';
import {auth,authReady} from '@/auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {safeSameOrigin} from '@/lib/owner-cms-auth';
import {savePhoto,deletePhoto,objectStorageReady} from '@/lib/cms-object-storage';

export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const headers={'Cache-Control':'private, no-store','Vary':'Cookie'} as const;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers});
async function account(){
 if(!authReady())return null;
 const session=await auth();
 return session?.user?.id&&isUuid(session.user.id)?session.user.id:null;
}
export async function POST(req:NextRequest,{params}:Ctx){
 const {id}=await params;
 if(!isUuid(id))return reply({error:'invalid_restaurant'},400);
 if(!safeSameOrigin(req))return reply({error:'cross_site_request'},403);
 const owner=await account();
 if(!owner)return reply({error:'login_required'},401);
 if(!objectStorageReady())return reply({error:'media_storage_unavailable'},503);
 if(!req.headers.get('content-type')?.startsWith('multipart/form-data'))
   return reply({error:'multipart_required'},415);
 if(Number(req.headers.get('content-length')||0)>3_800_000)
   return reply({error:'photo_too_large'},413);
 // A bounded stream prevents chunked requests from using unbounded server RAM.
 const reader=req.body?.getReader();
 if(!reader)return reply({error:'empty_body'},400);
 const chunks:Uint8Array[]=[];let total=0;
 try{
  while(true){
   const next=await reader.read();if(next.done)break;
   total+=next.value.byteLength;
   if(total>3_800_000){void reader.cancel();return reply({error:'photo_too_large'},413)}
   chunks.push(next.value);
  }
 }catch{return reply({error:'upload_stream_failed'},400)}
 const buffered=new Request(req.url,{method:'POST',headers:{
   'Content-Type':req.headers.get('content-type')||''},
   body:Buffer.concat(chunks).toString('binary')});
 // Use raw bytes for multipart; never roundtrip binary through UTF-8.
 let data:FormData;
 try{
  const raw=Buffer.concat(chunks);
  const parsed=new Request(req.url,{method:'POST',headers:{
   'Content-Type':req.headers.get('content-type')||''},body:new Uint8Array(raw)});
  data=await parsed.formData();
 }catch{return reply({error:'invalid_multipart'},400)}
 void buffered;
 const file=data.get('file'),permission=data.get('rights_confirmation');
 if(!(file instanceof File)||file.size<256||file.size>3_000_000||
  !['image/jpeg','image/png','image/webp'].includes(file.type)||
  permission!=='yes')return reply({error:'invalid_photo_or_rights'},400);
 let transformed:Buffer;let width=0,height=0;
 try{
  const incoming=Buffer.from(await file.arrayBuffer());
  const info=await sharp(incoming,{limitInputPixels:24_000_000,failOn:'error'}).metadata();
  if(!info.width||!info.height||info.width<300||info.height<200)
    return reply({error:'photo_dimensions_invalid'},400);
  const out=await sharp(incoming,{limitInputPixels:24_000_000,failOn:'error'})
   .rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true})
   .webp({quality:76,effort:5}).toBuffer({resolveWithObject:true});
  transformed=out.data;width=out.info.width;height=out.info.height;
  if(transformed.length>3_000_000)return reply({error:'optimized_photo_too_large'},413);
 }catch{return reply({error:'invalid_image'},400)}
 const pool=getPool();if(!pool)return reply({error:'database_unavailable'},503);
 const client=await pool.connect();
 const photoId=randomUUID(),key='media/reviews/'+photoId+'.webp';
 let uploaded=false;
 try{
  await client.query('BEGIN');
  const review=await client.query<{id:string;moderation_status:string}>(`
    SELECT r.id::text,r.moderation_status FROM whateato_user_reviews r
    WHERE r.restaurant_id=$1 AND r.account_id=$2 FOR UPDATE`,[id,owner]);
  if(!review.rows.length){await client.query('ROLLBACK');return reply({error:'save_review_first'},409)}
  if(review.rows[0].moderation_status!=='pending'){
   await client.query('ROLLBACK');return reply({error:'resubmit_review_before_adding_photos'},409);
  }
  const reviewId=review.rows[0].id;
  const count=await client.query<{n:number}>(`
    SELECT count(*)::int AS n FROM whateato_review_photo_assets WHERE review_id=$1`,[reviewId]);
  if(count.rows[0].n>=5){
   await client.query('ROLLBACK');return reply({error:'photo_limit_5'},409)
  }
  const positions=await client.query<{position:number}>(`
    SELECT position FROM whateato_review_photo_assets WHERE review_id=$1 ORDER BY position`,[reviewId]);
  const taken=new Set(positions.rows.map(x=>x.position));
  const position=[0,1,2,3,4].find(i=>!taken.has(i));
  if(position===undefined)throw Error('photo_position_unavailable');
  await savePhoto(key,transformed);uploaded=true;
  await client.query(`
    INSERT INTO whateato_review_photo_assets
     (id,review_id,storage_key,mime_type,width,height,bytes,position,
      scan_state,rights_state,moderation_state)
    VALUES($1,$2,$3,'image/webp',$4,$5,$6,$7,'passed','approved','pending')`,[
     photoId,reviewId,key,width,height,transformed.length,position
    ]);
  await client.query('COMMIT');
  return reply({photo_id:photoId,status:'pending',position},201);
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  if(uploaded)await deletePhoto(key).catch(()=>{});
  return reply({error:'photo_upload_unavailable'},503);
 }finally{client.release()}
}
export async function DELETE(req:NextRequest,{params}:Ctx){
 const {id}=await params;
 if(!isUuid(id))return reply({error:'invalid_restaurant'},400);
 if(!safeSameOrigin(req))return reply({error:'cross_site_request'},403);
 const user=await account();if(!user)return reply({error:'login_required'},401);
 const photo=req.nextUrl.searchParams.get('photo_id');
 if(!photo||!isUuid(photo))return reply({error:'invalid_photo_id'},400);
 const pool=getPool();if(!pool)return reply({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const found=await client.query<{storage_key:string}>(`
    SELECT p.storage_key FROM whateato_review_photo_assets p
    JOIN whateato_user_reviews r ON r.id=p.review_id
    WHERE p.id=$1 AND r.restaurant_id=$2 AND r.account_id=$3 FOR UPDATE`,[
     photo,id,user
    ]);
  if(!found.rows.length){await client.query('ROLLBACK');return reply({error:'not_found'},404)}
  await client.query(`
    INSERT INTO whateato_review_photo_cleanup(storage_key) VALUES($1)
    ON CONFLICT(storage_key) DO NOTHING`,[found.rows[0].storage_key]);
  await client.query('DELETE FROM whateato_review_photo_assets WHERE id=$1',[photo]);
  await client.query('COMMIT');
  return reply({deleted:true});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return reply({error:'photo_removal_unavailable'},503);
 }finally{client.release()}
}
