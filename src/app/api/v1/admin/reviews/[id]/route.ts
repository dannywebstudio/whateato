import {NextRequest,NextResponse} from 'next/server';
import {isUuid} from '@/lib/platform-v1';
import {
  noStoreAdmin,reviewAdminAccess,reviewAdminPool,REVIEW_REJECTION_CODES
} from '@/lib/review-moderation-admin';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};

// Every decision is a one-way, reviewer-initiated transition from pending.
// It creates a minimal audit row in the SAME SQL statement as the transition.
// Idempotent retries cannot accidentally reapprove or change a rejected review.
export async function PATCH(request:NextRequest,{params}:Context){
  const access=reviewAdminAccess(request);
  if(!access.ok)return NextResponse.json({error:access.error},{status:access.status,headers:noStoreAdmin});
  const {id}=await params;
  if(!isUuid(id))return NextResponse.json({error:'invalid_review_id'},{status:400,headers:noStoreAdmin});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return NextResponse.json({error:'json_required'},{status:415,headers:noStoreAdmin});
  if(Number(request.headers.get('content-length')||0)>512)
    return NextResponse.json({error:'request_too_large'},{status:413,headers:noStoreAdmin});
  let raw='';
  try{raw=await request.text()}catch{return NextResponse.json({error:'invalid_body'},{status:400,headers:noStoreAdmin})}
  if(raw.length>512)return NextResponse.json({error:'request_too_large'},{status:413,headers:noStoreAdmin});
  let body:unknown;
  try{body=JSON.parse(raw)}catch{return NextResponse.json({error:'invalid_json'},{status:400,headers:noStoreAdmin})}
  if(!body||Array.isArray(body)||typeof body!=='object')
    return NextResponse.json({error:'invalid_decision'},{status:400,headers:noStoreAdmin});
  const fields=body as Record<string,unknown>;
  if(Object.keys(fields).some(x=>!['decision','reason_code'].includes(x)))
    return NextResponse.json({error:'unexpected_fields'},{status:400,headers:noStoreAdmin});
  if(fields.decision!=='approve'&&fields.decision!=='reject')
    return NextResponse.json({error:'invalid_decision'},{status:400,headers:noStoreAdmin});
  const approval=fields.decision==='approve';
  if((approval&&fields.reason_code!==undefined&&fields.reason_code!=='approved_guidelines')||
     (!approval&&!REVIEW_REJECTION_CODES.has(fields.reason_code as string)))
    return NextResponse.json({error:'invalid_reason_code'},{status:400,headers:noStoreAdmin});
  const status=approval?'published':'rejected';
  const reason=approval?'approved_guidelines':fields.reason_code as string;
  const pool=reviewAdminPool();
  if(!pool)return NextResponse.json({error:'database_not_configured'},{status:503,headers:noStoreAdmin});
  try{
    const res=await pool.query<{id:string;restaurant_id:string;moderation_status:string}>(`
      WITH changed AS (
        UPDATE whateato_user_reviews v
        SET moderation_status=$2::text,reviewed_at=now(),updated_at=now()
        WHERE v.id=$1::uuid AND v.moderation_status='pending'
          AND ($2::text='rejected' OR EXISTS (
            SELECT 1 FROM restaurants r WHERE r.id=v.restaurant_id
              AND r.business_status='active' AND r.publication_status='published'
          ))
        RETURNING v.id,v.restaurant_id,v.moderation_status
      ),
      audit AS (
        INSERT INTO whateato_review_moderation_audit(review_id,decision,reason_code)
        SELECT changed.id,$2::text,$3::text FROM changed
        RETURNING review_id
      )
      SELECT changed.id::text AS id,changed.restaurant_id::text AS restaurant_id,
             changed.moderation_status
      FROM changed JOIN audit ON audit.review_id=changed.id`,[id,status,reason]);
    if(!res.rows[0])return NextResponse.json({error:'not_pending_or_not_publishable'},
      {status:409,headers:noStoreAdmin});
    return NextResponse.json({
      review_id:res.rows[0].id,restaurant_id:res.rows[0].restaurant_id,
      status:res.rows[0].moderation_status,reason_code:reason,
      message:'Manual moderation decision recorded.'
    },{status:200,headers:noStoreAdmin});
  }catch{
    return NextResponse.json({error:'moderation_update_unavailable'},
      {status:503,headers:noStoreAdmin});
  }
}
