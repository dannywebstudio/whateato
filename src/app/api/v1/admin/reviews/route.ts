import {NextRequest,NextResponse} from 'next/server';
import {noStoreAdmin,reviewAdminAccess,reviewAdminPool} from '@/lib/review-moderation-admin';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Authorized moderation queue; excludes reviewer accounts and Google IDs.
// Full text is confined to this bearer-authenticated administrative endpoint.
export async function GET(request:NextRequest){
  const access=reviewAdminAccess(request);
  if(!access.ok)return NextResponse.json({error:access.error},{status:access.status,headers:noStoreAdmin});
  const status=request.nextUrl.searchParams.get('status')||'pending';
  if(!['pending','published','rejected'].includes(status))
    return NextResponse.json({error:'invalid_review_status'},{status:400,headers:noStoreAdmin});
  const rawLimit=request.nextUrl.searchParams.get('limit');
  const rawOffset=request.nextUrl.searchParams.get('offset');
  const limit=rawLimit===null?20:Number(rawLimit);
  const offset=rawOffset===null?0:Number(rawOffset);
  if(!Number.isInteger(limit)||limit<1||limit>50||
     !Number.isInteger(offset)||offset<0||offset>1000)
    return NextResponse.json({error:'invalid_pagination'},{status:400,headers:noStoreAdmin});
  const pool=reviewAdminPool();
  if(!pool)return NextResponse.json({error:'database_not_configured'},{status:503,headers:noStoreAdmin});
  try{
    const res=await pool.query<{
      id:string;restaurant_id:string;restaurant_name:string;rating:number;body:string;
      created_at:string;updated_at:string
    }>(`
      SELECT rv.id::text AS id,rv.restaurant_id::text AS restaurant_id,
        r.name_ko AS restaurant_name,rv.rating,rv.body,
        rv.created_at::text AS created_at,rv.updated_at::text AS updated_at
      FROM whateato_user_reviews rv
      JOIN restaurants r ON r.id=rv.restaurant_id
      WHERE rv.moderation_status=$3
      ORDER BY rv.created_at ASC,rv.id ASC
      LIMIT $1 OFFSET $2`,[limit+1,offset,status]);
    return NextResponse.json({
      moderation_status:status,items:res.rows.slice(0,limit),limit,offset,
      has_more:res.rows.length>limit,
      note:'Human moderator must inspect each review before approving. Pending reviews are not public.'
    },{headers:noStoreAdmin});
  }catch{
    return NextResponse.json({error:'moderation_queue_unavailable'},{status:503,headers:noStoreAdmin});
  }
}
