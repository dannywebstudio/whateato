#!/usr/bin/env node
// Exact-key LOCALDATA reconciliation. DRY RUN ONLY: writes a JSON report, never modifies DB.
// Usage: node scripts/audit_localdata_closures.mjs ./localdata-current.csv ./whateato-permits.csv
// Both CSV exports must be UTF-8 and include exact original permit IDs.
// CSV A headers: 관리번호,상세영업상태명,폐업일자,소재지전체주소 (or equivalent names defined below).
// CSV B headers: sbiz_source_key,name_ko,road_address_ko (export from Neon).
import {readFileSync,writeFileSync} from 'node:fs';
function csvRows(raw) {
 const rows=[]; let row=[],cell='',quoted=false;
 for(let i=0;i<raw.length;i++){
  const c=raw[i];
  if(c==='"'){if(quoted&&raw[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw Error('Malformed CSV: unclosed quote');
 row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
 const header=rows.shift()?.map(x=>x.replace(/^\uFEFF/,'').trim())||[];
 return rows.map(fields=>Object.fromEntries(header.map((h,i)=>[h,(fields[i]||'').trim()])));
}
const pick=(r,...keys)=>keys.map(k=>r[k]).find(v=>v!==undefined&&v!=='')||'';
if(process.argv.length!==4)throw Error('Usage: node scripts/audit_localdata_closures.mjs official.csv catalog.csv');
const official=csvRows(readFileSync(process.argv[2],'utf8'));
const catalog=csvRows(readFileSync(process.argv[3],'utf8'));
const index=new Map();
for(const o of official){
 const k=pick(o,'관리번호','관리 번호','관리번호(MNG_NO)','mngNo');
 if(!k)continue;
 if(!index.has(k))index.set(k,[]);
 index.get(k).push(o);
}
const findings=[],notMatched=[];
for(const r of catalog){
 const source=pick(r,'sbiz_source_key');
 if(!source.startsWith('localdata:'))continue;
 const permit=source.slice('localdata:'.length);
 const matches=index.get(permit)||[];
 if(matches.length!==1){notMatched.push({permit,issue:matches.length?'duplicate_official_key':'official_record_missing'});continue;}
 const o=matches[0];
 const status=pick(o,'상세영업상태명','영업상태명','상세영업상태','business_status');
 const closeDate=pick(o,'폐업일자','폐업일','close_date');
 const terminationDate=pick(o,'인허가취소일자','취소일자','cancellation_date');
 const isClosed=/폐업|말소|취소|만료/.test(status);
 if(!isClosed)continue;
 findings.push({restaurant_id:pick(r,'id'),source_key:source,name:pick(r,'name_ko'),address:pick(r,'road_address_ko'),
  official_status:status,closure_date:closeDate||null,cancellation_date:terminationDate||null,
  decision:(closeDate||terminationDate)?'CANDIDATE_EXACT_KEY_AND_DATE':'REQUIRES_OFFICIAL_STATUS_DATE_RECHECK'});
}
const summary={checked_catalog:catalog.length,official_records:official.length,closure_candidates:findings.length,
 with_date:findings.filter(f=>f.decision==='CANDIDATE_EXACT_KEY_AND_DATE').length,
 unmatched_or_ambiguous:notMatched.length,findings,notMatched};
const output='localdata-closure-audit.json';writeFileSync(output,JSON.stringify(summary,null,2)+'\n');
process.stdout.write(JSON.stringify({checked_catalog:summary.checked_catalog,closure_candidates:summary.closure_candidates,
 with_date:summary.with_date,unmatched_or_ambiguous:summary.unmatched_or_ambiguous,output})+'\n');
