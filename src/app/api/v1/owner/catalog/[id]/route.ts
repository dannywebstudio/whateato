import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
export async function GET(_req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'edit'))return NextResponse.json({error:'forbidden'},{status:403,headers:ownerHeaders});
 const {id}=await params;
 if(!isUuid(id))return NextResponse.json({error:'invalid_restaurant_id'},{status:400,headers:ownerHeaders});
 const pool=getPool();if(!pool)return NextResponse.json({error:'database_not_configured'},{status:503,headers:ownerHeaders});
 try{
   const [venue,locales,menus,tags,hours,media]=await Promise.all([
    pool.query(`SELECT id::text,name_ko,road_address_ko,lot_address_ko,region_sigungu,
      category_code,business_status,publication_status FROM restaurants WHERE id=$1`,[id]),
    pool.query(`SELECT locale,display_name,short_description,full_description,source_notes,publication_state
      FROM restaurant_localizations WHERE restaurant_id=$1 ORDER BY locale`,[id]),
    pool.query(`SELECT m.id::text,COALESCE(k.external_key,m.id::text) AS menu_key,
      m.position,m.price_krw,m.price_verified_at,m.publication_state,
      l.locale,l.name,l.description
      FROM restaurant_menus m
      LEFT JOIN whateato_bulk_menu_keys k ON k.menu_id=m.id
      LEFT JOIN restaurant_menu_localizations l ON l.menu_id=m.id
      WHERE m.restaurant_id=$1 ORDER BY m.position,m.id,l.locale LIMIT 240`,[id]),
    pool.query(`SELECT tag_code,verification_state,evidence_ref FROM restaurant_tag_assignments
      WHERE restaurant_id=$1 ORDER BY tag_code`,[id]),
    pool.query(`SELECT h.publication_state,h.source_url,intervals.weekday,
      intervals.start_minute,intervals.end_minute FROM restaurant_opening_hours h
      LEFT JOIN restaurant_opening_intervals intervals ON intervals.restaurant_id=h.restaurant_id
      WHERE h.restaurant_id=$1 ORDER BY intervals.weekday,intervals.start_minute`,[id]),
    pool.query(`SELECT id::text,position,alt_ko,publication_state,rights_status,
      ('/api/v1/images/'||id::text) AS url FROM restaurant_images
      WHERE restaurant_id=$1 ORDER BY position,id LIMIT 100`,[id])
   ]);
   if(!venue.rows.length)return NextResponse.json({error:'not_found'},{status:404,headers:ownerHeaders});
   return NextResponse.json({restaurant:venue.rows[0],locales:locales.rows,menus:menus.rows,
     tags:tags.rows,hours:hours.rows,images:media.rows},{headers:ownerHeaders});
 }catch{return NextResponse.json({error:'catalog_detail_unavailable'},{status:503,headers:ownerHeaders})}
}
