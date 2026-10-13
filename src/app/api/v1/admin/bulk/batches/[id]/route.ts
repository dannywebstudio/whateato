import {NextRequest,NextResponse} from 'next/server';
import {bulkAdminAccess,bulkPool,bulkPrivateHeaders} from '@/lib/bulk-content-admin';
import {isUuid} from '@/lib/platform-v1';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:bulkPrivateHeaders});
export async function GET(req:NextRequest,{params}:Context){
  const access=bulkAdminAccess(req);if(!access.ok)return respond({error:access.error},access.status);
  const {id}=await params;if(!isUuid(id))return respond({error:'invalid_batch_id'},400);
  const raw=req.nextUrl.searchParams.get('after')||'0';
  if(!/^\d{1,16}$/.test(raw))return respond({error:'invalid_cursor'},400);
  const pool=bulkPool();if(!pool)return respond({error:'database_not_configured'},503);
  try{
    const [batch,items,audit]=await Promise.all([
      pool.query(`SELECT id::text,title,state,created_at::text,approved_at::text,
        (SELECT count(*)::int FROM whateato_bulk_items WHERE batch_id=$1) AS total,
        (SELECT count(*)::int FROM whateato_bulk_items WHERE batch_id=$1 AND state='pending') AS pending,
        (SELECT count(*)::int FROM whateato_bulk_items WHERE batch_id=$1 AND state='applied') AS applied,
        (SELECT count(*)::int FROM whateato_bulk_items WHERE batch_id=$1 AND state='failed') AS failed
        FROM whateato_bulk_batches WHERE id=$1`,[id]),
      pool.query(`SELECT id::text,source_key,restaurant_id::text,kind,payload,state,error_code
        FROM whateato_bulk_items WHERE batch_id=$1 AND id>$2::bigint
        ORDER BY id LIMIT 51`,[id,raw]),
      pool.query(`SELECT id::text,item_id::text,action,reason_code,created_at::text
        FROM whateato_bulk_audit WHERE batch_id=$1 ORDER BY id DESC LIMIT 20`,[id])
    ]);
    if(!batch.rows.length)return respond({error:'batch_not_found'},404);
    return respond({batch:batch.rows[0],items:items.rows.slice(0,50),
      next_cursor:items.rows.length>50?items.rows[49].id:null,
      recent_audit:audit.rows});
  }catch{return respond({error:'bulk_query_unavailable'},503)}
}
