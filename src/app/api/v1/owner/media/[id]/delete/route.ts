import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {deletePhoto} from '@/lib/cms-object-storage';
export const runtime='nodejs';
type Ctx={params:Promise<{id:string}>};
const respond=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:ownerHeaders});
export async function DELETE(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'publish'))return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id}=await params;
 if(!isUuid(id)||req.headers.get('x-whateato-confirm-delete')!==id)return respond({error:'explicit_delete_confirmation_required'},400);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();let key='';
 try{
  await client.query('BEGIN');
  const found=await client.query<{storage_key:string}>(`SELECT i.storage_key FROM restaurant_images i
   JOIN whateato_admin_media_uploads u ON u.image_id=i.id WHERE i.id=$1 FOR UPDATE OF i`,[id]);
  if(!found.rowCount){await client.query('ROLLBACK');return respond({error:'cms_photo_not_found'},404)}
  key=found.rows[0].storage_key;
  // Delete metadata only after an authorized explicit confirmation. Atomic DB changes.
  await client.query('DELETE FROM whateato_admin_media_uploads WHERE image_id=$1',[id]);
  await client.query('DELETE FROM restaurant_images WHERE id=$1',[id]);
  await client.query('COMMIT');
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:'image_delete_database_failed'},503);
 }finally{client.release()}
 // Orphan cleanup can safely be retried if a filesystem error occurs.
 try{await deletePhoto(key)}catch{return respond({deleted:true,warning:'image_file_cleanup_pending'})}
 return respond({deleted:true});
}
