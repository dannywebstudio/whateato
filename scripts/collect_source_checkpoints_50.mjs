#!/usr/bin/env node
/**
 * Bounded staging-only restaurant identity collection.
 * Official identity is already in WhatEatO staging.
 * NAVER raw responses are transient; store classifications only.
 * Google Places New field mask places.id only (free IDs-Only SKU).
 * Never collects ratings, photos, menu, hours, or paid fields.
 * Checkpoints persist to prevent re-billing/re-requesting on later prompts.
 */
import pg from 'pg';
import {createHash} from 'node:crypto';
const branch='br-autumn-pine-b36z3utm';
const url=process.env.WHATEATO_STAGING_DATABASE_URL||'';
const navId=process.env.NAVER_CLIENT_ID,navSecret=process.env.NAVER_CLIENT_SECRET;
const googleKey=process.env.GOOGLE_PLACES_API_KEY;
const limit=Number(process.env.WHATEATO_MATCH_BATCH_LIMIT||'5');
if(!Number.isInteger(limit)||limit<1||limit>5)throw Error('Pilot hard cap is 5 places per run');
if(!navId||!navSecret||!googleKey)throw Error('Missing API secrets');
const host=new URL(url).hostname;
if(!host.endsWith('.neon.tech') || process.env.WHATEATO_EXPECTED_NEON_BRANCH_ID!==branch)
  throw Error('Staging-only access rejected');
