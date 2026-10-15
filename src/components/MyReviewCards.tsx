'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import type {SiteLanguage} from '@/lib/visitor-country';
import styles from './MyReviewCards.module.css';

const dimensions=['taste','service','tourist_friendliness','value_for_money','cleanliness'] as const;
type ScoreKey=typeof dimensions[number];
export type Scores=Record<ScoreKey,number|null>;
export type MyReview={
 id:string;restaurant_id:string;restaurant_name:string;
 rating:number;body:string;moderation_status:string;categories:Scores|null;
 created_at:string;updated_at:string;photo_count:number;
};
const labels={
 ko:{edit:'수정',delete:'삭제',cancel:'취소',save:'수정 내용 제출',saving:'처리 중...',pending:'관리자 검수 대기',published:'게시됨',rejected:'미게시',rating:'별점',body:'리뷰 내용',visited:'작성일',photos:'사진',note:'수정한 리뷰는 즉시 공개에서 제외되고 관리자 승인 후 다시 게시돼요. 사진도 재검수됩니다.',confirm:'이 리뷰와 첨부한 사진을 삭제할까요? 삭제 시 관리자 승인이 필요하지 않으며 되돌릴 수 없습니다.',deleted:'리뷰를 삭제했어요.',saved:'수정한 리뷰가 접수됐어요. 관리자 승인 후 다시 게시됩니다.',invalid:'별점은 1~5점, 리뷰는 30~1,500자로 작성해 주세요.',failure:'요청 처리에 실패했어요. 다시 시도해 주세요.',expired:'로그인이 만료됐어요. Google로 다시 로그인해 주세요.',visit:'식당 상세보기',optional:'평가 안 함',taste:'음식·맛',service:'서비스',tourist_friendliness:'관광객 편의',value_for_money:'가격 만족도',cleanliness:'청결도',length:'글자'},
 en:{edit:'Edit',delete:'Delete',cancel:'Cancel',save:'Submit changes',saving:'Saving...',pending:'Awaiting approval',published:'Published',rejected:'Not published',rating:'Rating',body:'Your review',visited:'Written',photos:'Photos',note:'Edits are unpublished immediately and become public again only after moderator approval. Photos are reviewed again.',confirm:'Delete this review and its photos? No approval is needed, and the action cannot be undone.',deleted:'Your review was deleted.',saved:'Changes submitted. Your review will be republished after approval.',invalid:'Choose 1–5 stars and write 30–1,500 characters.',failure:'Could not complete the request. Please try again.',expired:'Your session has expired. Please sign in again with Google.',visit:'View restaurant',optional:'Not assessed',taste:'Food & taste',service:'Service',tourist_friendliness:'Tourist friendliness',value_for_money:'Value for money',cleanliness:'Cleanliness',length:'characters'},
 ja:{edit:'編集',delete:'削除',cancel:'キャンセル',save:'変更を送信',saving:'処理中...',pending:'審査待ち',published:'公開中',rejected:'非公開',rating:'評価',body:'口コミ本文',visited:'投稿日',photos:'写真',note:'編集した口コミは直ちに非公開となり、管理者の承認後に再公開されます。写真も再審査します。',confirm:'口コミと写真を削除しますか？管理者の承認は不要で、元に戻せません。',deleted:'口コミを削除しました。',saved:'変更を送信しました。承認後に再公開されます。',invalid:'評価は1〜5、本文は30〜1500文字で入力してください。',failure:'処理できませんでした。再試行してください。',expired:'ログインの期限が切れました。再ログインしてください。',visit:'店舗を見る',optional:'未評価',taste:'料理・味',service:'サービス',tourist_friendliness:'旅行者への対応',value_for_money:'コスパ',cleanliness:'清潔さ',length:'文字'},
 'zh-CN':{edit:'编辑',delete:'删除',cancel:'取消',save:'提交修改',saving:'处理中...',pending:'等待审核',published:'已发布',rejected:'未发布',rating:'评分',body:'评价内容',visited:'发布于',photos:'照片',note:'编辑后评价会立即从公开页面隐藏，仅在管理员再次批准后发布。照片也会重新审核。',confirm:'删除这条评价和照片吗？无需管理员批准且无法撤销。',deleted:'评价已删除。',saved:'修改已提交，将在审核通过后重新发布。',invalid:'请选择1–5星并填写30–1,500个字符。',failure:'操作失败，请重试。',expired:'登录已过期，请重新使用 Google 登录。',visit:'查看餐厅',optional:'未评价',taste:'食物与口味',service:'服务',tourist_friendliness:'游客友好度',value_for_money:'性价比',cleanliness:'清洁度',length:'字符'}
} as const;
function average(r:MyReview){
 if(!r.categories)return r.rating;
 const values=dimensions.map(key=>r.categories?.[key]).filter((v):v is number=>typeof v==='number');
 return values.length?values.reduce((a,b)=>a+b,0)/values.length:r.rating;
}
export default function MyReviewCards({initialReviews,locale}:{initialReviews:MyReview[];locale:SiteLanguage}){
 const [reviews,setReviews]=useState(initialReviews);
 useEffect(()=>setReviews(initialReviews),[initialReviews]);
 return <div className={styles.grid}>{reviews.map(review=>
  <ReviewCard key={review.id} review={review} locale={locale}
   onUpdated={next=>setReviews(prev=>prev.map(x=>x.id===next.id?next:x))}
   onDeleted={id=>setReviews(prev=>prev.filter(x=>x.id!==id))}/>
 )}</div>;
}
function ReviewCard({review,locale,onUpdated,onDeleted}:{
 review:MyReview;locale:SiteLanguage;
 onUpdated:(review:MyReview)=>void;onDeleted:(id:string)=>void;
}){
 const t=labels[locale],router=useRouter();
 const [editing,setEditing]=useState(false),[body,setBody]=useState(review.body);
 const [rating,setRating]=useState(review.rating),[scores,setScores]=useState<Scores|null>(review.categories);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false);
 const status=review.moderation_status==='published'?'published':review.moderation_status==='pending'?'pending':'rejected';
 const url='/api/restaurants/'+review.restaurant_id+'/reviews';
 function reset(){
  setBody(review.body);setRating(review.rating);setScores(review.categories);setMessage('');setEditing(false);
 }
 async function submit(){
  const hasScores=scores!==null;
  const averageRating=hasScores?dimensions.map(k=>scores[k]).filter((n):n is number=>typeof n==='number'):null;
  if(body.trim().length<30||body.trim().length>1500||
    (hasScores?!(typeof scores.taste==='number'&&Number.isInteger(scores.taste)&&scores.taste>=1&&scores.taste<=5):
     !(Number.isInteger(rating)&&rating>=1&&rating<=5))||
    (averageRating!==null&&averageRating.some(n=>!Number.isInteger(n)||n<1||n>5))){
   setMessage(t.invalid);setFailed(true);return;
  }
  setBusy(true);setFailed(false);setMessage('');
  try{
   const response=await fetch(url,{method:'POST',credentials:'same-origin',cache:'no-store',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({rating,body:body.trim(),...(scores?{categories:scores}:{})})});
   if(!response.ok)throw Error(response.status===401?'expired':'failed');
   onUpdated({...review,body:body.trim(),rating,categories:scores,
     moderation_status:'pending',updated_at:new Date().toISOString()});
   setEditing(false);setMessage(t.saved);router.refresh();
  }catch(e){setFailed(true);setMessage(e instanceof Error&&e.message==='expired'?t.expired:t.failure)}
  finally{setBusy(false)}
 }
 async function remove(){
  if(!window.confirm(t.confirm))return;
  setBusy(true);setFailed(false);setMessage('');
  try{
   const response=await fetch(url,{method:'DELETE',credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error(response.status===401?'expired':'failed');
   onDeleted(review.id);router.refresh();
  }catch(e){setFailed(true);setMessage(e instanceof Error&&e.message==='expired'?t.expired:t.failure)}
  finally{setBusy(false)}
 }
 const date=new Date(review.created_at);
 const dateLabel=Number.isNaN(date.getTime())?'':date.toLocaleDateString(locale==='zh-CN'?'zh-CN':locale,{year:'numeric',month:'short',day:'numeric'});
 const stars=Math.max(1,Math.min(5,Math.round(average(review))));
 return <article className={styles.card}>
  <div className={styles.cardTop}>
   <div className={styles.restaurant}><span className={styles.restaurantIcon} aria-hidden="true">⌁</span>
    <div><h3>{review.restaurant_name}</h3>
     <Link href={'/restaurant/'+review.restaurant_id+'?hl='+locale} className={styles.venueLink}>{t.visit} ↗</Link></div>
   </div>
   <span className={[styles.status,status==='published'?styles.published:status==='pending'?styles.pending:styles.rejected].join(' ')}>{t[status]}</span>
  </div>
  <div className={styles.reviewMeta}>
   <span className={styles.stars} aria-label={String(average(review).toFixed(1))+' / 5'}>{'★'.repeat(stars)}<span>{'☆'.repeat(5-stars)}</span></span>
   <strong>{average(review).toFixed(1)}</strong>
   <span className={styles.date}>{t.visited} · {dateLabel}</span>
  </div>
  {!editing?<><p className={styles.reviewBody}>{review.body}</p>
   {review.photo_count>0&&<span className={styles.photoCount}>{t.photos} · {review.photo_count}</span>}
   {message&&<p role="status" className={failed?styles.error:styles.success}>{message}</p>}
   <div className={styles.controls}>
    <button type="button" onClick={()=>{setMessage('');setEditing(true)}} disabled={busy} className={styles.editButton}>{t.edit}</button>
    <button type="button" onClick={remove} disabled={busy} className={styles.deleteButton}>{busy?t.saving:t.delete}</button>
   </div>
  </>:<div className={styles.editor}>
    {scores?<div className={styles.scoreGrid}>
      {dimensions.map(key=><label key={key}>{t[key]}
       <select disabled={busy} value={scores[key]??''} onChange={e=>setScores(prev=>prev?{...prev,[key]:e.target.value===''?null:Number(e.target.value)}:prev)}>
        {key!=='taste'&&<option value="">{t.optional}</option>}
        {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} / 5</option>)}
       </select>
      </label>)}
     </div>:<label className={styles.ratingField}>{t.rating}
       <select value={rating} disabled={busy} onChange={e=>setRating(Number(e.target.value))}>
        {[1,2,3,4,5].map(n=><option value={n} key={n}>{'★'.repeat(n)} {n} / 5</option>)}
       </select>
      </label>}
    <label className={styles.bodyField}>{t.body}
     <textarea value={body} disabled={busy} rows={5} maxLength={1500} onChange={e=>setBody(e.target.value)}/>
    </label>
    <div className={styles.characterCount}>{body.trim().length} / 1,500 {t.length}</div>
    <p className={styles.moderationNotice}>{t.note}</p>
    {message&&<p role="alert" className={styles.error}>{message}</p>}
    <div className={styles.controls}>
     <button disabled={busy} className={styles.editButton} type="button" onClick={submit}>{busy?t.saving:t.save}</button>
     <button disabled={busy} className={styles.cancelButton} type="button" onClick={reset}>{t.cancel}</button>
    </div>
   </div>}
 </article>;
}
