#!/usr/bin/env node
// WhatEatO daily research queue — read only, no content invention, no DB changes.
import pg from 'pg';
import {writeFileSync} from 'node:fs';
const connectionString=process.env.WHATEATO_STAGING_DATABASE_URL;
if(!connectionString)throw Error('Missing WHATEATO_STAGING_DATABASE_URL');
const dailyLimit=Number(process.env.DAILY_TARGETS||20);
if(!Number.isInteger(dailyLimit)||dailyLimit<1||dailyLimit>100)throw Error('DAILY_TARGETS must be 1..100');
const db=new pg.Client({connectionString,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:15000,statement_timeout:30000});
await db.connect();
try{
 const result=await db.query(`
 SELECT r.id::text AS restaurant_id,r.sbiz_source_key,r.name_ko,
 COALESCE(r.road_address_ko,r.lot_address_ko) AS address_ko,
 r.region_sido,r.region_sigungu,r.category_code,
 cr.published_languages,cr.verified_menus,cr.verified_tags,
 cr.approved_images,cr.approved_external_ratings,cr.next_action
 FROM restaurant_content_readiness_v1 cr
 JOIN restaurants r ON r.id=cr.id
 WHERE r.business_status='active' AND r.publication_status='published'
 AND cr.next_action NOT IN ('identity_or_evidence_hold')
 ORDER BY
 CASE WHEN r.region_sido IN ('서울특별시','서울') THEN 1
 WHEN r.region_sido IN ('인천광역시','인천') THEN 2
 WHEN r.region_sido IN ('경기도','경기') THEN 3
 WHEN r.region_sido IN ('부산광역시','부산') THEN 4
 WHEN r.region_sido IN ('경상북도','경북') AND r.region_sigungu LIKE '경주시%' THEN 5
 WHEN r.region_sido IN ('대구광역시','대구') THEN 6 ELSE 7 END,
 CASE cr.next_action WHEN 'research_review' THEN 0 WHEN 'needs_media_or_menu' THEN 1 ELSE 2 END,
 r.sbiz_source_key COLLATE "C"
 LIMIT $1`,[dailyLimit]);
 const batch={schema_version:'whateato.daily_research_queue.v1',
 generated_at:new Date().toISOString(),count:result.rows.length,
 geography:'Seoul > Incheon > Gyeonggi (distance pending) > Busan > Gyeongju > Daegu > rest',
 source_priority:'Google Places official licensed API -> Naver official permitted API -> official venue / government',
 approval_policy:'Research only. Verified source links, exact address + permit identity, license checks and reviewer approval required before publication.',
 no_invented_scores_or_images:true, automatic_publication:false,
 targets:result.rows.map(r=>({...r,research_tasks:[
 'Confirm exact branch with Google and Naver name/address matches',
 'Verify official main menu and current prices (if source available)',
 'Verify factual descriptions in Korean; translate into en, ja, zh-CN from verified source',
 'Check lifestyle tags against explicit source evidence',
 'Confirm opening hours and freshness',
 'Identify licensed photos and document reproduction permission',
 'Record provider ratings only if display rights and attribution permit'
 ]}))};
 writeFileSync('daily-restaurant-research-queue.json',JSON.stringify(batch,null,2)+'\n');
 console.log(JSON.stringify({generated_at:batch.generated_at,count:batch.count,first:result.rows.slice(0,5).map(r=>({name:r.name_ko,action:r.next_action})),automatic_publication:false}));
}finally{await db.end()}
