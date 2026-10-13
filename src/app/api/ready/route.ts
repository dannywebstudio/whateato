import {NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';

// Fail closed if this deployed code requires migrations the connected DB lacks.
// A healthy Postgres connection does not guarantee public catalog queries work.
export async function GET(){
  const pool=getPool();
  const headers={'Cache-Control':'no-store'};
  if(!pool)return NextResponse.json({ready:false,database:'not_configured'},{status:503,headers});
  try{
    const check=await pool.query<{
      core:string|null;localizations:string|null;menus:string|null;
      tags:string|null;photos:string|null;scores:string|null;
      analytics:string|null;quality_reviews:string|null;review_audit:string|null;bulk_batches:string|null;bulk_items:string|null;bulk_audit:string|null;
    }>(`SELECT
      to_regclass('public.restaurants')::text AS core,
      to_regclass('public.restaurant_localizations')::text AS localizations,
      to_regclass('public.restaurant_menus')::text AS menus,
      to_regclass('public.restaurant_tag_assignments')::text AS tags,
      to_regclass('public.restaurant_images')::text AS photos,
      to_regclass('public.restaurant_editorial_scores')::text AS scores,
      to_regclass('public.whateato_analytics_events')::text AS analytics,
      to_regclass('public.restaurant_data_quality_reviews')::text AS quality_reviews,
      to_regclass('public.whateato_review_moderation_audit')::text AS review_audit,
      to_regclass('public.whateato_bulk_batches')::text AS bulk_batches,
      to_regclass('public.whateato_bulk_items')::text AS bulk_items,
      to_regclass('public.whateato_bulk_audit')::text AS bulk_audit`);
    const r=check.rows[0];
    const phase15=Boolean(r?.localizations&&r?.menus&&r?.tags&&r?.photos&&r?.scores&&r?.analytics);
    const qualityReady=Boolean(r?.quality_reviews);
    const moderationEnabled=process.env.WHATEATO_REVIEW_MODERATION_ENABLED==='true';
    const moderationReady=!moderationEnabled||Boolean(r?.review_audit);
    const bulkEnabled=process.env.WHATEATO_BULK_ADMIN_ENABLED==='true';
    const bulkReady=!bulkEnabled||Boolean(r?.bulk_batches&&r?.bulk_items&&r?.bulk_audit);
    const ready=Boolean(r?.core)&&phase15&&qualityReady&&moderationReady&&bulkReady;
    return NextResponse.json({
      ready,database:ready?'connected':'migration_required',
      phase_1_5_schema:phase15?'ready':'migration_required',
      catalog_quality_schema:qualityReady?'ready':'migration_required',
      review_moderation_schema:moderationEnabled?(moderationReady?'ready':'migration_required'):'disabled',
      bulk_admin_schema:bulkEnabled?(bulkReady?'ready':'migration_required'):'disabled',
      analytics_collection_enabled:phase15&&process.env.WHATEATO_ANALYTICS_ENABLED==='true'
    },{status:ready?200:503,headers});
  }catch{return NextResponse.json({ready:false,database:'unavailable'},{status:503,headers})}
}
