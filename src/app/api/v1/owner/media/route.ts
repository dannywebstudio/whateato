import {randomUUID} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import sharp from 'sharp';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {objectStorageReady,savePhoto,deletePhoto} from '@/lib/cms-object-storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:ownerHeaders});
export async function POST(req:NextRequest){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'edit'))return respond({error:'forbidden'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 if(!objectStorageReady())return respond({error:'private_storage_not_configured'},503);
 const declared=Number(req.headers.get('content-length')||0);
 if(declared>9*1024*1024)return respond({error:'payload_too_large'},413);
 if(!req.headers.get('content-type')?.startsWith('multipart/form-data'))
   return respond({error:'multipart_required'},415);
 let input:FormData;
 try{input=await req.formData()}catch{return respond({error:'invalid_multipart'},400)}
 const file=input.get('file'),id=input.get('restaurant_id');
 const source=input.get('source_reference'),permission=input.get('rights_reference');
 const position=Number(input.get('position')||0);
 if(!(file instanceof File)||file.size<64||file.size>8*1024*1024||
   !['image/jpeg','image/png','image/webp'].includes(file.type)||
   typeof id!=='string'||!isUuid(id)||
   typeof source!=='string'||!/^https:\/\/\S{5,695}$/.test(source)||
   typeof permission!=='string'||!/^https:\/\/\S{5,695}$/.test(permission)||
   input.get('rights_confirmation')!=='yes'||!Number.isInteger(position)||position<0||position>100)
   return respond({error:'invalid_image_metadata_or_rights'},400);
 const pool=getPool();if(!pool)return respond({error:'database_not_configured'},503);
 let bytes:Buffer,meta:sharp.OutputInfo;
 try{
   const original=Buffer.from(await file.arrayBuffer());
   const info=await sharp(original,{limitInputPixels:32_000_000,failOn:'error'}).metadata();
   if(!info.width||!info.height||info.width<320||info.height<240)
     return respond({error:'image_too_small_min_320x240'},400);
   const optimized=await sharp(original,{limitInputPixels:32_000_000,failOn:'error'})
      .rotate().resize({width:1600,height:1200,fit:'inside',withoutEnlargement:true})
      .webp({quality:78,effort:5}).toBuffer({resolveWithObject:true});
   bytes=optimized.data;meta=optimized.info;
   if(bytes.length>8*1024*1024)return respond({error:'optimized_image_too_large'},413);
 }catch{return respond({error:'image_decode_failed'},400)}
 const photoId=randomUUID();const key='media/cms/'+photoId+'.webp';
 try{
   const exists=await pool.query(`SELECT id FROM restaurants
      WHERE id=$1 AND business_status='active' AND publication_status='published'`,[id]);
   if(!exists.rowCount)return respond({error:'restaurant_not_publishable'},409);
   await savePhoto(key,bytes);
   try{
     await pool.query(`
       WITH image AS(
        INSERT INTO restaurant_images(id,restaurant_id,storage_key,alt_ko,source_reference,
           usage_rights_reference,rights_status,publication_state,position)
        VALUES($1,$2,$3,$4,$5,$6,'pending','draft',$7) RETURNING id
       )
       INSERT INTO whateato_admin_media_uploads(image_id,storage_provider,width,height,file_bytes,mime_type)
       SELECT id,'s3_compatible',$8,$9,$10,'image/webp' FROM image`,
       [photoId,id,key,file.name.slice(0,120),source,permission,position,meta.width,meta.height,bytes.length]);
   }catch(error){
     await deletePhoto(key).catch(()=>{});
     throw error;
   }
   return respond({image_id:photoId,state:'pending',width:meta.width,height:meta.height,bytes:bytes.length},201);
 }catch{return respond({error:'photo_storage_unavailable'},503)}
}
