import {NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {objectStorageReady,probeObjectStorage} from '@/lib/cms-object-storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
const respond=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:ownerHeaders});
export async function GET(){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'edit'))return respond({error:'forbidden'},403);
 const pool=getPool();
 if(!pool)return respond({error:'database_not_configured'},503);
 let schemaReady=false;
 try{
  const r=await pool.query<{batches:string|null;roles:string|null;media:string|null}>(`
    SELECT to_regclass('public.whateato_bulk_batches')::text AS batches,
    to_regclass('public.whateato_admin_accounts')::text AS roles,
    to_regclass('public.whateato_admin_media_uploads')::text AS media`);
  schemaReady=Boolean(r.rows[0]?.batches&&r.rows[0]?.roles&&r.rows[0]?.media);
 }catch{return respond({error:'database_schema_unavailable'},503)}
 const storageConfigured=objectStorageReady();
 const storageReachable=storageConfigured?await probeObjectStorage():false;
 return respond({
  role:staff.role,
  database_schema:schemaReady?'ready':'migration_required',
  google_session:'verified',
  bulk_api:process.env.WHATEATO_BULK_ADMIN_ENABLED==='true'&&
    (process.env.WHATEATO_BULK_ADMIN_TOKEN||'').length>=32?'configured':'disabled',
  review_moderation:process.env.WHATEATO_REVIEW_MODERATION_ENABLED==='true'&&
    (process.env.WHATEATO_REVIEW_ADMIN_TOKEN||'').length>=32?'configured':'disabled',
  photo_storage:storageReachable?'connected':storageConfigured?'unreachable':'not_configured',
  bootstrap_enabled:process.env.WHATEATO_CMS_BOOTSTRAP_ENABLED==='true'
 });
}
