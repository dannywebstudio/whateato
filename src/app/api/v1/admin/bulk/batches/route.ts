import {NextRequest,NextResponse} from 'next/server';
import {bulkAdminAccess,bulkPool,bulkPrivateHeaders,boundedJson} from '@/lib/bulk-content-admin';
import {isUuid} from '@/lib/platform-v1';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:bulkPrivateHeaders});

export async function GET(req:NextRequest){
  const auth=bulkAdminAccess(req);
  if(!auth.ok)return respond({error:auth.error},auth.status);
  const pool=bulkPool();
  if(!pool)return respond({error:'database_not_configured'},503);
  const rawLimit=req.nextUrl.searchParams.get('limit');
  const limit=rawLimit===null?20:Number(rawLimit);
  const before=req.nextUrl.searchParams.get('before');
  if(!Number.isInteger(limit)||limit<1||limit>50||(before!==null&&!isUuid(before)))
    return respond({error:'invalid_cursor'},400);
  try{
    const r=await pool.query(`
      SELECT b.id::text,b.title,b.state,b.created_at::text,b.updated_at::text,
        count(i.id)::int AS total,
        count(i.id) FILTER(WHERE i.state='applied')::int AS applied,
        count(i.id) FILTER(WHERE i.state='failed')::int AS failed
      FROM (SELECT * FROM whateato_bulk_batches
            WHERE ($1::uuid IS NULL OR id<$1::uuid)
            ORDER BY id DESC LIMIT $2) b
      LEFT JOIN whateato_bulk_items i ON i.batch_id=b.id
      GROUP BY b.id,b.title,b.state,b.created_at,b.updated_at
      ORDER BY b.id DESC`,[before,limit+1]);
    return respond({items:r.rows.slice(0,limit),has_more:r.rows.length>limit,
      next_cursor:r.rows.length>limit?r.rows[limit-1].id:null});
  }catch{return respond({error:'bulk_schema_unavailable'},503)}
}
export async function POST(req:NextRequest){
  const auth=bulkAdminAccess(req);
  if(!auth.ok)return respond({error:auth.error},auth.status);
  const data=await boundedJson(req,4096);
  if(!data.ok)return respond({error:data.error},data.status);
  const b=data.value;
  if(!b||typeof b!=='object'||Array.isArray(b))return respond({error:'invalid_batch'},400);
  const x=b as Record<string,unknown>;
  if(Object.keys(x).some(k=>!['client_key','title'].includes(k))||
    typeof x.client_key!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{7,79}$/.test(x.client_key)||
    typeof x.title!=='string'||x.title.trim().length<3||[...x.title.trim()].length>120||
    /[\u0000-\u001f\u007f]/.test(x.title))return respond({error:'invalid_batch'},400);
  const pool=bulkPool();
  if(!pool)return respond({error:'database_not_configured'},503);
  try{
    const q=await pool.query<{id:string;title:string;state:string;created:boolean}>(`
      WITH inserted AS (
        INSERT INTO whateato_bulk_batches(client_key,title) VALUES ($1,$2)
        ON CONFLICT(client_key) DO NOTHING
        RETURNING id,title,state
      ), audited AS (
        INSERT INTO whateato_bulk_audit(batch_id,action)
        SELECT id,'created' FROM inserted RETURNING batch_id
      )
      SELECT id::text,title,state,true AS created FROM inserted
      UNION ALL
      SELECT id::text,title,state,false AS created FROM whateato_bulk_batches
        WHERE client_key=$1 AND NOT EXISTS (SELECT 1 FROM inserted)
      LIMIT 1`,[x.client_key,x.title.trim()]);
    const row=q.rows[0];
    if(!row)return respond({error:'batch_conflict'},409);
    if(row.title!==x.title.trim())return respond({error:'idempotency_key_conflict'},409);
    return respond({id:row.id,state:row.state,created:row.created},row.created?201:200);
  }catch{return respond({error:'bulk_schema_unavailable'},503)}
}
