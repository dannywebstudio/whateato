import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid,normalizeText} from '@/lib/platform-v1';
import {boundedJson} from '@/lib/bulk-content-admin';
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

const respond=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:ownerHeaders});
const word=(v:unknown,max:number,min=1)=>typeof v==='string'&&v.trim().length>=min&&
  [...v.trim()].length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
export async function POST(req:NextRequest){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'edit'))return respond({error:'forbidden'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const parsed=await boundedJson(req,4096);
 if(!parsed.ok)return respond({error:parsed.error},parsed.status);
 if(!parsed.value||typeof parsed.value!=='object'||Array.isArray(parsed.value))
   return respond({error:'invalid_new_restaurant'},400);
 const p=parsed.value as Record<string,unknown>;
 if(Object.keys(p).some(k=>![
   'name_ko','road_address_ko','lot_address_ko','region_sido','region_sigungu',
   'region_dong','latitude','longitude','source_url'].includes(k))||
   !word(p.name_ko,120,2)||!word(p.road_address_ko,250,5)||
   !word(p.region_sido,80)||!word(p.region_sigungu,90)||
   (p.lot_address_ko!==null&&p.lot_address_ko!==undefined&&!word(p.lot_address_ko,250))||
   (p.region_dong!==null&&p.region_dong!==undefined&&!word(p.region_dong,90))||
   !word(p.source_url,700,10)||!/^https:\/\/[^\s/@:]+[^\s]*$/i.test(String(p.source_url)))
   return respond({error:'invalid_new_restaurant'},400);
 const lat=p.latitude??null,lon=p.longitude??null;
 if((lat!==null||lon!==null)&&!(typeof lat==='number'&&Number.isFinite(lat)&&lat>=33&&lat<=39.5&&
   typeof lon==='number'&&Number.isFinite(lon)&&lon>=124&&lon<=132))
   return respond({error:'invalid_coordinates'},400);
 const pool=getPool();if(!pool)return respond({error:'database_not_configured'},503);
 const client=await pool.connect();
 try{
   await client.query('BEGIN');
   const name=(p.name_ko as string).trim(),road=(p.road_address_ko as string).trim();
   // Serialize submissions for an identical normalized restaurant name + address.
   await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',
     [name.toLowerCase().replace(/\s+/g,'')+'@'+road.toLowerCase().replace(/\s+/g,'')]);
   const match=await client.query<{id:string}>(`
     SELECT id::text FROM restaurants
     WHERE regexp_replace(lower(name_ko),'\\s+','','g')=
           regexp_replace(lower($1::text),'\\s+','','g')
       AND regexp_replace(lower(coalesce(road_address_ko,'')),'\\s+','','g')=
           regexp_replace(lower($2::text),'\\s+','','g')
     LIMIT 1`,[name,road]);
   if(match.rows.length){
     await client.query('ROLLBACK');
     return respond({error:'duplicate_restaurant_exists',existing_id:match.rows[0].id},409);
   }
   const created=await client.query<{id:string}>(`
     INSERT INTO restaurants(name_ko,road_address_ko,lot_address_ko,region_sido,region_sigungu,
       region_dong,latitude,longitude,location,business_status,publication_status)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,
       CASE WHEN $7::float8 IS NOT NULL AND $8::float8 IS NOT NULL THEN
         ST_SetSRID(ST_MakePoint($8::float8,$7::float8),4326)::geography ELSE NULL END,
       'unknown','draft') RETURNING id::text`,[
     name,road,typeof p.lot_address_ko==='string'?p.lot_address_ko.trim():null,
     (p.region_sido as string).trim(),(p.region_sigungu as string).trim(),
     typeof p.region_dong==='string'?p.region_dong.trim():null,lat,lon]);
   await client.query(`
     INSERT INTO whateato_cms_restaurant_origins(restaurant_id,created_by,source_url)
     VALUES($1,$2,$3)`,[created.rows[0].id,staff.accountId,p.source_url]);
   await client.query('COMMIT');
   return respond({restaurant_id:created.rows[0].id,publication_status:'draft',
     next_step:'Add English content and confirm a publication batch.'},201);
 }catch{
   await client.query('ROLLBACK').catch(()=>{});
   return respond({error:'new_restaurant_create_unavailable'},503)
 }finally{client.release()}
}
