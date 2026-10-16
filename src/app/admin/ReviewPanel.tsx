'use client';
import type {Dispatch,SetStateAction} from 'react';
import type {Review} from './modules/types';
import {reviewScoreLabel} from './modules/reviews';
import styles from './admin.module.css';
type Props={owner:boolean;reviews:Review[];reviewStatus:'pending'|'published'|'rejected';setReviewStatus:(value:'pending'|'published'|'rejected')=>void;reason:string;setReason:(value:string)=>void;photosInspected:Record<string,boolean>;setPhotosInspected:Dispatch<SetStateAction<Record<string,boolean>>>;deletingReviewId:string|null;loadReviews:()=>Promise<void>;reviewAction:(id:string,approve:boolean,hide?:boolean)=>Promise<void>;deleteReview:(review:Review)=>Promise<void>};
export default function ReviewPanel({owner,reviews,reviewStatus,setReviewStatus,reason,setReason,photosInspected,setPhotosInspected,deletingReviewId,loadReviews,reviewAction,deleteReview}:Props){
return (<section className={styles.panel}>
     <div className={styles.row}><h2>방문후기 관리</h2><button className={styles.button+' '+styles.secondary} onClick={()=>void loadReviews()}>새로고침</button></div>
     <label className={styles.field}>보기<select value={reviewStatus} onChange={e=>setReviewStatus(e.target.value as typeof reviewStatus)}>
       <option value="pending">승인 대기</option><option value="published">게시 중</option><option value="rejected">거절·숨김</option>
     </select></label>
     {owner&&<p className={styles.note}>‘숨김’은 공개만 중단해. ‘완전 삭제’는 본문·점수·사진을 복구할 수 없게 삭제하며, 삭제 사유와 최소 작업 이력만 남아.</p>}
     <label className={styles.field}>거절 / 삭제 사유<select value={reason} onChange={e=>setReason(e.target.value)}>
       {['spam','abusive','personal_data','off_topic','unverifiable_claim','other'].map(v=><option key={v} value={v}>{v}</option>)}
     </select></label>
     {!reviews.length&&<p className={styles.note}>대기 중인 후기가 없어.</p>}
     {reviews.map(r=><article key={r.id} className={styles.panel}>
       <div className={styles.row}><strong>{r.restaurant_name}</strong><span className={styles.badge}>★ {r.rating}</span></div>
       <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{r.body}</p>
       {r.categories&&<div className={styles.chips}>
         {Object.entries(r.categories).map(([key,score])=>
           <span key={key} className={styles.chip}>{key.replaceAll('_',' ')} · {reviewScoreLabel(score)}</span>)}
       </div>}
       {r.photos?.length>0&&<>
         <h3>첨부 음식 사진 {r.photos.length}장</h3>
         <div className={styles.reviewPhotos}>{r.photos.map(photo=>
           /* eslint-disable-next-line @next/next/no-img-element */
           <img key={photo.id} src={photo.url} loading="lazy" alt="관리자 검수용 방문자 음식사진"/>)}
         </div>
         {reviewStatus==='pending'&&<label className={styles.chip}>
           <input type="checkbox" checked={Boolean(photosInspected[r.id])}
             onChange={e=>setPhotosInspected(p=>({...p,[r.id]:e.target.checked}))}/>
           사진을 모두 직접 확인했고 공개에 동의함
         </label>}
       </>}
       <div className={styles.small}>{r.created_at} · ID: {r.id}</div>
       <div className={styles.actions}>
         {reviewStatus==='pending'&&<><button className={styles.button} onClick={()=>void reviewAction(r.id,true)}>검토 후 승인</button>
         <button className={styles.button+' '+styles.danger} onClick={()=>void reviewAction(r.id,false)}>거절</button></>}
         {reviewStatus==='published'&&<button className={styles.button+' '+styles.danger}
           onClick={()=>void reviewAction(r.id,false,true)}>게시된 후기 숨김</button>}
         {owner&&<button className={styles.button+' '+styles.danger}
           disabled={deletingReviewId!==null} onClick={()=>void deleteReview(r)}>
           {deletingReviewId===r.id?'삭제 처리 중…':'완전 삭제'}
         </button>}
       </div>
     </article>)}
   </section>);
}
