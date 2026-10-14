import {NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {readPhoto} from '@/lib/cms-object-storage';
import {currentStaff,hasPermission} from '@/lib/owner-cms-auth';
const mediaHeaders={'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',
 'Content-Security-Policy':"default-src 'none'; sandbox",'Vary':'Cookie'} as const;
const fail=(code:string,status:number)=>NextResponse.json({error:code},{status,headers:mediaHeaders});
export async function serveVisitorPhoto(id:string,admin:boolean){
 if(!isUuid(id))return fail('not_found',404);
 if(admin){
  const staff=await currentStaff();
  if(!staff||!hasPermission(staff,'moderate'))return fail('forbidden',403);
 }
 const pool=getPool();if(!pool)return fail('database_unavailable',503);
 try{
  const result=await pool.query<{storage_key:string}>(`
   SELECT p.storage_key FROM whateato_review_photo_assets p
   JOIN whateato_user_reviews r ON r.id=p.review_id
   WHERE p.id=$1
     ${admin?'':`AND r.moderation_status='published'
       AND p.scan_state='passed' AND p.rights_state='approved'
       AND p.moderation_state='approved'
       AND EXISTS(SELECT 1 FROM restaurants v WHERE v.id=r.restaurant_id
         AND v.business_status='active' AND v.publication_status='published')`}
   LIMIT 1`,[id]);
  if(!result.rows.length)return fail('not_found',404);
  const bytes=await readPhoto(result.rows[0].storage_key);
  return new NextResponse(new Uint8Array(bytes),{status:200,headers:{
   ...mediaHeaders,'Content-Type':'image/webp','Content-Length':String(bytes.length)
  }});
 }catch{return fail('media_unavailable',503)}
}
