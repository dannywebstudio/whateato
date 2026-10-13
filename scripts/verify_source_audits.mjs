#!/usr/bin/env node
// Phase 2 independent-source research remains REVIEW ONLY.
// Rejects accidental publication flags, bogus photo rights or synthetic ratings.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const audit=JSON.parse(readFileSync('data/research-audits/phase12-source-check-20261013.json','utf8'));
assert.equal(audit.schema_version,'whateato.source_audit.v1');
assert.equal(audit.publication_policy,'EVIDENCE_RESEARCH_ONLY_NO_AUTOPUBLISH');
const queue=JSON.parse(readFileSync('data/enrichment-queue/phase25-first20-20261012.json','utf8'));
const byId=new Map(queue.queue.map(x=>[x.restaurant_id,x]));
const ids=new Set();
for(const row of audit.restaurants){
  assert.ok(!ids.has(row.restaurant_id),'duplicate research subject');
  ids.add(row.restaurant_id);
  assert.match(row.restaurant_id,/^[a-f0-9-]{36}$/);
  const original=byId.get(row.restaurant_id);
  assert.ok(original,'research subject absent from original registry queue');
  assert.equal(row.name_ko,original.name_ko,'cannot replace registry identity');
  assert.equal(row.identity_name_address_corrobated,true);
  assert.ok(Array.isArray(row.sources)&&row.sources.length>=2,
    'need independent source comparison');
  const hosts=new Set();
  for(const source of row.sources){
    const u=new URL(source.url);
    assert.equal(u.protocol,'https:');
    assert.ok(!u.username&&!u.password);
    hosts.add(u.hostname.replace(/^www\./,''));
    assert.ok(Array.isArray(source.supports)&&source.supports.length>0);
  }
  assert.ok(hosts.size>=2,'independent hostname required');
  assert.equal(row.price_verified,false,'price is volatile and must be separately verified');
  assert.equal(row.photos_license_verified,false,'website photos are not automatically licensed');
  assert.equal(row.editorial_score_approved,false,'do not rebrand external ratings');
  assert.equal(row.current_open_verified,false,'online listings do not prove current opening');
  assert.equal(row.editorial_review_required,true,'human/owner review remains required');
}
assert.equal(audit.restaurants.length,2);
console.log('PASS: two cross-checked real source packets stay review-only; 0 auto-approved scores/photos/prices');
