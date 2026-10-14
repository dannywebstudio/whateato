import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {boundedJson} from '@/lib/bulk-content-admin';
import {ownerHeaders,safeSameOrigin,currentStaff} from '@/lib/owner-cms-auth';
import {purgeReviewPhotos} from '@/lib/visitor-photo-cleanup';

const reply=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:ownerHeaders});
const reasons=new Set(['spam','abusive','personal_data','off_topic','unverifiable_claim','other']);

/** Irreversible owner action. All DB changes are one transaction; detached private S3
 * objects are queued durably, then deletion is attempted outside the transaction. */
export async function deleteReviewAsOwner(req:NextRequest,id:string){
 const staff=await currentStaff();
 if(!staff||staff.role!=='owner')return reply({error:'owner_required'},403);
 if(!safeSameOrigin(req))return reply({error:'cross_site_request'},403);
 if(!isUuid(id))return reply({error:'invalid_review_id'},400);
 const parsed=await boundedJson(req,1024);
 if(!parsed.ok)return reply({error:parsed.error},parsed.status);
 const p=parsed.value;
 if(!p||Array.isArray(p)||typeof p!=='object')return reply({error:'invalid_confirmation'},400);
 const fields=p as Record<string,unknown>;
 if(Object.keys(fields).some(k=>!['reason_code','confirm_review_id','confirmation'].includes(k))||
   !reasons.has(fields.reason_code as string)||
   fields.confirm_review_id!==id||fields.confirmation!=='DELETE')
    return reply({error:'explicit_delete_confirmation_required'},400);
 const pool=getPool();if(!pool)return reply({error:'database_unavailable'},503);
 const client=await pool.connect();
 let keys:string[]=[];
 try{
  await client.query('BEGIN');
  const review=await client.query<{id:string;restaurant_id:string;moderation_status:string}>(`
    SELECT id::text,restaurant_id::text,moderation_status
    FROM whateato_user_reviews WHERE id=$1 FOR UPDATE`,[id]);
  if(!review.rows.length){
   await client.query('ROLLBACK');
   return reply({error:'review_not_found'},404);
  }
  const row=review.rows[0];
  const photos=await client.query<{storage_key:string}>(`
    SELECT storage_key FROM whateato_review_photo_assets WHERE review_id=$1 FOR UPDATE`,[id]);
  keys=photos.rows.map(x=>x.storage_key);
  await client.query(`
    INSERT INTO whateato_review_deletion_audit
       (review_id,restaurant_id,reason_code,previous_state,queued_photo_count)
    VALUES($1,$2,$3,$4,$5)`,[id,row.restaurant_id,fields.reason_code,row.moderation_status,keys.length]);
  if(keys.length){
   await client.query(`
     INSERT INTO whateato_review_photo_cleanup(storage_key)
     SELECT storage_key FROM whateato_review_photo_assets WHERE review_id=$1
     ON CONFLICT(storage_key) DO NOTHING`,[id]);
  }
  // Foreign-key cascades remove moderation history, category scores and photo
  // metadata. This avoids retaining the original user narrative after deletion.
  await client.query('DELETE FROM whateato_user_reviews WHERE id=$1',[id]);
  await client.query('COMMIT');
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return reply({error:'review_delete_unavailable'},503);
 }finally{client.release()}
 // Failure to delete S3 bytes never resurrects published content. The queue
 // remains available for operator-triggered retries.
 await purgeReviewPhotos(keys);
 return reply({deleted:true,review_id:id,queued_photos:keys.length});
}
