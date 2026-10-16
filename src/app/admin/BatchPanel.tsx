'use client';
import type {ChangeEvent,Dispatch,SetStateAction} from 'react';
import type {Batch} from './modules/types';
import {post} from './modules/client';
import styles from './admin.module.css';
type Props={
 owner:boolean;busy:boolean;batches:Batch[];batchId:string;setBatchId:(value:string)=>void;
 currentBatch:any;batchTitle:string;setBatchTitle:(value:string)=>void;
 bulkFile:File|null;setBulkFile:(value:File|null)=>void;
 setNotice:(message:string)=>void;loadBatches:()=>Promise<void>;loadBatch:(id:string)=>Promise<void>;
 batchAction:(action:string)=>Promise<void>;importFile:()=>Promise<void>;setBusy:(value:boolean)=>void;inform:(error:unknown)=>void;
};
export default function BatchPanel({owner,busy,batches,batchId,setBatchId,currentBatch,batchTitle,setBatchTitle,bulkFile,setBulkFile,setNotice,loadBatches,loadBatch,batchAction,importFile,setBusy,inform}:Props){
 return (<div className={styles.split}>
     <section className={styles.panel}>
       <h2>작업 대기열</h2><div className={styles.actions}><button className={styles.button+' '+styles.secondary} onClick={()=>void loadBatches()}>새로고침</button></div>
       <div className={styles.cardList}>{batches.map(b=><button key={b.id} className={styles.pick}
         aria-pressed={batchId===b.id} onClick={()=>void loadBatch(b.id)}>
         <strong>{b.title}</strong><small>{b.state} · {b.total}건 / 적용 {b.applied} / 실패 {b.failed}</small>
         <small className={styles.code}>{b.id}</small>
       </button>)}</div>
     </section>
     <section className={styles.panel}>
       <h2>배치 검수 및 게시</h2>
       <p className={styles.note}>최대 10,000건씩 관리하고 20건씩 실행해. 실패 건은 로그에 남고 정상 건은 유지돼.</p>
       <label className={styles.field}>배치 ID
         <input value={batchId} onChange={e=>setBatchId(e.target.value)}/></label>
       <div className={styles.actions}><button className={styles.button+' '+styles.secondary} onClick={()=>void loadBatch(batchId)}>조회</button></div>
       {currentBatch&&<><div className={styles.row}>
         <strong>{currentBatch.batch.title}</strong><span className={styles.badge}>{currentBatch.batch.state}</span></div>
         <p className={styles.small}>전체 {currentBatch.batch.total} · 대기 {currentBatch.batch.pending} · 적용 {currentBatch.batch.applied} · 실패 {currentBatch.batch.failed}</p>
         <div className={styles.table}><table><thead><tr><th>ID</th><th>식당</th><th>변경</th><th>상태</th></tr></thead><tbody>
           {currentBatch.items.map((x:any)=><tr key={x.id}><td className={styles.code}>{x.id}</td>
             <td className={styles.code}>{x.restaurant_id}</td><td><details><summary>{x.kind} · 변경 내용 보기</summary>
               <pre className={styles.payloadPreview}>{JSON.stringify(x.payload,null,2)}</pre>
             </details></td><td>{x.state} {x.error_code||''}</td></tr>)}
         </tbody></table></div>
         <div className={styles.actions}>
           <button disabled={busy||currentBatch.batch.state!=='draft'} className={styles.button} onClick={()=>void batchAction('submit')}>검수 요청</button>
           <button disabled={busy||!owner||currentBatch.batch.state!=='review'} className={styles.button} onClick={()=>void batchAction('approve')}>승인</button>
           <button disabled={busy||!owner||!['approved','processing'].includes(currentBatch.batch.state)} className={styles.button} onClick={()=>void batchAction('apply')}>20건 게시 실행</button>
           <button disabled={busy||!owner||currentBatch.batch.state!=='review'} className={styles.button+' '+styles.danger} onClick={()=>void batchAction('reject')}>반려</button>
           <button disabled={busy||!['draft','review'].includes(currentBatch.batch.state)} className={styles.button+' '+styles.secondary} onClick={()=>void batchAction('cancel')}>취소</button>
         </div>
         <h3>최근 변경 기록</h3>{currentBatch.recent_audit?.map((x:any)=><p key={x.id} className={styles.small}>{x.created_at} · {x.action} {x.reason_code||''}</p>)}
       </>}
       <h3>대량 파일 등록</h3>
       <p className={styles.note}>JSON 한 줄에 한 항목인 NDJSON 파일. 먼저 초안 배치를 만들고 파일을 등록해. 최종 승인은 별도로 진행돼.</p>
       <label className={styles.field}>새 초안 이름<input value={batchTitle} onChange={e=>setBatchTitle(e.target.value)} placeholder="Bulk upload"/></label>
       <button className={styles.button+' '+styles.secondary} onClick={()=>void(async()=>{
          try{const made=await post('/api/v1/owner/bulk/batches',
            {client_key:'cms-'+crypto.randomUUID(),title:batchTitle||'Bulk import'});
            setBatchId(made.id);setNotice('빈 초안 '+made.id+' 생성 완료');await loadBatches()}
          catch(e){inform(e)}
        })()}>빈 초안 만들기</button>
       <p className={styles.small}>빈 초안은 게시할 수 없어. 검증된 항목을 추가한 뒤 검수 요청해.</p>
       <label className={styles.field}>파일 선택<input type="file" accept=".ndjson,.jsonl,application/x-ndjson" onChange={e=>setBulkFile(e.target.files?.[0]||null)}/></label>
       <button className={styles.button} disabled={!bulkFile||!batchId||busy} onClick={()=>void(async()=>{setBusy(true);try{await importFile()}catch(e){inform(e)}finally{setBusy(false)}})()}>파일을 배치에 추가</button>
     </section>
   </div>);
}
