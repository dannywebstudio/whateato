#!/usr/bin/env node
// Preview-only A/B exposure contract. Run as part of build.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const gate=read('src/lib/triage-ab-gate.ts');
const cat=read('src/lib/restaurant-catalog.ts');
const geo=read('src/lib/geo-catalog.ts');
assert.ok(gate.includes('whateato_release_cohort_300_v1'));
assert.ok(gate.includes("triage.grade IN ('A','B')"));
assert.ok(gate.includes("triage.visibility IN ('full','basic_map','basic_search_only')"));
assert.match(gate,/dq.review_state='confirmed_hold'/);
assert.match(gate,/PERMIT_CATEGORY_CONFLICT/);
assert.equal((cat.match(/triageABPublicWhere\(\)/g)||[]).length,2);
assert.equal((geo.match(/triageABPublicWhere\(\)/g)||[]).length,1);
assert.equal((cat.match(/triageDisplayCategorySql\(\)/g)||[]).length,2);
assert.equal((geo.match(/triageDisplayCategorySql\(\)/g)||[]).length,1);
assert.equal((cat.match(/al\.verified_at IS NOT NULL/g)||[]).length,2);
assert.equal((geo.match(/al\.verified_at IS NOT NULL/g)||[]).length,1);
assert.match(geo,/m\.evidence_ref/);
assert.ok(!gate.includes('DELETE FROM'));
console.log('PASS: mandatory 300 whitelist A/B search/detail/geo');
