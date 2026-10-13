#!/usr/bin/env node
// Read-only capability test. NEVER treats unfiltered results as evidence of a matching permit.
const key=process.env.DATA_GO_KR_SERVICE_KEY;
if(!key)throw Error('Missing DATA_GO_KR_SERVICE_KEY');
const base='https://apis.data.go.kr/1741000/general_restaurants/info';
async function query(extra){
 const url=new URL(base);
 url.searchParams.set('serviceKey',key);url.searchParams.set('pageNo','1');url.searchParams.set('numOfRows','10');
 for(const [k,v] of Object.entries(extra))url.searchParams.set(k,v);
 const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),25000);
 try{
  const r=await fetch(url,{signal:ctl.signal});
  if(!r.ok)throw Error('API HTTP '+r.status);
  const d=await r.json(),h=d?.response?.header,b=d?.response?.body;
  if(!['0','00'].includes(String(h?.resultCode)))throw Error('API result code '+String(h?.resultCode).slice(0,24));
  if(!b||!Number.isFinite(Number(b.totalCount)))throw Error('Missing totalCount');
  return {count:Number(b.totalCount),items:Array.isArray(b.items)?b.items:[]};
 }finally{clearTimeout(t)}
}
const sentinel='WHAT_EAT_O_NO_SUCH_PERMIT_0000';
const normal=await query({});
const filtered=await query({MNG_NO:sentinel});
const applied=filtered.count===0&&filtered.items.length===0;
const report={checkedAt:new Date().toISOString(),baselineTotal:normal.count,filteredTotal:filtered.count,filteredRows:filtered.items.length,filter:'MNG_NO',filterEnforced:applied,requests:2,readyForPermitByPermitLookup:applied};
console.log(JSON.stringify(report));
if(!applied)console.log('MNG_NO filtering is not verified; block individual lookups and ALL deletion.');
