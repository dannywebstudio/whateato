#!/usr/bin/env node
// Prevent research anomalies from becoming editorial publications by accident.
// This is an offline CI data-quality guard; it does not overwrite permit status.
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
const queue=JSON.parse(readFileSync('data/enrichment-queue/phase25-first20-20261012.json','utf8'));
const report=JSON.parse(readFileSync('data/enrichment-queue/phase3-research-flags-20261012.json','utf8'));
const known=new Map(queue.queue.map(x=>[x.restaurant_id,x]));
assert.equal(report.project,'WhatEatO');
assert.equal(report.batch,queue.batch);
assert.equal(report.policy,'RESEARCH_FLAGS_ARE_NOT_AUTOMATIC_PERMIT_STATUS_UPDATES');
assert.equal(report.count,report.flags.length);
assert.ok(report.count>0);
const flaggedIds=new Set();
const critical=new Set(['POSSIBLE_CLOSURE','NAME_IDENTITY_MISMATCH','BRANCH_ADDRESS_COLLISION','PERMIT_CATEGORY_CONFLICT','INSUFFICIENT_CURRENT_MENU_EVIDENCE']);
for(const flag of report.flags){
  assert.match(flag.restaurant_id,/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i);
  assert.ok(known.has(flag.restaurant_id),'flagged item not in source registry queue');
  assert.ok(!flaggedIds.has(flag.restaurant_id),'duplicate QA flag');
  flaggedIds.add(flag.restaurant_id);
  assert.equal(flag.name_ko,known.get(flag.restaurant_id).name_ko);
  assert.equal(flag.road_address_ko,known.get(flag.restaurant_id).road_address_ko);
  assert.ok(critical.has(flag.code));
  assert.ok(['critical','high','medium'].includes(flag.severity));
  assert.match(flag.evidence_url,/^https:\/\/[^/]+\.[^/]+/);
  assert.ok(flag.finding?.length>=35);
  assert.ok(flag.action.startsWith('HOLD_FOR_'));
  assert.equal(flag.review_status,'unresolved','do not erase warnings without QA review');
  assert.equal(flag.publication_allowed,false);
  assert.equal(known.get(flag.restaurant_id).publication_state,'hold');
}
const packetDir='data/enrichment-packets/review';
for(const file of readdirSync(packetDir).filter(x=>x.endsWith('.json'))){
  const packet=JSON.parse(readFileSync(packetDir+'/'+file,'utf8'));
  assert.ok(!flaggedIds.has(packet.restaurant_id),
    'quarantined source needs identity/closure QA before enrichment: '+file);
}
console.log('PASS:',flaggedIds.size,'flagged restaurants quarantined from research publishing; 0 permit rows modified');
