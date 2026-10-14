import {NextRequest,NextResponse} from 'next/server';
import {bulkAdminAccess,bulkPool,bulkPrivateHeaders,boundedJson,type BulkInput} from '@/lib/bulk-content-admin';
import {applyBulkItem} from '@/lib/bulk-content-worker';
import {isUuid} from '@/lib/platform-v1';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
type BatchState='draft'|'review'|'approved'|'processing'|'completed'|'completed_with_errors'|'rejected'|'cancelled';
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:bulkPrivateHeaders});
const allowed=new Set(['submit','approve','reject','cancel','apply']);

export async function POST(req:NextRequest,{params}:Context){
  const access=bulkAdminAccess(req);if(!access.ok)return respond({error:access.error},access.status);
  const {id}=await params;if(!isUuid(id))return respond({error:'invalid_batch_id'},400);
  const parsed=await boundedJson(req,1024);
  if(!parsed.ok)return respond({error:parsed.error},parsed.status);
  if(!parsed.value||typeof parsed.value!=='object'||Array.isArray(parsed.value))
    return respond({error:'invalid_action'},400);
  const body=parsed.value as Record<string,unknown>;
  if(Object.keys(body).some(k=>!['action','confirm_batch_id'].includes(k))||
    typeof body.action!=='string'||!allowed.has(body.action))
    return respond({error:'invalid_action'},400);
  const action=body.action;
  if((action==='approve'||action==='apply'||action==='reject')&&body.confirm_batch_id!==id)
    return respond({error:'confirmation_required'},400);
  const pool=bulkPool();if(!pool)return respond({error:'database_not_configured'},503);
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    const batch=await client.query<{state:BatchState}>(`
      SELECT state FROM whateato_bulk_batches WHERE id=$1 FOR UPDATE`,[id]);
    if(!batch.rowCount){
      await client.query('ROLLBACK');return respond({error:'batch_not_found'},404);
    }
    const state=batch.rows[0].state;
    const valid=(action==='submit'&&state==='draft')||
      (action==='approve'&&state==='review')||
      (action==='reject'&&state==='review')||
      (action==='cancel'&&(state==='draft'||state==='review'))||
      (action==='apply'&&(state==='approved'||state==='processing'));
    if(!valid){
      await client.query('ROLLBACK');return respond({error:'invalid_state_transition',state},409);
    }
    if(action==='submit'||action==='approve'){
      const count=await client.query<{n:number}>(`
        SELECT count(*)::int AS n FROM whateato_bulk_items WHERE batch_id=$1`,[id]);
      if(count.rows[0].n===0){
        await client.query('ROLLBACK');return respond({error:'empty_batch'},409);
      }
    }
    if(action==='approve'){
      // Global-first publication gate: don't publish another-language profile
      // without either published English or an English record in this batch.
      const missing=await client.query<{n:number}>(`
        SELECT count(*)::int AS n FROM whateato_bulk_items i
        WHERE i.batch_id=$1 AND i.kind='localization'
          AND i.payload->>'locale'<>'en'
          AND NOT EXISTS (
            SELECT 1 FROM restaurant_localizations l
            WHERE l.restaurant_id=i.restaurant_id AND l.locale='en'
              AND l.publication_state='published'
          )
          AND NOT EXISTS (
            SELECT 1 FROM whateato_bulk_items en
            WHERE en.batch_id=$1 AND en.restaurant_id=i.restaurant_id
              AND en.kind='localization' AND en.payload->>'locale'='en'
          )`,[id]);
      if(missing.rows[0].n){
        await client.query('ROLLBACK');return respond({error:'english_first_profile_required',count:missing.rows[0].n},409);
      }
    }
    if(action!=='apply'){
      const next:BatchState=action==='submit'?'review':action==='approve'?'approved':
        action==='reject'?'rejected':'cancelled';
      await client.query(`
        UPDATE whateato_bulk_batches SET state=$2,updated_at=now(),
          approved_at=CASE WHEN $2='approved' THEN now() ELSE approved_at END
        WHERE id=$1`,[id,next]);
      await client.query(`INSERT INTO whateato_bulk_audit(batch_id,action)
        VALUES ($1,$2)`,[id,action==='submit'?'submitted':action==='approve'?'approved':
          action==='reject'?'rejected':'cancelled']);
      await client.query('COMMIT');
      return respond({batch_id:id,state:next});
    }
    const rows=await client.query<{
      id:string;restaurant_id:string;source_key:string;kind:BulkInput['kind'];payload:Record<string,unknown>
    }>(`
      SELECT id::text,restaurant_id::text,source_key,kind,payload
      FROM whateato_bulk_items WHERE batch_id=$1 AND state='pending'
      ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 20`,[id]);
    let applied=0,failed=0;
    for(const row of rows.rows){
      await client.query('SAVEPOINT bulk_item');
      try{
        await applyBulkItem(client,{
          restaurant_id:row.restaurant_id,source_key:row.source_key,
          kind:row.kind,payload:row.payload
        },row.id);
        await client.query(`
          UPDATE whateato_bulk_items SET state='applied',applied_at=now(),error_code=NULL
          WHERE id=$1`,[row.id]);
        await client.query(`
          INSERT INTO whateato_bulk_audit(batch_id,item_id,action)
          VALUES ($1,$2,'applied')`,[id,row.id]);
        await client.query('RELEASE SAVEPOINT bulk_item');
        applied++;
      }catch{
        await client.query('ROLLBACK TO SAVEPOINT bulk_item');
        await client.query(`
          UPDATE whateato_bulk_items SET state='failed',error_code='apply_failed'
          WHERE id=$1`,[row.id]);
        await client.query(`
          INSERT INTO whateato_bulk_audit(batch_id,item_id,action,reason_code)
          VALUES ($1,$2,'failed','apply_failed')`,[id,row.id]);
        await client.query('RELEASE SAVEPOINT bulk_item');
        failed++;
      }
    }
    const totals=await client.query<{pending:number;failed:number;applied:number}>(`
      SELECT count(*) FILTER(WHERE state='pending')::int AS pending,
        count(*) FILTER(WHERE state='failed')::int AS failed,
        count(*) FILTER(WHERE state='applied')::int AS applied
      FROM whateato_bulk_items WHERE batch_id=$1`,[id]);
    const t=totals.rows[0];
    const next:BatchState=t.pending>0?'processing':
      t.failed>0?'completed_with_errors':'completed';
    await client.query(`
      UPDATE whateato_bulk_batches SET state=$2,updated_at=now() WHERE id=$1`,[id,next]);
    if(t.pending===0){
      await client.query(`
        INSERT INTO whateato_bulk_audit(batch_id,action,reason_code)
        VALUES ($1,'completed',$2)`,[id,next]);
    }
    await client.query('COMMIT');
    return respond({batch_id:id,state:next,chunk:{applied,failed},
      total:totals.rows[0],has_more:t.pending>0});
  }catch{
    await client.query('ROLLBACK').catch(()=>{});
    return respond({error:'bulk_action_unavailable'},503);
  }finally{client.release()}
}
