#!/usr/bin/env node
// Verify the initial evidence-first queue has not been silently turned into
// fabricated menus, editorial scores, rights grants or published material.
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const path='data/enrichment-queue/phase25-first20-20261012.json';
const raw=JSON.parse(readFileSync(path,'utf8'));
assert.equal(raw.project,'WhatEatO');
assert.equal(raw.publication_policy,'DO_NOT_AUTOPUBLISH');
assert.equal(raw.verification,'PENDING_INDEPENDENT_RESEARCH');
assert.equal(raw.candidate_count,20);
assert.equal(raw.queue.length,20);
const ids=new Set();
const frozenFalse=[
 'identity_verified','current_operation_verified','category_checked',
 'menu_verified','description_source_verified','lifestyle_tags_verified',
 'photos_license_verified','editorial_score_approved'
];
for(const row of raw.queue){
  assert.match(row.restaurant_id,/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i);
  assert.ok(!ids.has(row.restaurant_id),'duplicate restaurant');
  ids.add(row.restaurant_id);
  assert.ok(typeof row.name_ko==='string'&&row.name_ko.trim());
  assert.ok(typeof row.road_address_ko==='string'&&row.road_address_ko.includes('서울'));
  assert.ok(Number.isFinite(row.location?.lat)&&row.location.lat>=33&&row.location.lat<=39.5);
  assert.ok(Number.isFinite(row.location?.lon)&&row.location.lon>=124&&row.location.lon<=132);
  assert.equal(row.permit_registry_provider,'localdata');
  assert.equal(row.publication_state,'hold','cannot publish unverified candidate');
  assert.equal(row.research_status,'needs_source_confirmation');
  for(const flag of frozenFalse)assert.equal(row[flag],false,'unverified field cannot be approved: '+flag);
  for(const forbidden of ['editorial_score','photo_url','menu_price','review_count','verified_lifestyle_tags']){
    assert.ok(!(forbidden in row),'unverified content present: '+forbidden);
  }
}
const groups={};
for(const row of raw.queue)groups[row.district]=(groups[row.district]||0)+1;
assert.deepEqual(groups,{'종로구':10,'중구':10});
console.log('PASS: 20 source-linked restaurant candidates are HOLD; no unverified tags, menu prices, photos, scores or publication claims');
