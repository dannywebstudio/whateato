#!/usr/bin/env node
// Preview-only A/B exposure contract. Run as part of build.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const gate=read('src/lib/triage-ab-gate.ts');
const cat=read('src/lib/restaurant-catalog.ts');
const geo=read('src/lib/geo-catalog.ts');
assert.match(gate,/WHATEATO_TRIAGE_AB_CATALOG_ONLY!=='true'/);
assert.match(gate,/t.grade IN \('A','B'\)/);
assert.match(gate,/t.visibility IN \('full','basic_map','basic_search_only'\)/);
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
console.log('PASS: opted-in A/B exact cohort gate shared by restaurant search, detail, and geo; C withheld');
