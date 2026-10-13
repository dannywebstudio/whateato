#!/usr/bin/env node
// READ ONLY: scans a bounded number of official API pages and matches exact staging permit IDs.
// Does not alter either database. Never infer closure from a missing permit in a partial scan.
import pg from 'pg';
import {writeFileSync} from 'node:fs';
const key=process.env.DATA_GO_KR_SERVICE_KEY;
const dbUrl=process.env.WHATEATO_STAGING_DATABASE_URL;
if(!key||!dbUrl)throw Error('Both DATA_GO_KR_SERVICE_KEY and WHATEATO_STAGING_DATABASE_URL secrets are required');
const size=Number(process.env.PAGE_SIZE||100),start=Number(process.env.START_PAGE||1),limit=Number(process.env.MAX_PAGES||5);
if(!Number.isInteger(size)||size<1||size>1000||!Number.isInteger(start)||start<1||!Number.isInteger(limit)||limit<1||limit>10)throw Error('Invalid page limits');
const client=new pg.Client({connectionString:dbUrl,connectionTimeoutMillis:15000,statement_timeout:30000,options:'-c default_transaction_read_only=on'});
await client.connect();
let records;
try {
 const result=await client.query(`SELECT sbiz_source_key,region_sido,region_sigungu,latitude,longitude FROM restaurants
 WHERE sbiz_source_key LIKE 'localdata:%'
 ORDER BY CASE WHEN region_sido IN ('서울특별시','서울') THEN 1
 WHEN region_sido IN ('인천광역시','인천') THEN 2
 WHEN region_sido IN ('경기도','경기') THEN 3
 WHEN region_sido IN ('부산광역시','부산') THEN 4
 WHEN region_sido IN ('경상북도','경북') AND region_sigungu LIKE '경주시%' THEN 5
 WHEN region_sido IN ('대구광역시','대구') THEN 6 ELSE 7 END,
 region_sido COLLATE "C",region_sigungu COLLATE "C",sbiz_source_key COLLATE "C"`);
 records=result.rows;
} finally {await client.end()}
if(records.length>20000)throw Error('Catalog cap exceeded');
const catalog=new Map(records.map((r,i)=>[r.sbiz_source_key.slice('localdata:'.length),{rank:i+1,region:r.region_sido,city:r.region_sigungu}]));
const matched=[],pageSummaries=[],seen=new Set();
let total=null;
for(let p=start;p<start+limit;p++){
 const url=new URL('https://apis.data.go.kr/1741000/general_restaurants/info');
 url.searchParams.set('serviceKey',key);url.searchParams.set('pageNo',String(p));url.searchParams.set('numOfRows',String(size));
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),30000);
 let resp,doc;
 try{resp=await fetch(url,{signal:ctrl.signal,headers:{Accept:'application/json'}});if(!resp.ok)throw Error('API HTTP '+resp.status);doc=await resp.json()}finally{clearTimeout(timer)}
 const header=doc?.response?.header,body=doc?.response?.body;
 if(!['0','00'].includes(String(header?.resultCode)))throw Error('API resultCode='+String(header?.resultCode).slice(0,24));
 const items=Array.isArray(body?.items)?body.items:Array.isArray(body?.items?.item)?body.items.item:body?.items?.item&&typeof body.items.item==='object'?[body.items.item]:null;
 if(!items||Number(body.pageNo)!==p||Number(body.numOfRows)!==size||items.length>size){
  console.error('Pagination diagnostic:',JSON.stringify({pageRequested:p,sizeRequested:size,pageReturned:body?.pageNo??null,sizeReturned:body?.numOfRows??null,itemCount:items?.length??null,itemsType:typeof body?.items,itemsKeys:Object.keys(body?.items||{}).slice(0,8)}));
  throw Error('Unreliable pagination at page '+p);
 }
 if(total===null)total=Number(body.totalCount);
 if(!Number.isSafeInteger(total)||Number(body.totalCount)!==total)throw Error('Dataset count drift');
 if(p>Math.ceil(total/size))break;
 let hits=0;
 for(const item of items){
  const permit=String(item.MNG_NO||'').trim();
  if(!permit)continue;
  if(seen.has(permit))throw Error('Duplicate permit encountered across pages; halt');
  seen.add(permit);
  const target=catalog.get(permit);
  if(!target)continue;
  hits++;
  const status=String(item.DTL_SALS_STTS_NM||'').trim();
  const closureDate=String(item.CLSBIZ_YMD||'').trim();
  matched.push({permit,priority:target.rank,region:target.region,city:target.city,officialStatus:status,officialClosureDate:closureDate,
    possibleClosure:/폐업|말소|취소|만료/.test(status),reviewOnly:true});
 }
 pageSummaries.push({page:p,rows:items.length,matches:hits});
}
matched.sort((a,b)=>a.priority-b.priority);
const output={generatedAt:new Date().toISOString(),stagingRecords:records.length,regionPriority:'Seoul > Incheon > Gyeonggi (boundary proximity pending) > Busan > Gyeongju > Daegu > others',
 officialTotal:total,requestedPageSize:size,scannedPages:pageSummaries.length,startPage:start,recordsSeen:seen.size,
 exactMatches:matched.length,possibleClosures:matched.filter(x=>x.possibleClosure).length,completeScan:false,
 deletionAllowed:false,warning:'Partial API scan: missing permits are NOT evidence of closure. All matches require separate authoritative verification.',
 pageSummaries,matched};
writeFileSync('staging-permit-reconciliation.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify({...output,matched:undefined}));
