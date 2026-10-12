#!/usr/bin/env node
// Batch-level research progress and identity QA. No DB connection, no publication.
import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
import {validatePacket} from './enrichment_v1.mjs';
const queue=JSON.parse(readFileSync('data/enrichment-queue/phase25-first20-20261012.json','utf8'));
const known=new Map(queue.queue.map(row=>[row.restaurant_id,row]));
const flags=JSON.parse(readFileSync('data/enrichment-queue/phase3-research-flags-20261012.json','utf8'));
const blocked=new Set(flags.flags.filter(x=>x.review_status==='unresolved').map(x=>x.restaurant_id));

const directory='data/enrichment-packets/review';
const paths=readdirSync(directory).filter(x=>x.endsWith('.json')).sort();
const checked=new Set();
const records=[];
for(const file of paths){
  const parsed=JSON.parse(readFileSync(directory+'/'+file,'utf8'));
  const packet=validatePacket(parsed);
  const original=known.get(packet.restaurant_id);
  assert.ok(original,'Unrecognized restaurant ID in '+file);
  assert.ok(!blocked.has(packet.restaurant_id),'Quarantined restaurant may not have a research packet: '+file);
  assert.equal(packet.name_ko,original.name_ko,'Name must equal original registry record');
  assert.equal(packet.road_address_ko,original.road_address_ko,'Address must equal original registry record');
  assert.ok(!checked.has(packet.restaurant_id),'Duplicate research file for restaurant');
  checked.add(packet.restaurant_id);
  records.push({
    name:packet.name_ko,
    locale_count:packet.localizations.length,
    menu_count:packet.menus.length,
    tag_count:packet.tags.length,
    approved_photos:0,
    approved_editorial_score:false,
    review_required:true
  });
}
const report={
  batch:queue.batch,total:queue.queue.length,researched:records.length,
  awaiting_research:queue.queue.length-records.length,
  quarantined_for_identity_or_closure_review:blocked.size,
  research_eligible_remaining:queue.queue.length-records.length-blocked.size,
  published_by_pipeline:0,
  licensed_photos:0,
  approved_editorial_scores:0,
  documents_awaiting_human_review:records
};
assert.ok(records.length<=queue.queue.length);
console.log(JSON.stringify(report,null,2));
