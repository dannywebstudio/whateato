import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {escapeLike,normalizeLocale,normalizeTags,normalizeText} from '@/lib/platform-v1';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function GET(request:NextRequest){
  const p=request.nextUrl.searchParams;
  const locale=normalizeLocale(p.get('hl'));
  const q=normalizeText(p.get('q'),100);
  const region=normalizeText(p.get('region'),60);
  const tags=normalizeTags(p.get('f'));
  const limit=Math.min(30,Math.max(1,Number.parseInt(p.get('limit')||'20',10)||20));
  const offset=Math.min(2000,Math.max(0,Number.parseInt(p.get('offset')||'0',10)||0));
  const pool=getPool();
  if(!pool)return NextResponse.json({error:'database_not_configured'}, {status:503,headers});
  const sql=`
    SELECT r.id::text AS id,
      COALESCE(l.display_name,k.display_name,r.name_ko) AS name,
      r.name_ko,r.road_address_ko AS address_ko,r.region_sido,r.region_sigungu,
      COALESCE(l.short_description,k.short_description) AS short_description,
      CASE WHEN sc.approval_state='approved' THEN sc.score::float8 ELSE NULL END AS editorial_score,
      COALESCE((SELECT json_agg(json_build_object('code',a.tag_code,'label',COALESCE(tl.label,ko_tl.label,a.tag_code)) ORDER BY a.tag_code)
        FROM restaurant_tag_assignments a
        LEFT JOIN restaurant_tag_localizations tl ON tl.tag_code=a.tag_code AND tl.locale=$1
        LEFT JOIN restaurant_tag_localizations ko_tl ON ko_tl.tag_code=a.tag_code AND ko_tl.locale='ko'
        WHERE a.restaurant_id=r.id AND a.verification_state='verified'),'[]'::json) AS tags
    FROM restaurants r
    LEFT JOIN restaurant_localizations l ON l.restaurant_id=r.id AND l.locale=$1 AND l.publication_state='published'
    LEFT JOIN restaurant_localizations k ON k.restaurant_id=r.id AND k.locale='ko' AND k.publication_state='published'
    LEFT JOIN restaurant_editorial_scores sc ON sc.restaurant_id=r.id AND sc.approval_state='approved'
    WHERE r.publication_status='published' AND r.business_status='active'
      AND ($2::text='' OR r.name_ko ILIKE $3 OR r.road_address_ko ILIKE $3
           OR r.region_sigungu ILIKE $3 OR r.region_dong ILIKE $3
           OR l.display_name ILIKE $3 OR k.display_name ILIKE $3
           OR EXISTS (SELECT 1 FROM restaurant_menus m
             JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id
             WHERE m.restaurant_id=r.id AND m.publication_state='published'
               AND ml.locale IN ($1,'ko') AND ml.name ILIKE $3))
      AND ($4::text='' OR r.region_sido ILIKE $5 OR r.region_sigungu ILIKE $5 OR r.region_dong ILIKE $5)
      AND NOT EXISTS (
        SELECT 1 FROM unnest($6::text[]) required_tag
        WHERE NOT EXISTS (
          SELECT 1 FROM restaurant_tag_assignments ra
          WHERE ra.restaurant_id=r.id AND ra.tag_code=required_tag
            AND ra.verification_state='verified'))
    ORDER BY CASE WHEN lower(r.name_ko)=lower($2) OR lower(l.display_name)=lower($2) THEN 0 ELSE 1 END,
      r.name_ko ASC,r.id ASC
    LIMIT ($7::integer + 1) OFFSET $8`;
  try{
    const res=await pool.query(sql,[locale,q,'%'+escapeLike(q)+'%',region,'%'+escapeLike(region)+'%',tags,limit,offset]);
    return NextResponse.json({locale,q,region,filters:tags,items:res.rows.slice(0,limit),limit,offset,has_more:res.rows.length>limit,ratings_note:'editorial_score is independent; null means unverified'},{headers});
  }catch{return NextResponse.json({error:'restaurant_search_unavailable',hint:'Check migration 004 and database connectivity'}, {status:503,headers})}
}
