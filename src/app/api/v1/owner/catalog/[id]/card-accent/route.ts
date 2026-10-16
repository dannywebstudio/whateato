import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
export const runtime='nodejs';
type Ctx={params:Promise<{id:string}>};
export async function PUT(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'publish'))return NextResponse.json({error:'owner_required'},{status:403,headers:ownerHeaders});
 if(!safeSameOrigin(req))return NextResponse.json({error:'cross_site_request'},{status:403,headers:ownerHeaders});
 const {id}=await params;if(!isUuid(id))return NextResponse.json({error:'invalid_restaurant_id'},{status:400,headers:ownerHeaders});
 let payload:unknown;try{payload=await req.json()}catch{return NextResponse.json({error:'invalid_json'},{status:400,headers:ownerHeaders})}
 if(!payload||typeof payload!=='object'||Array.isArray(payload)||Object.keys(payload).some(k=>k!=='color'))
  return NextResponse.json({error:'invalid_payload'},{status:400,headers:ownerHeaders});
 const color=(payload as {color?:unknown}).color;
 if(color!==null&&(typeof color!=='string'||!/^#[a-fA-F0-9]{6}$/.test(color)))
  return NextResponse.json({error:'invalid_hex_color'},{status:400,headers:ownerHeaders});
 const pool=getPool();if(!pool)return NextResponse.json({error:'database_unavailable'},{status:503,headers:ownerHeaders});
 try{
  if(color===null)await pool.query('DELETE FROM whateato_restaurant_card_accents WHERE restaurant_id=$1',[id]);
  else{
   const result=await pool.query(`INSERT INTO whateato_restaurant_card_accents(restaurant_id,accent_color,updated_by)
     SELECT id,$2,$3::uuid FROM restaurants WHERE id=$1
     ON CONFLICT(restaurant_id) DO UPDATE SET accent_color=EXCLUDED.accent_color,updated_by=EXCLUDED.updated_by,updated_at=now()
     RETURNING restaurant_id`,[id,color,staff.accountId]);
   if(!result.rowCount)return NextResponse.json({error:'restaurant_not_found'},{status:404,headers:ownerHeaders});
  }
  return NextResponse.json({saved:true,color},{headers:ownerHeaders});
 }catch{return NextResponse.json({error:'card_color_save_failed'},{status:503,headers:ownerHeaders})}
}
