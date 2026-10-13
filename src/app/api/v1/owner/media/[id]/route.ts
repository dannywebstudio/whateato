import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {objectStorageReady,photoExists} from '@/lib/cms-object-storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:ownerHeaders});
export async function PATCH(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'publish'))return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id}=await params;
 if(!isUuid(id))return respond({error:'invalid_image_id'},400);
 if(Number(req.headers.get('content-length')||0)>512)return respond({error:'payload_too_large'},413);
 let body:unknown;try{body=await req.json()}catch{return respond({error:'invalid_json'},400)}
 if(!body||typeof body!=='object'||Array.isArray(body)||
   Object.keys(body).some(k=>k!=='decision'))return respond({error:'invalid_action'},400);
 const decision=(body as {decision?:unknown}).decision;
 if(!['approve','reject','hide'].includes(String(decision)))return respond({error:'invalid_action'},400);
 const pool=getPool();if(!pool)return respond({error:'database_not_configured'},503);
 try{
   const image=await pool.query<{storage_key:string;rights_status:string;publication_state:string}>(`
     SELECT storage_key,rights_status,publication_state FROM restaurant_images WHERE id=$1`,[id]);
   if(!image.rows.length)return respond({error:'image_not_found'},404);
   if(decision==='approve'){
     if(!objectStorageReady())return respond({error:'private_storage_not_configured'},503);
     if(image.rows[0].rights_status!=='pending')return respond({error:'not_pending'},409);
     await photoExists(image.rows[0].storage_key);
   }
   const updated=await pool.query(`
     UPDATE restaurant_images SET
       rights_status=CASE
         WHEN $2='approve' THEN 'approved'
         WHEN $2='reject' THEN 'rejected' ELSE rights_status END,
       publication_state=CASE WHEN $2='approve' THEN 'published' ELSE 'draft' END,
       rights_verified_at=CASE WHEN $2='approve' THEN now() ELSE NULL END
     WHERE id=$1 AND (
       ($2 IN ('approve','reject') AND rights_status='pending')
       OR ($2='hide' AND publication_state='published')
     )
     AND EXISTS(SELECT 1 FROM whateato_admin_media_uploads a WHERE a.image_id=$1)
     RETURNING id`,[id,decision]);
   if(!updated.rowCount)return respond({error:'invalid_image_transition'},409);
   return respond({image_id:id,status:decision});
 }catch{return respond({error:'image_review_unavailable'},503)}
}
