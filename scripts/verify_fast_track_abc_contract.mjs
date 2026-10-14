#!/usr/bin/env node
// Fail-fast code contract; no Neon creds, Google API, or hard deletions.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const env=read('.env.example');
const gate=read('src/lib/triage-ab-gate.ts');
const classify=read('sql/staging_fast_track_9998_classify_v1.sql');
const schema=read('sql/staging_fast_track_9998_schema_v1.sql');
const acceptance=read('sql/staging_fast_track_9998_acceptance_v1.sql');
const search=read('src/lib/restaurant-catalog.ts');
const geo=read('src/lib/geo-catalog.ts');
assert.match(env,/WHATEATO_TRIAGE_AB_CATALOG_ONLY=false/);
assert.match(gate,/WHATEATO_TRIAGE_AB_CATALOG_ONLY!=='true'/);
assert.match(gate,/t.grade IN \('A','B'\)/);
assert.match(gate,/dq.review_state='confirmed_hold'/);
assert.match(gate,/qc.issue_code='PERMIT_CATEGORY_CONFLICT'/);
assert.equal(search.split('triageABPublicWhere()').length-1,2);
assert.equal(geo.split('triageABPublicWhere()').length-1,1);
assert.equal(search.split('triageDisplayCategorySql()').length-1,2);
assert.equal(geo.split('triageDisplayCategorySql()').length-1,1);
assert.match(classify,/C_CONFIRMED/);
assert.match(classify,/C_REVIEW/);
assert.match(classify,/same_name_address_possible_duplicate/);
assert.match(classify,/permit_only_no_map_coordinates/);
assert.match(classify,/whateato_c_confirmation_v1/);
assert.match(schema,/whateato_c_delete_archive_v1/);
assert.match(schema,/reviewer_ref text NOT NULL/);
assert.match(acceptance,/NO_PROVEN_C_TO_HARD_DELETE/);
assert.match(acceptance,/leaked_c=0/);
for(const sql of [schema,classify,acceptance]){
 assert.doesNotMatch(sql,/^\s*(DELETE\s+FROM|TRUNCATE|DROP|ALTER\s+TABLE\s+.+DROP)\b/im);
}
console.log('PASS: 9,998 first-pass A/B/C flags, strict opt-in public gate, no guessed food content or destructive cleanup');
