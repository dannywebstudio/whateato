'use client';
import {useState} from 'react';
export default function StorageProbe(){
 const [busy,setBusy]=useState(false);
 const [result,setResult]=useState<Record<string,unknown>|null>(null);
 async function run(){
  setBusy(true);setResult(null);
  try{
   const response=await fetch('/api/v1/owner/storage-probe',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:'{}',cache:'no-store'});
   const data=await response.json();
   setResult(data);
  }catch{setResult({error:'diagnostic_request_failed'})}
  finally{setBusy(false)}
 }
 return <section style={{padding:'14px 16px',margin:'12px 0',border:'1px solid #c8dccd',borderRadius:12,background:'#f8fbf8'}}>
  <strong>Hostinger 사진 저장 공간 진단 (관리자 전용)</strong>
  <p style={{fontSize:12}}>WHATEATO_MEDIA_DIR로 지정한 경로에 작은 테스트 파일을 생성하고 다시 읽어. 재배포한 뒤 다시 실행하면 파일 유지 여부를 확인할 수 있어. 사진과 DB는 변경하지 않아.</p>
  <button type="button" onClick={()=>void run()} disabled={busy} style={{padding:'10px 14px',background:'#16784d',color:'white',border:0,borderRadius:8,cursor:'pointer'}}>{busy?'확인 중…':'저장소 검사 실행'}</button>
  {result&&<pre role="status" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',fontSize:12,marginTop:12}}>{JSON.stringify(result,null,2)}</pre>}
 </section>;
}
