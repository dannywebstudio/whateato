import {getPool} from '@/lib/db';
import {deletePhoto,objectStorageReady} from '@/lib/cms-object-storage';
const safe=/^media\/reviews\/[0-9a-f-]{36}\.webp$/;
// Purge best-effort immediately. Failed purges remain in a durable DB queue,
// so object bytes can be retried instead of silently leaking after a user deletion.
export async function purgeReviewPhotos(keys:string[]){
 if(!keys.length||!objectStorageReady())return;
 const pool=getPool();if(!pool)return;
 for(const key of [...new Set(keys)].slice(0,20)){
  if(!safe.test(key))continue;
  try{
   await deletePhoto(key);
   await pool.query(`UPDATE whateato_review_photo_cleanup
     SET completed_at=now(),attempts=attempts+1
     WHERE storage_key=$1 AND completed_at IS NULL`,[key]);
  }catch{
   await pool.query(`UPDATE whateato_review_photo_cleanup
     SET attempts=least(attempts+1,1000)
     WHERE storage_key=$1 AND completed_at IS NULL`,[key]).catch(()=>{});
  }
 }
}
