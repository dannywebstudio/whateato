#!/usr/bin/env node
// Read-only official API pagination check and exact-permit matching.
// Never changes any database. Fail closed if pagination is ignored.
import {readFileSync,writeFileSync} from 'node:fs';
const key=process.env.DATA_GO_KR_SERVICE_KEY;
if(!key)throw Error('DATA_GO_KR_SERVICE_KEY is missing');
const pageSize=Number(process.env.PAGE_SIZE||100);
const maxPages=Number(process.env.MAX_PAGES||3);
if(!Number.isInteger(pageSize)||pageSize<1||pageSize>1000)throw Error('PAGE_SIZE must be 1..1000');
if(!Number.isInteger(maxPages)||maxPages<1||maxPages>10)throw Error('MAX_PAGES must be 1..10');
const csvPath=process.env.CATALOG_CSV_PATH;
const targets=new Set();
if(csvPath){
 const raw=readFileSync(csvPath,'utf8');
 const lines=raw.replace(/^\uFEFF/,'').split(/\r?\n/).filter(Boolean);
 const header=lines.shift()?.split(',').map(s=>s.trim())||[];
 const sourceIdx=header.indexOf('sbiz_source_key');
 if(sourceIdx<0)throw Error('Catalog CSV requires sbiz_source_key column');
 // Limit catalog format to exported one-column CSV; no names or personal data.
 if(header.length!==1)throw Error('Use a one-column sbiz_source_key CSV export');
 for(const l of lines){const id=l.trim().replace(/^"|"$/g,'').replace(/^localdata:/,'');if(id)targets.add(id)}
 if(targets.size>20000)throw Error('Too many target permit IDs');
}
async function page(n){
 const url=new URL('https://apis.data.go.kr/1741000/general_restaurants/info');
 url.searchParams.set('serviceKey',key);
 url.searchParams.set('pageNo',String(n));
 url.searchParams.set('numOfRows',String(pageSize));
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),30000);
 try{
 const res=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});
 if(!res.ok)throw Error('Government API HTTP '+res.status);
 const doc=await res.json();
 const hdr=doc?.response?.header,body=doc?.response?.body;
 if(!['0','00'].includes(String(hdr?.resultCode)))throw Error('Government API failed, code '+String(hdr?.resultCode).slice(0,25));
 if(!body||!Array.isArray(body.items))throw Error('Unexpected response items structure');
 if(Number(body.pageNo)!==n||Number(body.numOfRows)!==pageSize)throw Error('Pagination parameters ignored or not accepted');
 if(body.items.length>pageSize)throw Error('API returned more items than requested');
 if(!Number.isFinite(Number(body.totalCount)))throw Error('Missing totalCount');
 return body;
 }finally{clearTimeout(timer)}
}
const first=await page(1);
const total=Number(first.totalCount),seen=new Set(),matched=[],matchesByPage=[];
function digest(items,n){
 let count=0;
 for(const item of items){
  const id=String(item.MNG_NO||'').trim();
  if(!id)continue;
  if(seen.has(id))throw Error('Duplicate permit across scanned pages: pagination may be unstable');
  seen.add(id);
  if(!targets.has(id))continue;
  count++;
  const status=String(item.DTL_SALS_STTS_NM||item.SALS_STTS_NM||'').trim();
  const closedAt=String(item.CLSBIZ_YMD||'').trim();
  // Candidates only. Never instruct automatic deletion.
  matched.push({permit:id,status,closedAt,review:'MANUAL_OFFICIAL_VERIFICATION_REQUIRED'});
 }
 matchesByPage.push({page:n,rows:items.length,targetMatches:count});
}
digest(first.items,1);
const checkedPages=Math.min(maxPages,Math.max(1,Math.ceil(total/pageSize)));
for(let n=2;n<=checkedPages;n++){
 const p=await page(n);
 if(Number(p.totalCount)!==total)throw Error('Total count changed during scan; restart later');
 digest(p.items,n);
}
const report={checkedAt:new Date().toISOString(),totalRecordsReported:total,pageSize,pagesScanned:checkedPages,
 recordsSeen:seen.size,targetPermitCount:targets.size,targetMatches:matched.length,
 scannedWholeDataset:seen.size===total,readyForDeletion:false,matchesByPage,matched};
writeFileSync('official-restaurant-page-scan.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,matched:undefined}));
