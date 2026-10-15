#!/usr/bin/env node
// Read-only startup guard. Never reveal connection string. Refuse to start
// against the wrong Neon branch or a database lacking the visibility tables.
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
    (SELECT COUNT(*) FROM whateato_release_cohort_300_v1) selected,
    (SELECT COUNT(*) FROM whateato_restaurant_public_approvals_v1 WHERE is_visible=true) manually_approved,
    (SELECT COUNT(*) FROM restaurants) all_records,
    COUNT(*) FILTER(WHERE t.grade='A') a,
    COUNT(*) FILTER(WHERE t.grade='B') b,
    COUNT(*) FILTER(WHERE t.grade NOT IN('A','B')) blocked_in_cohort,
    COUNT(*) FILTER (
      WHERE t.grade IN ('A','B') AND c.review_state NOT IN ('hold')
        AND EXISTS (
          SELECT 1 FROM restaurant_opening_hours h
          WHERE h.restaurant_id=c.restaurant_id
            AND h.publication_state='published'
            AND h.verified_at IS NOT NULL
            AND NULLIF(BTRIM(h.source_url),'') IS NOT NULL
            AND EXISTS (
              SELECT 1 FROM restaurant_opening_intervals i
              WHERE i.restaurant_id=h.restaurant_id
                AND i.weekday BETWEEN 0 AND 6
                AND i.start_minute>=0
                AND i.end_minute>i.start_minute AND i.end_minute<=1440
            )
        )
        AND NOT EXISTS (
          SELECT 1 FROM restaurant_data_quality_reviews dq
          WHERE dq.restaurant_id=c.restaurant_id
            AND dq.review_state='confirmed_hold'
        )
    ) verified_visible
  FROM whateato_release_cohort_300_v1 c
  JOIN whateato_restaurant_triage_v1 t ON t.restaurant_id=c.restaurant_id
 `);
 const {selected,manually_approved,all_records,a,b,blocked_in_cohort,verified_visible}=rows[0]||{};
 const n=Number(selected),total=Number(all_records),allowed=Number(a)+Number(b);
 const visible=Number(verified_visible);
 if(Number(manually_approved)<1||n!==300||allowed>300||allowed<1||total<300||visible<1||visible>allowed){
  console.error('PUBLIC_CATALOG_PREFLIGHT: rejected_database_or_cohort');
  process.exitCode=1;
 }else{
  console.log('PUBLIC_CATALOG_PREFLIGHT: selected='+n+
    ' A_B='+allowed+' manually_approved='+manually_approved+' verified_hours_visible='+visible+
    ' hours_unverified_hidden='+(allowed-visible)+
    ' total_hidden='+(total-visible)+
    ' C_in_cohort='+blocked_in_cohort);
 }
}catch(error){
 console.error('PUBLIC_CATALOG_PREFLIGHT: invalid_schema_or_connection');
 process.exitCode=1;
}finally{
 await client.end().catch(()=>{});
}
