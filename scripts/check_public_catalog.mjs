#!/usr/bin/env node
// Read-only launch preflight. Confirm approved-Map branch and verified public rows.
// Do NOT log the connection string or database credentials.
import pg from 'pg';
if(!process.env.DATABASE_URL){
 console.error('PUBLIC_CATALOG_PREFLIGHT: database_not_configured');
 process.exit(1);
}
const client=new pg.Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:8000});
try{
 await client.connect();
 const {rows}=await client.query(`
 SELECT
   (SELECT COUNT(*) FROM restaurants) AS all_records,
   (SELECT COUNT(*) FROM whateato_restaurant_public_approvals_v1
      WHERE is_visible=true) AS approved,
   (SELECT COUNT(*) FROM whateato_restaurant_public_approvals_v1
      WHERE is_visible=true AND approval_source='baseline') AS baseline,
   COUNT(*) FILTER (WHERE r.publication_status='published'
      AND r.business_status='active'
      AND EXISTS (
        SELECT 1 FROM restaurant_opening_hours h
        WHERE h.restaurant_id=r.id AND h.publication_state='published'
        AND h.verified_at IS NOT NULL AND NULLIF(BTRIM(h.source_url),'') IS NOT NULL
        AND EXISTS (SELECT 1 FROM restaurant_opening_intervals i
          WHERE i.restaurant_id=r.id AND i.end_minute>i.start_minute)
      )
      AND NOT EXISTS (SELECT 1 FROM restaurant_data_quality_reviews dq
        WHERE dq.restaurant_id=r.id AND dq.review_state='confirmed_hold')
      AND NOT EXISTS (SELECT 1 FROM whateato_restaurant_triage_v1 t
        WHERE t.restaurant_id=r.id AND (t.grade='C' OR t.visibility NOT IN ('full','basic_map','basic_search_only')))
      AND (
        a.approval_source='baseline'
        OR (
          COALESCE(NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) IS NOT NULL
          AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL
          AND (SELECT COUNT(DISTINCT l.locale) FROM restaurant_localizations l
            WHERE l.restaurant_id=r.id AND l.locale IN('en','ja','zh-CN')
              AND l.publication_state='published' AND l.verified_at IS NOT NULL
              AND NULLIF(BTRIM(l.display_name),'') IS NOT NULL)=3
          AND (SELECT COUNT(DISTINCT al.locale) FROM restaurant_address_localizations_v1 al
            WHERE al.restaurant_id=r.id AND al.locale IN('en','ja','zh-CN')
              AND al.verified_at IS NOT NULL AND NULLIF(BTRIM(al.display_address),'') IS NOT NULL)=3
          AND EXISTS(SELECT 1 FROM restaurant_menus m
            WHERE m.restaurant_id=r.id AND m.publication_state='published'
              AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL
              AND (SELECT COUNT(DISTINCT ml.locale) FROM restaurant_menu_localizations ml
                WHERE ml.menu_id=m.id AND ml.locale IN('en','ja','zh-CN')
                  AND NULLIF(BTRIM(ml.name),'') IS NOT NULL)=3)
        )
      )
   ) AS public_eligible
 FROM whateato_restaurant_public_approvals_v1 a
 JOIN restaurants r ON r.id=a.restaurant_id
 WHERE a.is_visible=true
 `);
 const v=rows[0]||{};
 const total=Number(v.all_records),approved=Number(v.approved),
       baseline=Number(v.baseline),eligible=Number(v.public_eligible);
 if(!Number.isFinite(total)||total<3||baseline<3||approved<3||
    approved>total||eligible<3||eligible>approved){
  console.error('PUBLIC_CATALOG_PREFLIGHT: rejected_database_or_approvals');
  process.exitCode=1;
 }else{
  console.log('PUBLIC_CATALOG_PREFLIGHT: approved='+approved+
    ' public_eligible='+eligible+' baseline='+baseline+
    ' total_hidden='+(total-eligible));
 }
}catch(error){
 console.error('PUBLIC_CATALOG_PREFLIGHT: invalid_schema_or_connection');
 process.exitCode=1;
}finally{
 await client.end().catch(()=>{});
}
