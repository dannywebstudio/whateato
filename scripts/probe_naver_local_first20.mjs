#!/usr/bin/env node
// NAVER API HUB Local Search: bounded, read-only matching probe.
// No raw NAVER API results stored, no website publication, no DB writes.
import pg from 'pg';
const id=process.env.NAVER_CLIENT_ID,secret=process.env.NAVER_CLIENT_SECRET;
if(!id||!secret)throw Error('Missing NAVER_CLIENT_ID or NAVER_CLIENT_SECRET');
const dburl=process.env.WHATEATO_STAGING_DATABASE_URL;
if(!dburl)throw Error('Missing WHATEATO_STAGING_DATABASE_URL');
const client=new pg.Client({connectionString:dburl,options:'-c default_transaction_read_only=on',connectionTimeoutMillis:15000});
await client.connect();
let targets;
try{
 const r=await client.query(`SELECT sample_rank,name_ko,address_ko FROM restaurant_enrichment_sample_1000
 WHERE sample_rank BETWEEN 1 AND 20 ORDER BY sample_rank`);
 targets=r.rows;
}finally{await client.end()}
if(targets.length!==20)throw Error('Expected exactly 20 sample targets');
const clean=x=>String(x||'').replace(/<[^>]*>/g,'').replace(/\s+/g,'').replace(/[()\[\]·.,-]/g,'').toLowerCase();
const district=a=>(String(a).match(/(?:종로구|중구|은평구|강남구|서초구|마포구|용산구|성북구)/)||[])[0]||'';
let matched=0,ambiguous=0,missing=0,errors=0;
for(const item of targets){
 const addressDistrict=district(item.address_ko);
 const query=[item.name_ko,addressDistrict].filter(Boolean).join(' ');
 const u=new URL('https://naverapihub.apigw.ntruss.com/search/v1/local');
 u.searchParams.set('query',query);u.searchParams.set('display','5');u.searchParams.set('sort','random');
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);
 try{
  const response=await fetch(u,{headers:{'X-NCP-APIGW-API-KEY-ID':id,'X-NCP-APIGW-API-KEY':secret},signal:ctrl.signal});
  if(!response.ok)throw Error('NAVER API HTTP '+response.status);
  const doc=await response.json();
  if(!Array.isArray(doc.items))throw Error('Invalid NAVER response');
  const candidates=doc.items.filter(x=>{
   const name=clean(x.title);
   const requested=clean(item.name_ko);
   const fullAddress=String(x.roadAddress||x.address||'');
   return (name===requested||name.includes(requested)||requested.includes(name)) &&
     (!addressDistrict||fullAddress.includes(addressDistrict));
  });
  let status='NO_EXACT_NAME_AND_DISTRICT_MATCH';
  if(candidates.length===1){matched++;status='IDENTITY_CANDIDATE_NEEDS_FULL_ADDRESS_REVIEW'}
  else if(candidates.length>1){ambiguous++;status='AMBIGUOUS_MULTIPLE_CANDIDATES'}
  else missing++;
  console.log(JSON.stringify({rank:item.sample_rank,status,candidateCount:candidates.length}));
 }catch(e){errors++;console.error('Lookup failed at sample rank '+item.sample_rank+': '+String(e.message).slice(0,100))}
 finally{clearTimeout(timer)}
}
console.log(JSON.stringify({total:targets.length,identityCandidates:matched,ambiguous,notMatched:missing,errors,apiCalls:targets.length,rawResultsPersisted:false,dbModified:false}));
if(errors)process.exitCode=1;
