import {NextRequest,NextResponse} from 'next/server';
import {reviewAdminPool} from '@/lib/review-moderation-admin';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';

// Authorized moderation queue; excludes reviewer accounts and Google IDs.
// Full text is confined to this bearer-authenticated administrative endpoint.
export async function GET(request:NextRequest){
  const staff=await currentStaff();
  if(!staff||!hasPermission(staff,'moderate'))return NextResponse.json({error:'moderator_required'},{status:403,headers:ownerHeaders});
  const status=request.nextUrl.searchParams.get('status')||'pending';
  if(!['pending','published','rejected'].includes(status))
    return NextResponse.json({error:'invalid_review_status'},{status:400,headers:ownerHeaders});
  const rawLimit=request.nextUrl.searchParams.get('limit');
  const rawOffset=request.nextUrl.searchParams.get('offset');
  const limit=rawLimit===null?20:Number(rawLimit);
  const offset=rawOffset===null?0:Number(rawOffset);
  if(!Number.isInteger(limit)||limit<1||limit>50||
     !Number.isInteger(offset)||offset<0||offset>1000)
    return NextResponse.json({error:'invalid_pagination'},{status:400,headers:ownerHeaders});
  const pool=reviewAdminPool();
  if(!pool)return NextResponse.json({error:'database_not_configured'},{status:503,headers:ownerHeaders});
  try{
    const res=await pool.query<{
      id:string;restaurant_id:string;restaurant_name:string;rating:number;body:string;
      created_at:string;updated_at:string
    }>(`
      SELECT rv.id::text AS id,rv.restaurant_id::text AS restaurant_id,
        r.name_ko AS restaurant_name,
        round(coalesce((s.taste::numeric+coalesce(s.service,0)+coalesce(s.tourist_friendliness,0)
          +coalesce(s.value_for_money,0)+coalesce(s.cleanliness,0))/
          (1+(s.service IS NOT NULL)::int+(s.tourist_friendliness IS NOT NULL)::int+
             (s.value_for_money IS NOT NULL)::int+(s.cleanliness IS NOT NULL)::int),
          rv.rating::numeric),1)::float8 AS rating,
        rv.body,
        rv.created_at::text AS created_at,rv.updated_at::text AS updated_at,
        CASE WHEN s.review_id IS NULL THEN NULL ELSE jsonb_build_object(
          'taste',s.taste,'service',s.service,'tourist_friendliness',s.tourist_friendliness,
          'value_for_money',s.value_for_money,'cleanliness',s.cleanliness) END AS categories,
        coalesce((SELECT jsonb_agg(jsonb_build_object(
          'id',p.id::text,'url','/api/v1/owner/review-photos/'||p.id::text,'status',p.moderation_state)
          ORDER BY p.position)
          FROM whateato_review_photo_assets p WHERE p.review_id=rv.id),'[]'::jsonb) AS photos
      FROM whateato_user_reviews rv
      LEFT JOIN whateato_review_category_scores s ON s.review_id=rv.id
      JOIN restaurants r ON r.id=rv.restaurant_id
      WHERE rv.moderation_status=$3
      ORDER BY rv.created_at ASC,rv.id ASC
      LIMIT $1 OFFSET $2`,[limit+1,offset,status]);
    return NextResponse.json({
      moderation_status:status,items:res.rows.slice(0,limit),limit,offset,
      has_more:res.rows.length>limit,
      note:'Human moderator must inspect each review before approving. Pending reviews are not public.'
    },{headers:ownerHeaders});
  }catch{
    return NextResponse.json({error:'moderation_queue_unavailable'},{status:503,headers:ownerHeaders});
  }
}
