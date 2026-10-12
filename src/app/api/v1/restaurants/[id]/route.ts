import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {isUuid,normalizeLocale} from '@/lib/platform-v1';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
type Context={params:Promise<{id:string}>};
export async function GET(request:NextRequest,{params}:Context){
  const {id}=await params;
  if(!isUuid(id))return NextResponse.json({error:'invalid_restaurant_id'},{status:400,headers});
  const locale=normalizeLocale(request.nextUrl.searchParams.get('hl'));
  const pool=getPool();
  if(!pool)return NextResponse.json({error:'database_not_configured'},{status:503,headers});
  try{
    const [row,menu,tag,images]=await Promise.all([
      pool.query(`SELECT r.id::text AS id,r.name_ko,
        COALESCE(l.display_name,k.display_name,r.name_ko) AS name,
        COALESCE(l.short_description,k.short_description) AS short_description,
        COALESCE(l.full_description,k.full_description) AS full_description,
        r.road_address_ko,r.lot_address_ko,r.region_sido,r.region_sigungu,
        r.category_code,r.latitude,r.longitude,
        CASE WHEN sc.approval_state='approved' THEN sc.score::float8 ELSE NULL END AS editorial_score,
        CASE WHEN sc.approval_state='approved' THEN sc.methodology_version ELSE NULL END AS editorial_methodology
        FROM restaurants r
        LEFT JOIN restaurant_localizations l ON l.restaurant_id=r.id AND l.locale=$2 AND l.publication_state='published'
        LEFT JOIN restaurant_localizations k ON k.restaurant_id=r.id AND k.locale='ko' AND k.publication_state='published'
        LEFT JOIN restaurant_editorial_scores sc ON sc.restaurant_id=r.id AND sc.approval_state='approved'
        WHERE r.id=$1 AND r.publication_status='published' AND r.business_status='active'`,[id,locale]),
      pool.query(`SELECT m.id::text AS id,
        COALESCE(ml.name,kl.name) AS name,
        COALESCE(ml.description,kl.description) AS description,
        CASE WHEN m.price_verified_at IS NOT NULL THEN m.price_krw ELSE NULL END AS price_krw,
        m.price_verified_at
        FROM restaurant_menus m
        LEFT JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id AND ml.locale=$2
        LEFT JOIN restaurant_menu_localizations kl ON kl.menu_id=m.id AND kl.locale='ko'
        WHERE m.restaurant_id=$1 AND m.publication_state='published'
          AND COALESCE(ml.name,kl.name) IS NOT NULL
        ORDER BY m.position,m.id LIMIT 40`,[id,locale]),
      pool.query(`SELECT a.tag_code AS code,COALESCE(tl.label,kl.label,a.tag_code) AS label
        FROM restaurant_tag_assignments a
        LEFT JOIN restaurant_tag_localizations tl ON tl.tag_code=a.tag_code AND tl.locale=$2
        LEFT JOIN restaurant_tag_localizations kl ON kl.tag_code=a.tag_code AND kl.locale='ko'
        WHERE a.restaurant_id=$1 AND a.verification_state='verified' ORDER BY a.tag_code`,[id,locale]),
      pool.query(`SELECT id::text,alt_ko FROM restaurant_images
        WHERE restaurant_id=$1 AND publication_state='published' AND rights_status='approved'
        AND usage_rights_reference IS NOT NULL AND rights_verified_at IS NOT NULL
        ORDER BY position,id LIMIT 25`,[id])
    ]);
    if(!row.rows[0])return NextResponse.json({error:'restaurant_not_found'},{status:404,headers});
    return NextResponse.json({locale,restaurant:row.rows[0],menus:menu.rows,tags:tag.rows,
      images:images.rows,image_note:'Only approved media metadata; image delivery not activated',
      rating_note:'Editorial score is NOT an external or user review average'},{headers});
  }catch{return NextResponse.json({error:'restaurant_details_unavailable',hint:'Check migration 004 and database connectivity'},{status:503,headers})}
}
