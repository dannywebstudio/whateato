#!/usr/bin/env node
// Incremental NDJSON loader: one validated bulk item per line, maximum 50 items per POST.
// Safe for large files without loading the entire export into RAM. Never approves/publishes.
import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
const [batchId,filePath]=process.argv.slice(2);
if(!batchId||!filePath||!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(batchId))
 throw Error('Usage: node scripts/import_bulk_ndjson.mjs <draft-batch-uuid> <file.ndjson>');
const origin=process.env.WHATEATO_ADMIN_API_ORIGIN||'';
const base=new URL(origin);
if(base.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(base.hostname))
 throw Error('HTTPS required');
if(!/(^|\.)whateato\.com$/.test(base.hostname)&&
 base.hostname!=='whateato.onrender.com'&&
 !['localhost','127.0.0.1'].includes(base.hostname))
 throw Error('Unapproved import destination');
const secret=process.env.WHATEATO_BULK_ADMIN_TOKEN||'';
if(secret.length<32)throw Error('Missing server-only bulk admin token');
if(process.env.WHATEATO_BULK_IMPORT_ACK!==batchId)
 throw Error('Set WHATEATO_BULK_IMPORT_ACK to target draft batch UUID');
const target=new URL('/api/v1/admin/bulk/batches/'+batchId+'/items',base);
const headers={Authorization:'Bearer '+secret,'Content-Type':'application/json'};
let chunk=[],total=0,line=0;
async function flush(){
 if(!chunk.length)return;
 const res=await fetch(target,{method:'POST',headers,redirect:'error',
  body:JSON.stringify({items:chunk})});
 const result=await res.json();
 if(!res.ok)throw Error('Import aborted at line '+line+': HTTP '+res.status+' '+String(result.error||''));
 total+=chunk.length;
 console.log('Staged '+total+' items (last inserted '+result.inserted+', replay '+result.idempotent+')');
 chunk=[];
}
const stream=createInterface({input:createReadStream(filePath,{encoding:'utf8'}),crlfDelay:Infinity});
for await(const s of stream){
 line++;if(!s.trim())continue;
 if(Buffer.byteLength(s,'utf8')>16384)throw Error('Oversized NDJSON item at line '+line);
 let parsed;try{parsed=JSON.parse(s)}catch{throw Error('Invalid NDJSON at line '+line)}
 chunk.push(parsed);
 if(chunk.length===50)await flush();
 if(total+chunk.length>10000)throw Error('Batch exceeds 10,000 items; split across batches');
}
await flush();
console.log('Staging complete. This command NEVER submits, approves or executes the batch.');