const db=new pg.Client({connectionString:url,connectionTimeoutMillis:15000});
const compact=x=>String(x||'').normalize('NFKC').replace(/<[^>]*>/g,'').replace(/\\s+/g,'').replace(/[()\[\]{}.,·'’"\\-_/]/g,'').toLowerCase();
const roadCore=x=>{
 const a=String(x||'').replace(/\\([^)]*\\)/g,'').replace(/서울특별시/g,'서울');
 const hit=a.match(/([가-힣0-9]+(?:로|길))\\s*(\\d+(?:-\\d+)?)/);
 return hit ? compact(hit[1]+hit[2]) : '';
};
const fingerprint=x=>createHash('sha256').update(x.name_ko+'|'+x.address_ko).digest('hex');
const fetchWithDeadline=async(url,options)=>{
 const c=new AbortController(),t=setTimeout(()=>c.abort(),13000);
 try{return await fetch(url,{...options,signal:c.signal})}finally{clearTimeout(t)}
};
async function naverCheck(row){
 const district=(row.address_ko.match(/[가-힣]+구/)||[])[0]||'';
 const u=new URL('https://naverapihub.apigw.ntruss.com/search/v1/local');
 u.searchParams.set('query',row.name_ko+' '+district);
 u.searchParams.set('display','5');
 const r=await fetchWithDeadline(u,{headers:{'X-NCP-APIGW-API-KEY-ID':navId,'X-NCP-APIGW-API-KEY':navSecret}});
 if(!r.ok)throw Error('NAVER_HTTP_'+r.status);
 const d=await r.json();
 if(!Array.isArray(d.items))throw Error('NAVER_INVALID_RESPONSE');
 const name=compact(row.name_ko),road=roadCore(row.address_ko);
 const exact=d.items.filter(x=>compact(x.title)===name && road && roadCore(x.roadAddress||x.address)===road).length;
 return {decision:exact===1?'EXACT_ONE':exact>1?'AMBIGUOUS':'NO_EXACT',exact};
}
async function googleCheck(row){
 const district=(row.address_ko.match(/[가-힣]+구/)||[])[0]||'';
 const r=await fetchWithDeadline('https://places.googleapis.com/v1/places:searchText',{
  method:'POST',
  headers:{'Content-Type':'application/json','X-Goog-Api-Key':googleKey,'X-Goog-FieldMask':'places.id'},
  body:JSON.stringify({textQuery:row.name_ko+' '+district,languageCode:'ko',regionCode:'KR',pageSize:1})
 });
 if(!r.ok)throw Error('GOOGLE_HTTP_'+r.status);
 const j=await r.json();const p=Array.isArray(j.places)?j.places:[];
 if(p.some(x=>Object.keys(x).some(k=>k!=='id')))throw Error('GOOGLE_UNEXPECTED_FIELDS');
 return {id:typeof p[0]?.id==='string'?p[0].id:null,count:p.length};
}
await db.connect();
try{
 const attest=await db.query("SELECT current_setting('neon.branch_id',true) AS id");
 if(attest.rows[0]?.id!==branch)throw Error('Neon branch attestation mismatch');
 const targets=await db.query(`SELECT s.restaurant_id,s.sample_rank,s.name_ko,s.address_ko, r.business_status
 FROM restaurant_enrichment_sample_1000 s JOIN restaurants r ON r.id=s.restaurant_id
 WHERE s.sample_rank<=50 ORDER BY s.sample_rank LIMIT $1`,[limit]);
 const stats={sampled:targets.rows.length,naverCalls:0,googleCalls:0,naverCacheHits:0,googleCacheHits:0,failed:0};
 for(const row of targets.rows){
  if(row.business_status!=='active'){console.log(JSON.stringify({rank:row.sample_rank,status:'hold_inactive'}));continue}
  const fp=fingerprint(row);
  const prev=(await db.query('SELECT * FROM restaurant_source_match_checkpoints_v1 WHERE restaurant_id=$1',[row.restaurant_id])).rows[0];
  // If the underlying official permit identity changes, previous cross-check is invalidated.
  const valid=prev?.official_name_fingerprint===fp;
  let nav=valid&&prev.naver_checked_at?{decision:prev.naver_decision,exact:prev.naver_exact_count}:null;
  let google=valid&&prev.google_checked_at?{id:prev.google_place_id,count:prev.google_id_candidate_count}:null;
  if(nav)stats.naverCacheHits++;
  else {
   try{nav=await naverCheck(row);stats.naverCalls++}catch(e){stats.failed++;console.error(JSON.stringify({rank:row.sample_rank,source:'naver',error:String(e.message).slice(0,60)}))}
  }
  if(google)stats.googleCacheHits++;
  else {
   try{google=await googleCheck(row);stats.googleCalls++}catch(e){stats.failed++;console.error(JSON.stringify({rank:row.sample_rank,source:'google',error:String(e.message).slice(0,60)}))}
  }
  if(!nav&&!google)continue;
  const state=nav?.decision==='EXACT_ONE'?'candidate':'review';
  await db.query(`INSERT INTO restaurant_source_match_checkpoints_v1
  (restaurant_id,official_name_fingerprint,naver_checked_at,naver_decision,naver_exact_count,google_checked_at,google_place_id,google_id_candidate_count,state)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  ON CONFLICT (restaurant_id) DO UPDATE SET
   official_name_fingerprint=EXCLUDED.official_name_fingerprint,
   naver_checked_at=EXCLUDED.naver_checked_at,naver_decision=EXCLUDED.naver_decision,naver_exact_count=EXCLUDED.naver_exact_count,
   google_checked_at=EXCLUDED.google_checked_at,google_place_id=EXCLUDED.google_place_id,
   google_id_candidate_count=EXCLUDED.google_id_candidate_count,state=EXCLUDED.state,updated_at=now()`,[
    row.restaurant_id,fp,nav?new Date():null,nav?.decision||null,nav?.exact??null,
    google?new Date():null,google?.id||null,google?.count??null,state
  ]);
  console.log(JSON.stringify({rank:row.sample_rank,state,naver:nav?.decision||'missing',googleIdsOnly:google?.count??null,approved:false}));
 }
 console.log(JSON.stringify({summary:stats,paidGoogleFieldsRequested:0,thirdPartyRawResponsesStored:false,publications:0}));
 if(stats.failed)process.exitCode=1;
}finally{await db.end()}
