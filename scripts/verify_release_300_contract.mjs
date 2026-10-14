#!/usr/bin/env node
// Source-only regression contract for the opt-in 300-restaurant release.
// Requires NO Neon secrets. Staging data completeness is checked separately
// with sql/staging_release_300_acceptance_v1.sql.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const c=read('sql/staging_select_300_cohort_v1.sql');
const m=read('sql/staging_release_300_menu_locale_tasks_v1.sql');
const draft=read('sql/staging_300_menu_candidate_batch_01.sql');
const publicName=read('src/lib/restaurant-public-name.ts');
const gate=read('src/lib/release-300-gate.ts');
const search=read('src/lib/restaurant-catalog.ts');
const geo=read('src/lib/geo-catalog.ts');
const quotas=[...c.matchAll(/\('([가-힣]+)','([a-z_]+)',(\d+)\)/g)]
 .map(x=>({district:x[1],bucket:x[2],count:Number(x[3])}));
assert.equal(quotas.length,18,'nine food buckets per district');
assert.equal(quotas.filter(q=>q.district==='종로구').reduce((a,b)=>a+b.count,0),180);
assert.equal(quotas.filter(q=>q.district==='중구').reduce((a,b)=>a+b.count,0),120);
assert.equal(quotas.reduce((a,b)=>a+b.count,0),300);
assert.match(c,/ON CONFLICT\(restaurant_id\) DO NOTHING/);
assert.match(c,/review_state text NOT NULL DEFAULT 'pending'/);
assert.match(c,/r\.latitude BETWEEN 33 AND 39\.5/);
assert.match(c,/confirmed_hold/);
assert.match(c,/issue_code='OTHER'/);
assert.match(c,/identity_row=1/);
assert.match(m,/CROSS JOIN \(VALUES \('ko'\),\('en'\),\('ja'\),\('zh-CN'\)\)/);
assert.match(m,/verify_current_branch_menu/);
assert.match(m,/CREATE TABLE IF NOT EXISTS whateato_release_menu_candidate_v1/);
assert.match(draft,/false,'pending',NULL/);
assert.match(draft,/source_checked_on/);
assert.match(publicName,/leadingLegalMarker/);
assert.match(gate,/WHATEATO_RELEASE_COHORT_300_ONLY/);
assert.match(gate,/ready\.review_state='approved'/);
assert.match(gate,/ready\.has_four_locales=true/);
assert.match(gate,/ready\.published_verified_menu_count>0/);
assert.match(gate,/x\.verified_menu_translations<x\.verified_korean_menus/);
assert.equal(search.split('release300PublicWhere()').length-1,2);
assert.equal(geo.split('release300PublicWhere()').length-1,1);
for(const sql of [c,m,draft]){
 // No destructive SQL in first-release staging migrations.
 assert.doesNotMatch(sql,/^\s*(?:DELETE|DROP|TRUNCATE|ALTER\s+TABLE\s+\S+\s+DROP)\b/im);
}
console.log('PASS: 180 Jongno + 120 Jung; food diversity, pending-only approval, provenance, 4-locale and approved-only public gate');
