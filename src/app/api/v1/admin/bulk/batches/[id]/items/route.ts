import {NextRequest,NextResponse} from 'next/server';
import {bulkAdminAccess,bulkPool,bulkPrivateHeaders,boundedJson,validateBulkItem} from '@/lib/bulk-content-admin';
import {isUuid} from '@/lib/platform-v1';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:bulkPrivateHeaders});
export async function POST(req:NextRequest,{params}:Ctx){
  const access=bulkAdminAccess(req);if(!access.ok)return respond({error:access.error},access.status);
  const {id}=await params;if(!isUuid(id))return respond({error:'invalid_batch_id'},400);
  const input=await boundedJson(req);
  if(!input.ok)return respond({error:input.error},input.status);
  if(!input.value||typeof input.value!=='object'||Array.isArray(input.value)||
    Object.keys(input.value).some(k=>k!=='items'))
    return respond({error:'invalid_items'},400);
  const entries=(input.value as {items?:unknown}).items;
  if(!Array.isArray(entries)||entries.length<1||entries.length>50)
    return respond({error:'item_count_must_be_1_to_50'},400);
  const safe=entries.map(validateBulkItem);
  const first=safe.find(x=>!x.ok);
  if(first&&!first.ok)return respond({error:first.error},400);
  const items=safe.filter(x=>x.ok).map(x=>x.value);
  if(new Set(items.map(x=>x.source_key)).size!==items.length)
    return respond({error:'duplicate_source_key_in_request'},400);
  const pool=bulkPool();
  if(!pool)return respond({error:'database_not_configured'},503);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const batch=await client.query<{state:string}>(`
      SELECT state FROM whateato_bulk_batches WHERE id=$1 FOR UPDATE`,[id]);
    if(!batch.rowCount){await client.query('ROLLBACK');return respond({error:'batch_not_found'},404)}
    if(batch.rows[0].state!=='draft'){
      await client.query('ROLLBACK');return respond({error:'batch_not_editable'},409);
    }
    const cnt=await client.query<{count:number}>(`
      SELECT count(*)::int AS count FROM whateato_bulk_items WHERE batch_id=$1`,[id]);
    if(cnt.rows[0].count+items.length>10000){
      await client.query('ROLLBACK');return respond({error:'batch_item_limit'},413);
    }
    const ids=[...new Set(items.map(x=>x.restaurant_id))];
    const known=await client.query<{id:string}>(`
      SELECT id::text FROM restaurants WHERE id=ANY($1::uuid[])`,[ids]);
    if(known.rowCount!==ids.length){
      await client.query('ROLLBACK');return respond({error:'unknown_restaurant_id'},400);
    }
    const json=JSON.stringify(items);
    const inserted=await client.query<{id:string}>(`
      INSERT INTO whateato_bulk_items(batch_id,source_key,restaurant_id,kind,payload)
      SELECT $1::uuid,r.source_key,r.restaurant_id::uuid,r.kind,r.payload
      FROM jsonb_to_recordset($2::jsonb) AS r(
        source_key text,restaurant_id text,kind text,payload jsonb)
      ON CONFLICT(batch_id,source_key) DO NOTHING RETURNING id::text`,[id,json]);
    const mismatch=await client.query<{conflicts:number}>(`
      SELECT count(*)::int AS conflicts
      FROM jsonb_to_recordset($2::jsonb)
        AS r(source_key text,restaurant_id text,kind text,payload jsonb)
      JOIN whateato_bulk_items i ON i.batch_id=$1::uuid AND i.source_key=r.source_key
      WHERE i.restaurant_id<>r.restaurant_id::uuid OR i.kind<>r.kind OR i.payload<>r.payload`,
    [id,json]);
    if(mismatch.rows[0].conflicts){
      await client.query('ROLLBACK');return respond({error:'source_key_payload_conflict'},409);
    }
    if(inserted.rowCount){
      await client.query(`
        INSERT INTO whateato_bulk_audit(batch_id,action,reason_code)
        VALUES ($1,'items_added',$2)`,[id,'count_'+inserted.rowCount]);
      await client.query('UPDATE whateato_bulk_batches SET updated_at=now() WHERE id=$1',[id]);
    }
    await client.query('COMMIT');
    return respond({batch_id:id,submitted:items.length,inserted:inserted.rowCount,
      idempotent:items.length-(inserted.rowCount||0)},201);
  }catch{
    await client.query('ROLLBACK').catch(()=>{});
    return respond({error:'bulk_ingestion_unavailable'},503);
  }finally{client.release()}
}
