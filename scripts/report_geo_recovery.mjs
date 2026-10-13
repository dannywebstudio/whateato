#!/usr/bin/env node
// Read-only building-level geo recovery opportunities. Never writes guessed
// coordinates to a restaurant, changes visibility, or calls a bulk geocoder.
import {Client} from 'pg';
import assert from 'node:assert/strict';
const databaseUrl=process.env.DATABASE_URL||'';
let url;
try{url=new URL(databaseUrl)}catch{throw Error('DATABASE_URL required')}
const local=['localhost','127.0.0.1'].includes(url.hostname);
if(local){
  assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
}else{
  assert.match(url.hostname,/\.neon\.tech$/i);
  assert.equal(process.env.WHATEATO_EXPECTED_NEON_BRANCH_ID,'br-autumn-pine-b36z3utm');
  assert.equal(process.env.WHATEATO_COVERAGE_AUDIT_ACK,'STAGING_READ_ONLY');
}
const client=new Client({connectionString:databaseUrl,connectionTimeoutMillis:7000,
  application_name:'whateato_geo_recovery_read_only'});
await client.connect();
try{
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout='15000ms'");
  if(!local){
    const x=await client.query("SELECT current_setting('neon.branch_id',true) AS branch");
    assert.equal(x.rows[0]?.branch,'br-autumn-pine-b36z3utm','refuse production DB');
  }
  const summary=await client.query(`
    WITH missing AS (
      SELECT id,name_ko,region_sigungu,
        COALESCE(NULLIF(BTRIM(road_address_ko),''),NULLIF(BTRIM(lot_address_ko),'')) AS address
      FROM restaurants WHERE latitude IS NULL OR longitude IS NULL
    ), known AS(
      SELECT id,name_ko,
        COALESCE(NULLIF(BTRIM(road_address_ko),''),NULLIF(BTRIM(lot_address_ko),'')) AS address,
        latitude,longitude FROM restaurants
      WHERE latitude BETWEEN 33 AND 39.5 AND longitude BETWEEN 124 AND 132
    ), matched AS(
      SELECT m.id,m.name_ko,m.address,m.region_sigungu,
        COUNT(k.id)::int AS references,
        COUNT(DISTINCT (k.latitude,k.longitude)) FILTER(WHERE k.id IS NOT NULL)::int AS coordinate_variants,
        MIN(k.latitude) AS latitude,MIN(k.longitude) AS longitude
      FROM missing m LEFT JOIN known k ON m.address=k.address AND m.address IS NOT NULL
      GROUP BY m.id,m.name_ko,m.address,m.region_sigungu
    )
    SELECT id::text,name_ko,address,region_sigungu,references,coordinate_variants,latitude,longitude
    FROM matched ORDER BY references DESC,name_ko ASC,id ASC`);
  const rows=summary.rows;
  const candidates=rows.filter(x=>x.references>0);
  const unique=candidates.filter(x=>x.coordinate_variants===1);
  const report={
    source:'public permit records only',mode:local?'ephemeral-ci':'neon-staging',mutations:0,
    missing_coordinate_rows:rows.length,
    exact_address_match_candidates:candidates.length,
    unique_building_coordinate_candidates:unique.length,
    ambiguous_candidates:candidates.filter(x=>x.coordinate_variants>1).length,
    missing_external_geocoding_or_review:rows.length-unique.length,
    candidate_preview:unique.slice(0,20).map(x=>({
      restaurant_id:x.id,name_ko:x.name_ko,address:x.address,
      proposed_building_latitude:x.latitude,proposed_building_longitude:x.longitude,
      evidence:'exact normalized address of another geocoded permit record',
      public_status:'NOT_APPLIED_NOT_VERIFIED_ENTRANCE'
    })),
    note:'Shared buildings can have multiple restaurants. Exact-address coordinates are only review suggestions. No automatic edits or bulk geocoding.'
  };
  assert.equal(report.mutations,0);
  console.log(JSON.stringify(report,null,2));
  await client.query('COMMIT');
}catch(e){await client.query('ROLLBACK').catch(()=>{});throw e}finally{await client.end()}
