import {NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function GET(){
  const pool=getPool();
  const headers={'Cache-Control':'no-store'};
  if(!pool)return NextResponse.json({ready:false,database:'not_configured'},{status:503,headers});
  try{
    const check=await pool.query<{
      core:string|null;
      localizations:string|null;
      menus:string|null;
      tags:string|null;
      photos:string|null;
      scores:string|null;
      analytics:string|null;
    }>(`SELECT
      to_regclass('public.restaurants')::text AS core,
      to_regclass('public.restaurant_localizations')::text AS localizations,
      to_regclass('public.restaurant_menus')::text AS menus,
      to_regclass('public.restaurant_tag_assignments')::text AS tags,
      to_regclass('public.restaurant_images')::text AS photos,
      to_regclass('public.restaurant_editorial_scores')::text AS scores,
      to_regclass('public.whateato_analytics_events')::text AS analytics`);
    const r=check.rows[0];
    const ready=Boolean(r?.core);
    const phase15=Boolean(r?.localizations&&r?.menus&&r?.tags&&r?.photos&&r?.scores&&r?.analytics);
    return NextResponse.json({ready,database:ready?'connected':'schema_missing',
      phase_1_5_schema:phase15?'ready':'migration_required',
      analytics_collection_enabled:phase15&&process.env.WHATEATO_ANALYTICS_ENABLED==='true'
    },{status:ready?200:503,headers});
  }catch{return NextResponse.json({ready:false,database:'unavailable'},{status:503,headers})}
}
