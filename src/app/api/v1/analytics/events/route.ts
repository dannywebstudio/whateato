import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {isUuid,normalizeLocale,safeSearchTerm} from '@/lib/platform-v1';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
const events=new Set(['page_view','search_submitted','detail_view','result_click','map_click','directions_click','phone_click']);
const pages=new Set(['home','search','restaurant','map','other']);
const channels=new Set(['direct','search','social','referral','unknown']);
function sameOrigin(request:NextRequest){
  const origin=request.headers.get('origin');
  if(!origin)return false;
  try{return new URL(origin).origin===request.nextUrl.origin}catch{return false}
}
function deviceClass(ua:string){
  if(/ipad|tablet/i.test(ua))return 'tablet';
  if(/mobile|iphone|android/i.test(ua))return 'mobile';
  return ua?'desktop':'unknown';
}
export async function POST(request:NextRequest){
  // Explicit server-side launch gate. No anonymous event collection by default.
  // Enable only after rate limiting, disclosure and retention jobs are verified.
  if(process.env.WHATEATO_ANALYTICS_ENABLED!=='true')
    return new NextResponse(null,{status:204,headers});
  if(!sameOrigin(request))return NextResponse.json({error:'invalid_origin'},{status:403,headers});
  if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return NextResponse.json({error:'json_required'},{status:415,headers});
  const ua=request.headers.get('user-agent')||'';
  if(/bot|crawler|spider|headless|lighthouse|pingdom/i.test(ua))return new NextResponse(null,{status:204,headers});
  if(Number(request.headers.get('content-length')||'0')>2048)
    return NextResponse.json({error:'too_large'},{status:413,headers});
  let raw:string;
  try{raw=await request.text()}catch{return NextResponse.json({error:'invalid_body'},{status:400,headers})}
  if(raw.length>2048)return NextResponse.json({error:'too_large'},{status:413,headers});
  let data:unknown;
  try{data=JSON.parse(raw)}catch{return NextResponse.json({error:'invalid_json'},{status:400,headers})}
  if(!data||typeof data!=='object'||Array.isArray(data))
    return NextResponse.json({error:'invalid_event'},{status:400,headers});
  const e=data as Record<string,unknown>;
  if(typeof e.event_type!=='string'||!events.has(e.event_type)||
     typeof e.page_type!=='string'||!pages.has(e.page_type))
    return NextResponse.json({error:'unknown_event'},{status:400,headers});
  const restaurantId=isUuid(e.restaurant_id)?e.restaurant_id:null;
  if(e.event_type==='detail_view'&&!restaurantId)
    return NextResponse.json({error:'restaurant_id_required'},{status:400,headers});
  if(e.restaurant_id!=null&&!restaurantId)
    return NextResponse.json({error:'invalid_restaurant_id'},{status:400,headers});
  const channel=typeof e.acquisition_channel==='string'&&channels.has(e.acquisition_channel)
     ?e.acquisition_channel:'unknown';
  const resultCount=Number.isInteger(e.result_count)&&Number(e.result_count)>=0&&Number(e.result_count)<=1000000?Number(e.result_count):null;
  const term=e.event_type==='search_submitted'?safeSearchTerm(e.search_term):null;
  const pool=getPool();
  if(!pool)return NextResponse.json({error:'database_not_configured'},{status:503,headers});
  try{
    await pool.query(`INSERT INTO whateato_analytics_events
      (event_type,page_type,locale,device_type,acquisition_channel,restaurant_id,search_term,result_count)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,[
        e.event_type,e.page_type,normalizeLocale(e.locale),deviceClass(ua),
        channel,restaurantId,term,resultCount
      ]);
    return NextResponse.json({accepted:true},{status:202,headers});
  }catch{return NextResponse.json({error:'analytics_unavailable'},{status:503,headers})}
}
