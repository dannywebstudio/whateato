import {NextRequest,NextResponse} from 'next/server';
import {auth,authReady} from '@/auth';
import {getPool} from '@/lib/db';
import {getPublicReviews,validUuid,validateReview} from '@/lib/reviews';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const noStore={'Cache-Control':'no-store'};

function sameOrigin(request:NextRequest):boolean{
  const origin=request.headers.get('origin');
  if(!origin)return false;
  try{return new URL(origin).origin===request.nextUrl.origin}catch{return false}
}
async function actor(){
  if(!authReady())return null;
  const session=await auth();
  const id=session?.user?.id;
  if(!id||!validUuid(id))return null;
  return id;
}
export async function GET(_request:NextRequest,{params}:Context){
  const {id}=await params;
  if(!validUuid(id))return NextResponse.json({error:'invalid_restaurant'},{status:400,headers:noStore});
  try{
    const reviews=await getPublicReviews(id);
    return NextResponse.json({reviews,moderation:'Only approved reviews are publicly shown'},{headers:noStore});
  }catch{
    return NextResponse.json({error:'reviews_unavailable'},{status:503,headers:noStore});
  }
}
export async function POST(request:NextRequest,{params}:Context){
  const {id}=await params;
  if(!validUuid(id))return NextResponse.json({error:'invalid_restaurant'},{status:400,headers:noStore});
  if(!authReady())return NextResponse.json({error:'login_not_configured'},{status:503,headers:noStore});
  if(!sameOrigin(request))return NextResponse.json({error:'cross_site_request'},{status:403,headers:noStore});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return NextResponse.json({error:'json_required'},{status:415,headers:noStore});
  const length=Number(request.headers.get('content-length')||'0');
  if(length>8000)return NextResponse.json({error:'request_too_large'},{status:413,headers:noStore});
  const accountId=await actor();
  if(!accountId)return NextResponse.json({error:'login_required'},{status:401,headers:noStore});
  let payload:unknown;
  try{payload=await request.json()}catch{
    return NextResponse.json({error:'invalid_json'},{status:400,headers:noStore});
  }
  if(!payload||typeof payload!=='object'||Array.isArray(payload))
    return NextResponse.json({error:'invalid_review'},{status:400,headers:noStore});
  const {rating,body}=payload as Record<string,unknown>;
  const issue=validateReview(rating,body);
  if(issue)return NextResponse.json({error:issue},{status:400,headers:noStore});
  const pool=getPool();
  if(!pool)return NextResponse.json({error:'database_unavailable'},{status:503,headers:noStore});
  try{
    const result=await pool.query<{id:string}>(
      "INSERT INTO whateato_user_reviews(restaurant_id,account_id,rating,body) "+
      "SELECT r.id,a.id,$3,$4 FROM restaurants r CROSS JOIN whateato_review_accounts a "+
      "WHERE r.id=$1 AND a.id=$2 AND r.business_status='active' AND r.publication_status='published' "+
      "ON CONFLICT(restaurant_id,account_id) DO UPDATE SET rating=EXCLUDED.rating,body=EXCLUDED.body, "+
      "updated_at=now(),moderation_status='pending',reviewed_at=NULL RETURNING id",
      [id,accountId,rating,(body as string).trim()]
    );
    if(!result.rows[0])return NextResponse.json({error:'not_found_or_deleted_account'},{status:404,headers:noStore});
    return NextResponse.json({id:result.rows[0].id,status:'pending',message:'Review received; pending moderation'},{
      status:202,headers:noStore
    });
  }catch{
    return NextResponse.json({error:'review_unavailable'},{status:503,headers:noStore});
  }
}
export async function DELETE(request:NextRequest,{params}:Context){
  const {id}=await params;
  if(!validUuid(id))return NextResponse.json({error:'invalid_restaurant'},{status:400,headers:noStore});
  if(!sameOrigin(request))return NextResponse.json({error:'cross_site_request'},{status:403,headers:noStore});
  const accountId=await actor();
  if(!accountId)return NextResponse.json({error:'login_required'},{status:401,headers:noStore});
  const pool=getPool();
  if(!pool)return NextResponse.json({error:'database_unavailable'},{status:503,headers:noStore});
  try{
    await pool.query('DELETE FROM whateato_user_reviews WHERE restaurant_id=$1 AND account_id=$2',[id,accountId]);
    return NextResponse.json({deleted:true},{headers:noStore});
  }catch{
    return NextResponse.json({error:'review_unavailable'},{status:503,headers:noStore});
  }
}
