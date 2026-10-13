#!/usr/bin/env node
// CI ONLY: integration test in isolated PostgreSQL fixture. Never runs on Neon.
import assert from 'node:assert/strict';
import pg from 'pg';
import {validatePacket,stagePacket} from './enrichment_v1.mjs';

assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
assert.equal(process.env.WHATEATO_ENRICHMENT_STAGE_ACK,'LOCAL_CI_ONLY');
const loc=new URL(process.env.DATABASE_URL);
assert.ok(['127.0.0.1','localhost'].includes(loc.hostname));
const NOW=new Date().toISOString();
const source='https://evidence.invalid/ci-synthetic-not-a-real-record';
const base={
  schema_version:'whateato.enrichment.v1',
  restaurant_id:'11111111-1111-4111-8111-111111111111',
  name_ko:'테스트카페',
  road_address_ko:'서울특별시 종로구 샘플로 1',
  identity_evidence:{url:source,checked_at:NOW},
  localizations:[
    {locale:'en',display_name:'Must not overwrite Sunny Table',
      short_description:'Must not overwrite published description',source_url:source,checked_at:NOW},
    {locale:'ko',display_name:'테스트카페',short_description:'근거 확인 전 검토 전용 CI 설명',
      source_url:source,checked_at:NOW}
  ],
  tags:[
    {code:'cafe',source_url:source,checked_at:NOW},
    {code:'date_night',source_url:source,checked_at:NOW}
  ],
  menus:[{name_ko:'검토 중인 CI 메뉴',position:25,price_krw:1234,source_url:source,checked_at:NOW}],
  images:[{storage_key:'media/ci-only/draft-photo.webp',
    alt_ko:'비공개 CI 테스트용 사진',source_url:source,rights_document_url:source,
    rights_checked_at:NOW}],
  editorial_score:{
    score:1.1,methodology_version:'synthetic-ci-review-v1',
    evidence_summary:'Synthetic draft score must never override already approved public editorial score.',
    source_url:source,checked_at:NOW
  }
};
const check=validatePacket(base);
assert.equal(check.localizations.length,2);
assert.equal(check.images.length,1);
for(const [name,change] of [
  ['identity mismatch',p=>p.name_ko='다른 상호명'],
  ['missing evidence',p=>p.identity_evidence.url=''],
  ['unlicensed HTTP ref',p=>p.images[0].rights_document_url='http://example.invalid/invalid'],
  ['malformed image path',p=>p.images[0].storage_key='../secrets.key'],
  ['faked external rating',p=>p.editorial_score.methodology_version='google-average'],
  ['bad locale',p=>p.localizations[0].locale='fr'],
  ['unknown tag',p=>p.tags[0].code='unverified_popular'],
  ['duplicate menu',p=>p.menus.push({...p.menus[0]})],
  ['invalid price',p=>p.menus[0].price_krw=-1],
  ['future evidence',p=>p.identity_evidence.checked_at='2099-01-01T00:00:00Z'],
]){
  const packet=structuredClone(base);change(packet);
  if(name==='identity mismatch')continue; // valid structural packet; DB identity gate tested below
  assert.throws(()=>validatePacket(packet),undefined,name);
}
const result=await stagePacket(base);
assert.equal(result.staged,true);
assert.equal(result.public_content_published,false);
await stagePacket(base); // idempotence
const client=new pg.Client({connectionString:process.env.DATABASE_URL});
await client.connect();
try{
  const id=base.restaurant_id;
  const locs=await client.query('SELECT locale,display_name,publication_state,verified_at FROM restaurant_localizations WHERE restaurant_id=$1 ORDER BY locale',[id]);
  assert.equal(locs.rows.length,2);
  assert.equal(locs.rows.find(x=>x.locale==='en').display_name,'Sunny Table','published translation immutable');
  assert.equal(locs.rows.find(x=>x.locale==='en').publication_state,'published');
  assert.equal(locs.rows.find(x=>x.locale==='ko').publication_state,'review');
  assert.equal(locs.rows.find(x=>x.locale==='ko').verified_at,null);
  const tags=await client.query('SELECT tag_code,verification_state,verified_at FROM restaurant_tag_assignments WHERE restaurant_id=$1 ORDER BY tag_code',[id]);
  assert.equal(tags.rows.find(x=>x.tag_code==='cafe').verification_state,'verified','verified tag must not downgrade');
  assert.equal(tags.rows.find(x=>x.tag_code==='date_night').verification_state,'proposed');
  assert.equal(tags.rows.find(x=>x.tag_code==='date_night').verified_at,null);
  const stagedMenu=await client.query("SELECT publication_state,price_verified_at FROM restaurant_menus WHERE restaurant_id=$1 AND evidence_ref=$2",[id,source]);
  assert.equal(stagedMenu.rows.length,1,'repeat staging should not create duplicate menus');
  assert.equal(stagedMenu.rows[0].publication_state,'draft');
  assert.equal(stagedMenu.rows[0].price_verified_at,null,'price verification never implied');
  const image=await client.query('SELECT publication_state,rights_status,rights_verified_at FROM restaurant_images WHERE storage_key=$1',['media/ci-only/draft-photo.webp']);
  assert.equal(image.rows.length,1);
  assert.equal(image.rows[0].rights_status,'pending','rights URL is not a license grant');
  assert.equal(image.rows[0].publication_state,'draft');
  assert.equal(image.rows[0].rights_verified_at,null);
  const score=await client.query('SELECT score::float8 AS score,approval_state FROM restaurant_editorial_scores WHERE restaurant_id=$1',[id]);
  assert.equal(score.rows[0].score,4.5,'approved rating must not be overwritten');
  assert.equal(score.rows[0].approval_state,'approved');
  const legacyMenu=await client.query(`INSERT INTO restaurant_menus
    (restaurant_id,position,publication_state,evidence_ref) VALUES($1,19,'draft',$2)
    RETURNING id`,[id,source]);
  await client.query(`INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
    VALUES($1,'ko','기존 수동 이관 메뉴')`,[legacyMenu.rows[0].id]);
  const sameFromOtherImporter=structuredClone(base);
  sameFromOtherImporter.localizations=[];
  sameFromOtherImporter.tags=[];
  sameFromOtherImporter.images=[];
  sameFromOtherImporter.editorial_score=null;
  sameFromOtherImporter.menus=[{
    name_ko:'기존 수동 이관 메뉴',position:19,price_krw:null,
    source_url:source,checked_at:NOW
  }];
  await stagePacket(sameFromOtherImporter);
  const migrated=await client.query(`SELECT COUNT(*)::int AS num FROM restaurant_menus m
    JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id AND ml.locale='ko'
    WHERE m.restaurant_id=$1 AND ml.name='기존 수동 이관 메뉴' AND m.position=19`,[id]);
  assert.equal(migrated.rows[0].num,1,'adopt existing staging menu from a prior importer');
  const broken=structuredClone(base);broken.name_ko='다른 상호명';
  await assert.rejects(stagePacket(broken),/identity\/address mismatch/);
  const after=await client.query(`SELECT count(*)::int AS count FROM restaurant_menus m JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id AND ml.locale='ko' WHERE m.restaurant_id=$1 AND m.evidence_ref=$2 AND ml.name='검토 중인 CI 메뉴'`,[id,source]);
  assert.equal(after.rows[0].count,1,'mismatch must roll back');
  // A second, previously unscored restaurant only receives a review-state score.
  const other=structuredClone(base);
  other.restaurant_id='22222222-2222-4222-8222-222222222222';
  other.name_ko='테스트식당';
  other.road_address_ko='서울특별시 종로구 샘플로 2';
  other.localizations=[];
  other.tags=[];
  other.menus=[];
  other.images=[];
  other.editorial_score.score=3.0;
  await stagePacket(other);
  const draft=await client.query('SELECT score::float8 AS score,approval_state,verified_at FROM restaurant_editorial_scores WHERE restaurant_id=$1',[other.restaurant_id]);
  assert.equal(draft.rows[0].score,3.0);
  assert.equal(draft.rows[0].approval_state,'review');
  assert.equal(draft.rows[0].verified_at,null);
  console.log('PASS: structured evidence validation, staging-only drafts, idempotency, identity rollback, licensed media gates, approved-content preservation');
}finally{await client.end()}
