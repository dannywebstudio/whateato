import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {readPhoto} from '@/lib/cms-object-storage';
import {isUuid} from '@/lib/platform-v1';
export const runtime='nodejs';
type Ctx={params:Promise<{id:string}>};
export async function GET(_req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'edit'))return NextResponse.json({error:'forbidden'},{status:403,headers:ownerHeaders});
 const {id}=await params;if(!isUuid(id))return NextResponse.json({error:'invalid_image_id'},{status:400,headers:ownerHeaders});
 const pool=getPool();if(!pool)return NextResponse.json({error:'database_unavailable'},{status:503,headers:ownerHeaders});
 try{
  const r=await pool.query<{storage_key:string}>(`SELECT i.storage_key FROM restaurant_images i
   JOIN whateato_admin_media_uploads a ON a.image_id=i.id WHERE i.id=$1`,[id]);
  if(!r.rowCount)return NextResponse.json({error:'not_found'},{status:404,headers:ownerHeaders});
  const image=await readPhoto(r.rows[0].storage_key);
  return new NextResponse(new Uint8Array(image),{headers:{...ownerHeaders,'Content-Type':'image/webp','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }catch{return NextResponse.json({error:'media_preview_unavailable'},{status:503,headers:ownerHeaders})}
}
