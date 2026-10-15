import {NextRequest,NextResponse} from 'next/server';
import {auth,authReady} from '@/auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {readPhoto} from '@/lib/cms-object-storage';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string;photoId:string}>};
const headers={'Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff',
 'Content-Security-Policy':"default-src 'none'; sandbox"} as const;
export async function GET(_req:NextRequest,{params}:Ctx){
 const {id,photoId}=await params;
 if(!isUuid(id)||!isUuid(photoId))
  return NextResponse.json({error:'not_found'},{status:404,headers});
 if(!authReady())return NextResponse.json({error:'login_required'},{status:401,headers});
 const session=await auth();
 if(!session?.user?.id||!isUuid(session.user.id))
  return NextResponse.json({error:'login_required'},{status:401,headers});
 const pool=getPool();if(!pool)return NextResponse.json({error:'database_unavailable'},{status:503,headers});
 try{
  const result=await pool.query<{storage_key:string}>(`
    SELECT p.storage_key FROM whateato_review_photo_assets p
    JOIN whateato_user_reviews r ON r.id=p.review_id
    WHERE r.restaurant_id=$1 AND r.account_id=$2 AND p.id=$3 LIMIT 1`,[
     id,session.user.id,photoId
    ]);
  if(!result.rows.length)return NextResponse.json({error:'not_found'},{status:404,headers});
  const photo=await readPhoto(result.rows[0].storage_key);
  return new NextResponse(new Uint8Array(photo),{status:200,headers:{
   ...headers,'Content-Type':'image/webp','Content-Length':String(photo.length)
  }});
 }catch{return NextResponse.json({error:'photo_unavailable'},{status:503,headers})}
}
