import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid,normalizeText} from '@/lib/platform-v1';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'edit'))return NextResponse.json({error:'forbidden'},{status:403,headers:ownerHeaders});
 const q=normalizeText(req.nextUrl.searchParams.get('q'),90);
 const cursor=req.nextUrl.searchParams.get('after');
 if(cursor&&!isUuid(cursor))return NextResponse.json({error:'invalid_cursor'},{status:400,headers:ownerHeaders});
 const pool=getPool();if(!pool)return NextResponse.json({error:'database_not_configured'},{status:503,headers:ownerHeaders});
 try{
   const rows=await pool.query<{id:string;name_ko:string;region_sigungu:string|null;road_address_ko:string|null;publication_status:string}>(`
     SELECT id::text,name_ko,region_sigungu,road_address_ko,publication_status
     FROM restaurants
     WHERE ($1='' OR name_ko ILIKE '%'||$1||'%' OR region_sigungu ILIKE '%'||$1||'%' OR id::text=$1)
       AND ($2::uuid IS NULL OR id>$2::uuid)
     ORDER BY id ASC LIMIT 26`,[q.replace(/[\\%_]/g,'\\$&'),cursor]);
   return NextResponse.json({items:rows.rows.slice(0,25),
     next_cursor:rows.rows.length>25?rows.rows[24].id:null},{headers:ownerHeaders});
 }catch{return NextResponse.json({error:'catalog_unavailable'},{status:503,headers:ownerHeaders})}
}
