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
    (SELECT COUNT(*) FROM restaurants) all_records,
    COUNT(*) FILTER(WHERE t.grade='A') a,
    COUNT(*) FILTER(WHERE t.grade='B') b,
    COUNT(*) FILTER(WHERE t.grade NOT IN('A','B')) blocked_in_cohort
  FROM whateato_release_cohort_300_v1 c
  JOIN whateato_restaurant_triage_v1 t ON t.restaurant_id=c.restaurant_id
 `);
 const {selected,all_records,a,b,blocked_in_cohort}=rows[0]||{};
 const n=Number(selected),total=Number(all_records),allowed=Number(a)+Number(b);
 if(n!==300||allowed>300||allowed<1||total<300){
  console.error('PUBLIC_CATALOG_PREFLIGHT: rejected_database_or_cohort');
  process.exitCode=1;
 }else{
  console.log('PUBLIC_CATALOG_PREFLIGHT: selected='+n+
    ' allowed='+allowed+' excluded='+ (total-allowed)+
    ' A='+a+' B='+b+' C_in_cohort='+blocked_in_cohort);
 }
}catch(error){
 console.error('PUBLIC_CATALOG_PREFLIGHT: invalid_schema_or_connection');
 process.exitCode=1;
}finally{
 await client.end().catch(()=>{});
}
