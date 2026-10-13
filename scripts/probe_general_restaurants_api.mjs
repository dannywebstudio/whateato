#!/usr/bin/env node
/**
 * Government general-restaurants API probe. Read-only and quota bounded.
 * Required: DATA_GO_KR_SERVICE_KEY (decoded key from data.go.kr)
 * Optional: API_QUERY_JSON (object matching officially confirmed Swagger request parameters).
 * Does not access or modify Neon.
 */
import {writeFileSync} from 'node:fs';
const key=process.env.DATA_GO_KR_SERVICE_KEY;
if(!key)throw Error('DATA_GO_KR_SERVICE_KEY secret is not configured');
const endpoint='https://apis.data.go.kr/1741000/general_restaurants/info';
let custom={};
try{custom=JSON.parse(process.env.API_QUERY_JSON||'{}')}catch{throw Error('API_QUERY_JSON must be a JSON object')}
if(!custom||Array.isArray(custom)||typeof custom!=='object')throw Error('Invalid API_QUERY_JSON');
for(const field of ['serviceKey','ServiceKey','service_key'])if(field in custom)throw Error('Do not supply auth in API_QUERY_JSON');
const url=new URL(endpoint);
url.searchParams.set('serviceKey',key);
for(const [k,v] of Object.entries(custom)){
 if(typeof v!=='string'&&typeof v!=='number')throw Error('Query values must be strings or numbers');
 url.searchParams.set(k,String(v));
}
const controller=new AbortController();
const timeout=setTimeout(()=>controller.abort(),25000);
let response,text;
try{response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});text=await response.text()}
finally{clearTimeout(timeout)}
if(!response.ok)throw Error('Government API HTTP error '+response.status);
if(/SERVICE_KEY|INVALID_REQUEST_PARAMETER|PERMISSION_DENIED|LIMITED_NUMBER|APPLICATION_ERROR/i.test(text.slice(0,2500)))
 throw Error('Government API returned a validation, permission or quota error (body deliberately not logged)');
let doc;try{doc=JSON.parse(text)}catch{throw Error('Government API returned non-JSON; inspect documented responseType and query parameters. No data imported')}
const summary={timestamp:new Date().toISOString(),http_status:response.status,root_keys:Object.keys(doc).slice(0,20),
 response_type:'json',response_bytes:Buffer.byteLength(text),has_error:!!(doc?.response?.header?.resultCode&&!['0','00'].includes(String(doc.response.header.resultCode)))};
if(summary.has_error){
 const code=String(doc.response.header.resultCode).replace(/[^0-9A-Za-z_-]/g,'').slice(0,40);
 console.error('Government API error code:',code,'(request rejected; no API secret exposed)');
 throw Error('Government API non-success resultCode='+code);
}
writeFileSync('general-restaurants-api-probe.json',JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary));
