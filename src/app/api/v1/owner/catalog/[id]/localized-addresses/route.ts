import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,safeSameOrigin,ownerHeaders} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
export const runtime='nodejs';
type Ctx={params:Promise<{id:string}>};
const langs=['ko','en','ja','zh-CN'] as const;
export async function POST(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'publish'))return NextResponse.json({error:'owner_required'},{status:403,headers:ownerHeaders});
 if(!safeSameOrigin(req))return NextResponse.json({error:'cross_site_request'},{status:403,headers:ownerHeaders});
 const {id}=await params;
 if(!isUuid(id))return NextResponse.json({error:'invalid_restaurant_id'},{status:400,headers:ownerHeaders});
 const raw=await req.text();
 if(raw.length>12000)return NextResponse.json({error:'payload_too_large'},{status:413,headers:ownerHeaders});
 let input:unknown;try{input=JSON.parse(raw)}catch{return NextResponse.json({error:'invalid_json'},{status:400,headers:ownerHeaders})}
 if(!input||typeof input!=='object'||Array.isArray(input))return NextResponse.json({error:'invalid_payload'},{status:400,headers:ownerHeaders});
 const root=input as Record<string,unknown>;
 if(root.confirm_restaurant_id!==id||!root.addresses||typeof root.addresses!=='object'||Array.isArray(root.addresses))
  return NextResponse.json({error:'explicit_confirmation_required'},{status:400,headers:ownerHeaders});
 const addresses=root.addresses as Record<string,unknown>;
 if(Object.keys(addresses).length!==4||!langs.every(l=>typeof addresses[l]==='string'&&(addresses[l] as string).trim().length>=9&&(addresses[l] as string).trim().length<=250))
  return NextResponse.json({error:'all_four_localized_addresses_required'},{status:400,headers:ownerHeaders});
 const note=root.source_note;
 if(typeof note!=='string'||note.trim().length<3||note.length>700)
  return NextResponse.json({error:'source_note_required'},{status:400,headers:ownerHeaders});
 const pool=getPool();if(!pool)return NextResponse.json({error:'database_unavailable'},{status:503,headers:ownerHeaders});
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const venue=await client.query('SELECT id FROM restaurants WHERE id=$1 FOR UPDATE',[id]);
  if(!venue.rowCount){await client.query('ROLLBACK');return NextResponse.json({error:'restaurant_not_found'},{status:404,headers:ownerHeaders})}
  for(const lang of langs){
   await client.query(`INSERT INTO restaurant_address_localizations_v1(restaurant_id,locale,display_address,source_note,verified_at)
    VALUES($1,$2,$3,$4,now()) ON CONFLICT(restaurant_id,locale) DO UPDATE SET
    display_address=EXCLUDED.display_address,source_note=EXCLUDED.source_note,verified_at=now()`,
    [id,lang,(addresses[lang] as string).trim(),note.trim()]);
  }
  await client.query('COMMIT');
  return NextResponse.json({saved:true,locales:langs},{headers:ownerHeaders});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return NextResponse.json({error:'localized_addresses_unavailable'},{status:503,headers:ownerHeaders});
 }finally{client.release()}
}
