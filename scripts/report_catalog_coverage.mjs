#!/usr/bin/env node
/**
 * WhatEatO Phase 1–2 coverage and readiness inventory.
 * Read-only. Never guesses a restaurant's menu, rating, photo rights, or current hours.
 * CI operates only against an ephemeral local fixture; Neon mode requires explicit
 * staging acknowledgement AND runtime Neon branch attestation.
 */
import {Client} from 'pg';
import assert from 'node:assert/strict';
const raw=process.env.DATABASE_URL||'';
let uri;
try {uri=new URL(raw)} catch {throw Error('DATABASE_URL required for read-only coverage audit')}
const local=['localhost','127.0.0.1'].includes(uri.hostname);
const STAGING='br-autumn-pine-b36z3utm';
if(local){
  assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL',
    'Local audit requires isolated CI database');
}else{
  assert.match(uri.hostname,/\.neon\.tech$/i,'Neon hostname required');
  assert.equal(process.env.WHATEATO_COVERAGE_AUDIT_ACK,'STAGING_READ_ONLY',
    'Explicit staging-only read acknowledgement required');
  assert.equal(process.env.WHATEATO_EXPECTED_NEON_BRANCH_ID,STAGING,
    'Cannot run inventory against an unspecified/production branch');
}
const client=new Client({connectionString:raw,connectionTimeoutMillis:7000,
  application_name:'whateato_phase12_read_only_coverage'});
await client.connect();
try {
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout='15000ms'");
  if(!local){
    const check=await client.query("SELECT current_setting('neon.branch_id',true) AS branch");
    assert.equal(check.rows[0]?.branch,STAGING,'Connected to an unexpected branch');
  }
  const [catalog,regions,types,flags,enrichment] = await Promise.all([
    client.query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER(WHERE publication_status='published' AND business_status='active')::int AS permit_public,
      COUNT(*) FILTER(WHERE latitude BETWEEN 33 AND 39.5 AND longitude BETWEEN 124 AND 132)::int AS valid_coordinates,
      COUNT(*) FILTER(WHERE NULLIF(BTRIM(road_address_ko),'') IS NULL
        AND NULLIF(BTRIM(lot_address_ko),'') IS NULL)::int AS missing_both_addresses
      FROM restaurants`),
    client.query(`SELECT region_sigungu AS district,COUNT(*)::int AS restaurants
      FROM restaurants GROUP BY 1 ORDER BY restaurants DESC,district ASC`),
    client.query(`SELECT category_code AS permit_category,COUNT(*)::int AS restaurants
      FROM restaurants GROUP BY 1 ORDER BY restaurants DESC,permit_category ASC LIMIT 20`),
    client.query(`SELECT review_state,COUNT(*)::int AS restaurants
      FROM restaurant_data_quality_reviews GROUP BY 1 ORDER BY 1`),
    client.query(`SELECT
      (SELECT COUNT(DISTINCT restaurant_id)::int FROM restaurant_localizations
         WHERE publication_state='published' AND verified_at IS NOT NULL) AS restaurants_with_verified_description_or_name,
      (SELECT COUNT(DISTINCT restaurant_id)::int FROM restaurant_menus
         WHERE publication_state='published' AND NULLIF(BTRIM(evidence_ref),'') IS NOT NULL) AS restaurants_with_published_menus,
      (SELECT COUNT(DISTINCT restaurant_id)::int FROM restaurant_tag_assignments
         WHERE verification_state='verified' AND verified_at IS NOT NULL
         AND NULLIF(BTRIM(evidence_ref),'') IS NOT NULL) AS restaurants_with_verified_tags,
      (SELECT COUNT(DISTINCT restaurant_id)::int FROM restaurant_images
         WHERE publication_state='published' AND rights_status='approved'
           AND rights_verified_at IS NOT NULL AND NULLIF(BTRIM(usage_rights_reference),'') IS NOT NULL)
         AS restaurants_with_rights_approved_photos,
      (SELECT COUNT(DISTINCT restaurant_id)::int FROM restaurant_editorial_scores
         WHERE approval_state='approved' AND verified_at IS NOT NULL)
         AS restaurants_with_approved_independent_score,
      (SELECT COUNT(*)::int FROM restaurant_localizations WHERE publication_state='review') AS descriptions_awaiting_review,
      (SELECT COUNT(*)::int FROM restaurant_menus WHERE publication_state='draft') AS menus_awaiting_review
    `)
  ]);
  const count=catalog.rows[0];
  const published=enrichment.rows[0];
  const denominator=count.permit_public||1;
  const pct=n=>Math.round(10000*n/denominator)/100;
  const report={
    project:'WhatEatO',stage:local?'isolated-ci':'neon-staging',mutations:0,
    permit_catalog:count,districts:regions.rows,permit_categories:types.rows,
    quality_reviews:flags.rows,approved_enrichment:published,
    published_coverage_percent:{
      descriptions:pct(published.restaurants_with_verified_description_or_name),
      menus:pct(published.restaurants_with_published_menus),
      verified_tags:pct(published.restaurants_with_verified_tags),
      licensed_photos:pct(published.restaurants_with_rights_approved_photos),
      independent_scores:pct(published.restaurants_with_approved_independent_score)
    },
    publication_policy:'NO_AUTOPUBLISH_UNVERIFIED_CONTENT',
    note:'Permit status is not current-open verification. All published enrichment requires independent evidence and human/owner-approved rights.'
  };
  assert.ok(count.valid_coordinates<=count.total);
  for(const value of Object.values(report.published_coverage_percent))
    assert.ok(value>=0&&value<=100);
  console.log(JSON.stringify(report,null,2));
  await client.query('COMMIT');
}catch(error){
  await client.query('ROLLBACK').catch(()=>{});
  throw error;
}finally{await client.end()}
