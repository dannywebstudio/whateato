#!/usr/bin/env node
// Preview-only A/B exposure contract. Run as part of build.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const gate=read('src/lib/triage-ab-gate.ts');
const cat=read('src/lib/restaurant-catalog.ts');
const geo=read('src/lib/geo-catalog.ts');
assert.ok(gate.includes('whateato_restaurant_public_approvals_v1'));
assert.ok(gate.includes('approval.is_visible=true'));
assert.ok(gate.includes("triage.grade='C'"),'graded C must never be visible');
assert.ok(gate.includes("triage.visibility NOT IN ('full','basic_map','basic_search_only')"));
assert.match(gate,/dq.review_state='confirmed_hold'/);
assert.match(gate,/FROM restaurant_opening_hours hours/);
assert.match(gate,/hours.publication_state='published'/);
assert.match(gate,/hours.verified_at IS NOT NULL/);
assert.ok(gate.includes("NULLIF(BTRIM(hours.source_url),'') IS NOT NULL"));
assert.match(gate,/FROM restaurant_opening_intervals slots/);
assert.match(gate,/slots.end_minute>slots.start_minute/);
assert.match(gate,/PERMIT_CATEGORY_CONFLICT/);
assert.equal((cat.match(/triageABPublicWhere\(\)/g)||[]).length,2);
assert.equal((geo.match(/triageABPublicWhere\(\)/g)||[]).length,1);
assert.equal((cat.match(/triageDisplayCategorySql\(\)/g)||[]).length,2);
assert.equal((geo.match(/triageDisplayCategorySql\(\)/g)||[]).length,1);
assert.equal((cat.match(/al\.verified_at IS NOT NULL/g)||[]).length,2);
assert.equal((geo.match(/al\.verified_at IS NOT NULL/g)||[]).length,1);
assert.match(geo,/m\.evidence_ref/);
assert.ok(!gate.includes('DELETE FROM'));
console.log('PASS: owner-only public approval, C exclusion and verified-hours search/detail/geo');
