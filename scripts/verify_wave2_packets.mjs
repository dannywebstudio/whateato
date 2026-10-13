#!/usr/bin/env node
// Wave 2: cross-source reviewed Korean restaurant research; never publishes,
// approves images, invents ratings or asserts real-time operating status.
import {readFileSync} from 'node:fs';
import {strict as assert} from 'node:assert';
import {validatePacket} from './enrichment_v1.mjs';
const records=[
  ['mijin-gwanghwamun','16918f58-4e63-4e49-a013-aad17e499ad4','광화문 미진',3],
  ['wooraeok','2daa58f1-6360-4ddb-a27f-6e6d1437a122','우래옥',2],
  ['cheongjinok','6cc37914-1bb8-406e-a365-34c897b4f26f','청진옥',3]
];
let locales=0,menus=0;
for(const [slug,id,name,menuCount] of records){
  const p=JSON.parse(readFileSync('data/enrichment-packets/wave2/'+slug+'-20261013.json','utf8'));
  const v=validatePacket(p);
  assert.equal(v.restaurant_id,id);
  assert.equal(v.name_ko,name);
  assert.equal(v.localizations.length,4);
  assert.equal(v.menus.length,menuCount);
  assert.deepEqual(v.localizations.map(x=>x.locale).sort(),['en','ja','ko','zh-CN'].sort());
  assert.deepEqual(v.tags,[],'do not infer lifestyle tags from the cuisine');
  assert.deepEqual(v.images,[],'third-party photographs are not licensed');
  assert.equal(v.score,null,'never invent editorial ratings');
  assert.ok(v.menus.every(x=>x.price_krw===null),'unverified prices must stay null');
  const roots=new Set([p.identity_evidence.url,...p.localizations.map(x=>x.source_url),...p.menus.map(x=>x.source_url)]
    .map(x=>new URL(x).hostname.replace(/^www\./,'')));
  assert.ok(roots.size>=2,'need independently attributable source domains');
  locales+=v.localizations.length;menus+=v.menus.length;
}
assert.equal(locales,12);assert.equal(menus,8);
console.log('PASS: 3 genuine DB-identified research packets, 12 review-only localizations, 8 unpriced draft menus; zero unlicensed images or fabricated scores');
