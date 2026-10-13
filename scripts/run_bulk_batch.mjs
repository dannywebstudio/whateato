#!/usr/bin/env node
// Explicit, sequential administrative runner. It NEVER submits/approves batches.
// Requires a reviewed batch UUID and an execution acknowledgement matching it.
import assert from 'node:assert/strict';
const [batchId]=process.argv.slice(2);
const UUID=/^[0-9a-f]{8}-[0-9a-f-]{27}$/i;
if(!batchId||!UUID.test(batchId))
 throw Error('Usage: node scripts/run_bulk_batch.mjs <approved-batch-uuid>');
const origin=process.env.WHATEATO_ADMIN_API_ORIGIN||'';
const url=new URL(origin);
if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))
 throw Error('Bulk runner requires HTTPS or localhost');
if(!/(^|\.)whateato\.com$/.test(url.hostname)&&
   url.hostname!=='whateato.onrender.com'&&
   !['localhost','127.0.0.1'].includes(url.hostname))
 throw Error('Unapproved service domain');
if(process.env.WHATEATO_BULK_EXECUTE_ACK!==batchId)
 throw Error('Set WHATEATO_BULK_EXECUTE_ACK to the reviewed batch UUID before running');
const secret=process.env.WHATEATO_BULK_ADMIN_TOKEN||'';
assert.ok(secret.length>=32,'Server-side bearer secret missing');
const headers={'Authorization':'Bearer '+secret,'Content-Type':'application/json'};
const target=new URL('/api/v1/admin/bulk/batches/'+batchId+'/actions',url);
let total=0;
for(let attempt=0;attempt<1000;attempt++){
 const response=await fetch(target,{method:'POST',headers,redirect:'error',
  body:JSON.stringify({action:'apply',confirm_batch_id:batchId})});
 const result=await response.json();
 if(!response.ok)throw Error('Bulk apply stopped HTTP '+response.status+' '+String(result.error||''));
 total+=result.chunk?.applied||0;
 console.log(JSON.stringify({iteration:attempt+1,applied:total,failed_in_chunk:result.chunk?.failed||0,
  state:result.state,remaining:result.total?.pending||0}));
 if(!result.has_more){
  if(result.state==='completed_with_errors')process.exitCode=2;
  break;
 }
 if(attempt===999)throw Error('Safety limit reached: check pending item count');
}
