import {NextRequest,NextResponse} from 'next/server';
import {timingSafeEqual} from 'node:crypto';
import {getPool} from '@/lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
function authorized(req:NextRequest,expected:string){
  const supplied=req.headers.get('authorization')||'';
  if(!supplied.startsWith('Bearer '))return false;
  const a=Buffer.from(supplied.slice(7));const b=Buffer.from(expected);
  return a.length===b.length&&timingSafeEqual(a,b);
}
export async function GET(request:NextRequest){
  const secret=process.env.WHATEATO_ANALYTICS_ADMIN_TOKEN||'';
  if(secret.length<32)return NextResponse.json({error:'admin_token_not_configured'},{status:503,headers});
  if(!authorized(request,secret))return NextResponse.json({error:'unauthorized'},{status:401,headers});
  const requested=Number(request.nextUrl.searchParams.get('days')||30);
  const days=Number.isInteger(requested)&&requested>=1&&requested<=90?requested:30;
  const pool=getPool();
  if(!pool)return NextResponse.json({error:'database_not_configured'},{status:503,headers});
  const clause="occurred_at >= now() - ($1::integer * INTERVAL '1 day')";
  try{
    const [totals,events,langs,searches,restaurants]=await Promise.all([
      pool.query(`SELECT count(*)::integer AS total_events,
        count(*) FILTER(WHERE event_type='page_view')::integer AS page_views,
        count(*) FILTER(WHERE event_type='search_submitted')::integer AS searches,
        count(*) FILTER(WHERE event_type='detail_view')::integer AS detail_views
        FROM whateato_analytics_events WHERE ${clause}`,[days]),
      pool.query(`SELECT date_trunc('day',occurred_at)::date::text AS date,event_type,count(*)::integer AS count
        FROM whateato_analytics_events WHERE ${clause}
        GROUP BY 1,2 ORDER BY 1 DESC,2`,[days]),
      pool.query(`SELECT locale,count(*)::integer AS events FROM whateato_analytics_events
        WHERE ${clause} GROUP BY locale ORDER BY events DESC`,[days]),
      pool.query(`SELECT search_term,count(*)::integer AS searches,
        count(*) FILTER (WHERE result_count=0)::integer AS zero_result_searches
        FROM whateato_analytics_events WHERE ${clause}
          AND event_type='search_submitted' AND search_term IS NOT NULL
        GROUP BY search_term ORDER BY searches DESC LIMIT 20`,[days]),
      pool.query(`SELECT a.restaurant_id::text AS id,r.name_ko,
        count(*)::integer AS detail_views FROM whateato_analytics_events a
        JOIN restaurants r ON r.id=a.restaurant_id
        WHERE a.occurred_at >= now() - ($1::integer * INTERVAL '1 day')
          AND a.event_type='detail_view'
        GROUP BY a.restaurant_id,r.name_ko ORDER BY detail_views DESC LIMIT 20`,[days])
    ]);
    return NextResponse.json({days,metrics:totals.rows[0],daily_events:events.rows,events_by_locale:langs.rows,
      search_terms:searches.rows,popular_restaurants:restaurants.rows,
      note:'Event counts only. Unique visitors, sessions and verified physical restaurant visits are NOT measured.'},{headers});
  }catch{return NextResponse.json({error:'analytics_unavailable',hint:'Check migration 004 and database connectivity'},{status:503,headers})}
}
