#!/usr/bin/env node
// Read-only, source-preserving catalog quality audit. Never edits permit records.
// The staging mode requires explicit branch attestation and cannot audit production.
import {Client} from 'pg';
import assert from 'node:assert/strict';
const value=process.env.DATABASE_URL||'';
let url;
try{url=new URL(value)}catch{throw Error('DATABASE_URL required for catalog audit')}
const local=['localhost','127.0.0.1'].includes(url.hostname);
if(local){
  if(process.env.WHATEATO_CI_LOCAL_FIXTURE!=='ONLY_LOCAL_EPHEMERAL')
    throw Error('Local quality audit requires ephemeral CI acknowledgement');
}else if(!url.hostname.endsWith('.neon.tech')
  ||process.env.WHATEATO_EXPECTED_NEON_BRANCH_ID!=='br-autumn-pine-b36z3utm'
  ||process.env.WHATEATO_AUDIT_STAGING_ACK!=='STAGING_READ_ONLY'){
  throw Error('Quality audit refuses production: expected restricted Neon staging only');
}
const client=new Client({connectionString:value,connectionTimeoutMillis:7000,
  application_name:'whateato_catalog_read_only_audit'});
await client.connect();
try{
  await client.query('BEGIN READ ONLY');
  if(!local){
    const check=await client.query("SELECT current_setting('neon.branch_id',true) AS branch");
    if(check.rows[0]?.branch!=='br-autumn-pine-b36z3utm')
      throw Error('Neon staging branch attestation failed');
  }
  await client.query("SET LOCAL statement_timeout='15000ms'");
  const [counts,duplicates,coincident,flags,locations]=await Promise.all([
    client.query(`SELECT COUNT(*)::int AS records,
      COUNT(*) FILTER(WHERE business_status='active' AND publication_status='published')::int AS permit_active_public,
      COUNT(*) FILTER(WHERE BTRIM(name_ko)='')::int AS missing_name,
      COUNT(*) FILTER(WHERE road_address_ko IS NULL OR BTRIM(road_address_ko)='')::int AS missing_road_address,
      COUNT(*) FILTER(WHERE (road_address_ko IS NULL OR BTRIM(road_address_ko)='')
        AND (lot_address_ko IS NULL OR BTRIM(lot_address_ko)=''))::int AS missing_both_addresses,
      COUNT(*) FILTER(WHERE latitude IS NULL OR longitude IS NULL)::int AS missing_coordinates,
      COUNT(*) FILTER(WHERE latitude IS NOT NULL AND longitude IS NOT NULL
        AND (latitude NOT BETWEEN 33 AND 39.5 OR longitude NOT BETWEEN 124 AND 132))::int AS outside_korea
      FROM restaurants`),
    client.query(`WITH groups AS (
      SELECT lower(BTRIM(name_ko)) AS name,
        COALESCE(NULLIF(BTRIM(road_address_ko),''),NULLIF(BTRIM(lot_address_ko),''),'NO_ADDRESS') AS addr,
        COUNT(*)::int AS n FROM restaurants
      GROUP BY 1,2 HAVING COUNT(*)>1
    ) SELECT COUNT(*)::int AS groups,COALESCE(SUM(n-1),0)::int AS surplus_rows
      FROM groups`),
    client.query(`WITH shared AS (
      SELECT ROUND(latitude::numeric,5) lat,ROUND(longitude::numeric,5) lon,
       COUNT(*)::int AS n FROM restaurants WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       GROUP BY 1,2 HAVING COUNT(*)>1
    ) SELECT COUNT(*)::int AS coordinate_groups,COALESCE(SUM(n),0)::int AS shared_venue_records,
       COALESCE(MAX(n),0)::int AS largest_group FROM shared`),
    client.query(`SELECT review_state,COUNT(*)::int AS n FROM restaurant_data_quality_reviews
      GROUP BY review_state ORDER BY review_state`),
    client.query(`SELECT region_sigungu,COUNT(*)::int AS records FROM restaurants
      GROUP BY region_sigungu ORDER BY records DESC`)
  ]);
  const quality={
    catalog:counts.rows[0],
    exact_name_address_duplicate_candidates:duplicates.rows[0],
    shared_coordinates_not_necessarily_duplicates:coincident.rows[0],
    quality_reviews:Object.fromEntries(flags.rows.map(x=>[x.review_state,x.n])),
    locations:locations.rows,
    note:'Registry permit active is not evidence of current opening. Missing and duplicate fields are not overwritten automatically.',
    writes_performed:0
  };
  assert.equal(quality.catalog.outside_korea,0,'unexpected Korean coordinate range violations');
  if(local){
    assert.equal(quality.catalog.records,10,'fixture now includes 4 isolated spatial coverage test records');
    assert.equal(quality.quality_reviews.confirmed_hold,1);
    assert.equal(quality.quality_reviews.pending,1);
    assert.equal(quality.catalog.missing_road_address,1);
  }
  console.log(JSON.stringify(quality,null,2));
  await client.query('COMMIT');
}catch(e){
  await client.query('ROLLBACK').catch(()=>{});
  throw e;
}finally{await client.end()}
