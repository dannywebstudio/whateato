'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState,type ChangeEvent,type FormEvent} from 'react';
import styles from './ReviewForm.module.css';
const keys=['taste','service','tourist_friendliness','value_for_money','cleanliness'] as const;
type Key=typeof keys[number];
type Scores=Record<Key,number|null>;
type OwnPhoto={id:string;status:string};
type SavedReview={
 rating:number;body:string;moderation_status:string;categories:Scores|null;photos:OwnPhoto[];
};
type EditorMode='loading'|'compose'|'summary'|'edit'|'success';
const init=():Scores=>({taste:null,service:null,tourist_friendliness:null,value_for_money:null,cleanliness:null});
const copy={
 en:{signin:'Sign in to share your visit',login:'Continue with Google →',write:'Write a visitor review',
  edit:'Edit your review',body:'What was your experience?',placeholder:'Tell travelers what you personally experienced (30–1,500 characters).',
  note:'Only reviews and photos approved by moderators become public. Avoid personal details and copied content.',
  taste:'Food & taste',service:'Service',tourist_friendliness:'Tourist friendliness',
  value_for_money:'Value for money',cleanliness:'Cleanliness',skip:'Not assessed',
  average:'Your overall rating',photos:'Food photos (up to 5)',photoNote:'JPG, PNG or WebP · up to 3 MB each. Upload only photos you took or can legally share.',
  rights:'I confirm I have the right to share these photos.',send:'Submit for review',
  sending:'Submitting…',delete:'Delete my review',removePhoto:'Remove photo',
  received:'Review saved for moderation.',receivedPartial:'Review saved, but some photos could not be uploaded. Try adding them again.',
  fail:'Could not save this review. Check your ratings, text and connection.',
  loginExpired:'Please sign in with Google again.',mustTaste:'Please rate Food & taste.',
  confirm:'Delete your review and its photos?',deleted:'Your review was removed.',deleteFailed:'Could not remove your review.',
  photoLimit:'Choose up to 5 photos in total.',tooLarge:'Each photo must be 3 MB or smaller.',
  existing:'Your saved review',pending:'Awaiting moderation',published:'Published',rejected:'Not published',
  uploading:'Uploading photo',stars:'stars',
  summaryTitle:"Your review",
  summaryHeading:"Thanks for sharing your visit",
  summaryText:"Your saved review is managed separately from the writing form.",
  successTitle:"Review submitted!",
  successBody:"Thanks for sharing a real visit. Your review is now waiting for moderator approval.",
  successPartial:"Your review was saved, but some images still need to be uploaded.",
  statusPending:"Under review",
  statusPublished:"Live on WhatEatO",
  statusRejected:"Not published",
  stageOne:"Submitted",
  stageTwo:"Moderation",
  stageThree:"Published",
  editButton:"Edit my review",
  cancelButton:"Cancel editing",
  viewButton:"View my review",
  openDetails:"Read saved review",
  ratingLabel:"Your rating",
  imageCount:"Food photos",
  uploadAgain:"Finish uploading photos",
  checking:"Checking your review…",
  submitButton:"Submit my review",
  myReviewRemoved:"Review deleted",
  returnToForm:"Write a review"},
 ko:{signin:'방문 후기를 작성하려면 로그인해 줘.',login:'Google 로그인 →',write:'방문 후기 작성',
  edit:'내 방문 후기 수정',body:'방문 경험',placeholder:'실제로 방문한 경험을 적어주세요. 30~1,500자.',
  note:'후기와 음식 사진은 관리자 승인 후 공개돼요. 개인정보와 무단 복제한 콘텐츠는 올리지 마세요.',
  taste:'맛',service:'서비스',tourist_friendliness:'외국인 편의성',
  value_for_money:'가격 만족도',cleanliness:'청결도',skip:'평가 안 함',
  average:'종합 평점',photos:'음식 사진 (최대 5장)',photoNote:'JPG·PNG·WebP · 장당 3MB 이하. 직접 찍었거나 게시 권한이 있는 사진만 올려주세요.',
  rights:'이 사진을 게시할 권리가 있음을 확인합니다.',send:'후기 제출 (검토 후 공개)',
  sending:'제출 중…',delete:'내 리뷰 삭제',removePhoto:'사진 삭제',
  received:'후기가 접수됐어요. 관리자 검수 후 공개돼요.',receivedPartial:'후기는 저장됐지만 일부 사진 업로드가 실패했어요. 사진을 다시 추가해 주세요.',
  fail:'후기를 저장하지 못했어요. 별점·글자 수·연결을 확인해 주세요.',
  loginExpired:'Google 계정으로 다시 로그인해 주세요.',mustTaste:'맛은 반드시 평가해 주세요.',
  confirm:'작성한 후기와 사진을 삭제할까요?',deleted:'후기를 삭제했어요.',deleteFailed:'후기를 삭제하지 못했어요.',
  photoLimit:'기존 사진을 포함해 최대 5장까지 선택할 수 있어요.',tooLarge:'사진 한 장은 최대 3MB야.',
  existing:'등록된 내 후기',pending:'관리자 검수 대기',published:'공개됨',rejected:'비공개',
  uploading:'사진 업로드 중',stars:'점',
  summaryTitle:"내 방문 후기",
  summaryHeading:"방문 경험을 공유해 줘서 고마워!",
  summaryText:"저장된 후기는 작성 폼과 분리해 관리할 수 있어.",
  successTitle:"방문 후기 접수 완료!",
  successBody:"소중한 후기가 정상적으로 접수됐어. 관리자 검수 후 공개될 예정이야.",
  successPartial:"후기는 저장됐지만 일부 음식 사진이 업로드되지 않았어.",
  statusPending:"관리자 검수 중",
  statusPublished:"공개 완료",
  statusRejected:"비공개",
  stageOne:"접수 완료",
  stageTwo:"관리자 검수",
  stageThree:"후기 공개",
  editButton:"내 후기 수정",
  cancelButton:"수정 취소",
  viewButton:"내 후기 확인",
  openDetails:"작성한 후기 보기",
  ratingLabel:"내 평점",
  imageCount:"음식 사진",
  uploadAgain:"사진 업로드 다시 시도",
  checking:"내 후기 확인 중…",
  submitButton:"후기 작성 완료",
  myReviewRemoved:"후기 삭제 완료",
  returnToForm:"다시 작성하기"},
 ja:{signin:'レビューを書くにはログインしてください。',login:'Googleでログイン →',write:'来店レビューを投稿',
  edit:'レビューを編集',body:'来店時の体験',placeholder:'実際に訪れた体験を記入してください（30〜1,500文字）。',
  note:'レビューと写真は審査後に公開されます。個人情報や無断転載は避けてください。',
  taste:'味',service:'サービス',tourist_friendliness:'旅行者への対応',
  value_for_money:'価格の満足度',cleanliness:'清潔さ',skip:'評価できない',
  average:'総合評価',photos:'料理の写真（最大5枚）',photoNote:'JPG・PNG・WebP、1枚3MB以内。公開権限のある写真のみ。',
  rights:'写真を公開する権利があることを確認します。',send:'審査へ送信',
  sending:'送信中…',delete:'レビューを削除',removePhoto:'写真を削除',
  received:'レビューを受け付けました。審査後に公開されます。',receivedPartial:'レビューは保存されましたが、一部の写真はアップロードできませんでした。',
  fail:'送信できませんでした。入力内容をご確認ください。',
  loginExpired:'再度Googleでログインしてください。',mustTaste:'味を評価してください。',
  confirm:'レビューと写真を削除しますか？',deleted:'レビューを削除しました。',deleteFailed:'削除に失敗しました。',
  photoLimit:'写真は合計5枚までです。',tooLarge:'写真1枚は3MB以内です。',
  existing:'保存済みレビュー',pending:'審査待ち',published:'公開中',rejected:'非公開',uploading:'写真アップロード中',stars:'点',
  summaryTitle:"マイレビュー",
  summaryHeading:"ご投稿ありがとうございます",
  summaryText:"保存済みのレビューは編集フォームとは別に管理されます。",
  successTitle:"レビューを受け付けました！",
  successBody:"投稿ありがとうございます。管理者の審査後に公開されます。",
  successPartial:"レビューは保存されましたが、写真の一部は未アップロードです。",
  statusPending:"審査中",
  statusPublished:"公開中",
  statusRejected:"非公開",
  stageOne:"受付済み",
  stageTwo:"審査",
  stageThree:"公開",
  editButton:"レビューを編集",
  cancelButton:"編集をキャンセル",
  viewButton:"自分のレビューを確認",
  openDetails:"保存済みレビューを読む",
  ratingLabel:"評価",
  imageCount:"料理の写真",
  uploadAgain:"写真のアップロードを再試行",
  checking:"レビューを確認しています…",
  submitButton:"レビューを送信",
  myReviewRemoved:"レビューを削除しました",
  returnToForm:"レビューを投稿する"},
 'zh-CN':{signin:'登录后可分享用餐体验。',login:'使用 Google 登录 →',write:'撰写到店评价',
  edit:'编辑我的评价',body:'您的到店体验',placeholder:'请描述真实体验（30至1,500字）。',
  note:'评价及照片均须审核后公开。请勿上传个人信息或未经授权的内容。',
  taste:'口味',service:'服务',tourist_friendliness:'游客友好程度',
  value_for_money:'性价比',cleanliness:'卫生',skip:'无法评价',
  average:'综合评分',photos:'菜品照片（最多5张）',photoNote:'JPG、PNG、WebP，每张不超过3MB。仅上传有权分享的照片。',
  rights:'我确认拥有这些照片的发布权。',send:'提交审核',
  sending:'提交中…',delete:'删除我的评价',removePhoto:'删除照片',
  received:'评价已提交，审核后公开。',receivedPartial:'评价已保存，但部分图片上传失败。',
  fail:'保存失败，请检查评分及文字内容。',
  loginExpired:'请重新使用 Google 登录。',mustTaste:'请评价口味。',
  confirm:'确定删除评价和图片？',deleted:'评价已删除。',deleteFailed:'删除失败。',
  photoLimit:'最多选择5张图片。',tooLarge:'每张图片不得超过3MB。',
  existing:'我的已存评价',pending:'待审核',published:'已公开',rejected:'未公开',uploading:'正在上传图片',stars:'分',
  summaryTitle:"我的评价",
  summaryHeading:"感谢分享用餐体验",
  summaryText:"已保存的评价与编辑表单分开管理。",
  successTitle:"评价提交成功！",
  successBody:"感谢分享真实体验。管理员审核后会公开评价。",
  successPartial:"评价已保存，但部分图片仍需上传。",
  statusPending:"审核中",
  statusPublished:"已公开",
  statusRejected:"未公开",
  stageOne:"已提交",
  stageTwo:"审核中",
  stageThree:"公开",
  editButton:"编辑我的评价",
  cancelButton:"取消编辑",
  viewButton:"查看我的评价",
  openDetails:"阅读已保存的评价",
  ratingLabel:"评分",
  imageCount:"菜品照片",
  uploadAgain:"重试上传照片",
  checking:"正在检查已保存的评价…",
  submitButton:"提交评价",
  myReviewRemoved:"评价已删除",
  returnToForm:"撰写评价"}
} as const;
type Locale=keyof typeof copy;
export default function ReviewForm({restaurantId,canWrite,locale='en'}:{
 restaurantId:string;canWrite:boolean;locale?:string
}){
 const t=copy[(locale in copy?locale:'en') as Locale];
 const [scores,setScores]=useState<Scores>(init);
 const [body,setBody]=useState('');
 const [files,setFiles]=useState<File[]>([]);
 const [ownPhotos,setOwnPhotos]=useState<OwnPhoto[]>([]);
 const [hasOwn,setHasOwn]=useState(false);
 const [status,setStatus]=useState('');
 const [savedReview,setSavedReview]=useState<SavedReview|null>(null);
 const [mode,setMode]=useState<EditorMode>('loading');
 const [submittedRating,setSubmittedRating]=useState<number|null>(null);
 const [somePhotosFailed,setSomePhotosFailed]=useState(false);
 const [rights,setRights]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const total=useMemo(()=>{
  const values=Object.values(scores).filter((v):v is number=>typeof v==='number');
  return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
 },[scores]);
 useEffect(()=>{
  if(!canWrite)return;
  let active=true;
  setMode('loading');
  setBody('');setScores(init());setFiles([]);setOwnPhotos([]);
  setSavedReview(null);setStatus('');setHasOwn(false);
  void fetch('/api/restaurants/'+encodeURIComponent(restaurantId)+'/reviews?mine=1',
   {credentials:'same-origin',cache:'no-store'})
   .then(async response=>{
     if(!response.ok)throw Error('review_load_unavailable');
     return response.json();
   }).then(data=>{
     if(!active)return;
     if(data?.review){
       const review=data.review as SavedReview;
       // Keep the persisted review separate; only fill editor on explicit Edit.
       setSavedReview(review);setHasOwn(true);
       setStatus(review.moderation_status||'');
       setMode('summary');
     }else setMode('compose');
   }).catch(()=>{if(active){setMode('compose');}});
  return ()=>{active=false};
 },[canWrite,restaurantId]);
 const beginEdit=()=>{
   if(!savedReview)return;
   setBody(savedReview.body);
   setScores(savedReview.categories?{...init(),...savedReview.categories}:
      {...init(),taste:savedReview.rating});
   setOwnPhotos(savedReview.photos||[]);
   setStatus(savedReview.moderation_status);
   setMode('edit');setMessage('');
 };
 const cancelEdit=()=>{
   setScores(init());setBody('');setFiles([]);setOwnPhotos([]);setRights(false);
   setMode('summary');setMessage('');
 };
 const savedScore=()=>{
   if(!savedReview)return null;
   if(!savedReview.categories)return Number(savedReview.rating);
   const points=Object.values(savedReview.categories).filter((v):v is number=>typeof v==='number');
   return points.length?points.reduce((a,b)=>a+b,0)/points.length:null;
 };
 const statusText=()=>status==='published'?t.statusPublished:
   status==='rejected'?t.statusRejected:t.statusPending;
 if(!canWrite)return <p className="hint">{t.signin} <Link className="simple-link" href="/account">{t.login}</Link></p>;

 const onSelect=(e:ChangeEvent<HTMLInputElement>)=>{
  const selected=Array.from(e.target.files||[]);
  e.target.value='';
  if(selected.some(f=>f.size>3_000_000||!['image/png','image/jpeg','image/webp'].includes(f.type))){
   setMessage(t.tooLarge);return
  }
  if(files.length+selected.length+ownPhotos.length>5){setMessage(t.photoLimit);return}
  setFiles(old=>[...old,...selected]);setMessage('');
 };
 async function deleteOwn(){
  if(busy||!window.confirm(t.confirm))return;
  setBusy(true);setMessage('');
  try{
   const r=await fetch('/api/restaurants/'+encodeURIComponent(restaurantId)+'/reviews',{
    method:'DELETE',credentials:'same-origin'
   });
   if(!r.ok)throw Error();
   setBody('');setScores(init());setHasOwn(false);setOwnPhotos([]);setFiles([]);setStatus('');
   setSavedReview(null);setSubmittedRating(null);setSomePhotosFailed(false);
   setRights(false);setMode('compose');setMessage(t.deleted);
  }catch{setMessage(t.deleteFailed)}finally{setBusy(false)}
 }
 async function removeOwnPhoto(id:string){
  if(busy)return;setBusy(true);
  try{
   const r=await fetch('/api/restaurants/'+encodeURIComponent(restaurantId)+
    '/reviews/photos?photo_id='+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'});
   if(!r.ok)throw Error();
   setOwnPhotos(old=>old.filter(p=>p.id!==id));
   setSavedReview(old=>old?{...old,photos:old.photos.filter(p=>p.id!==id)}:null);
  }catch{setMessage(t.fail)}finally{setBusy(false)}
 }
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  if(scores.taste===null){setMessage(t.mustTaste);return}
  if(files.length&&!rights){setMessage(t.rights);return}
  setBusy(true);setMessage('');
  try{
   const root='/api/restaurants/'+encodeURIComponent(restaurantId)+'/reviews';
   const saved=await fetch(root,{method:'POST',credentials:'same-origin',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({categories:scores,body})});
   if(saved.status===401){setMessage(t.loginExpired);return}
   if(saved.status!==202){setMessage(t.fail);return}
   setHasOwn(true);setStatus('pending');
   const nextPhotos:OwnPhoto[]=[];const failed:File[]=[];
   for(const [i,file] of files.entries()){
    setMessage(t.uploading+' '+(i+1)+'/'+files.length);
    const form=new FormData();form.append('file',file);form.append('rights_confirmation','yes');
    try{
     const result=await fetch(root+'/photos',{method:'POST',credentials:'same-origin',body:form});
     if(!result.ok){failed.push(file);continue}
     const added=await result.json();
     nextPhotos.push({id:added.photo_id,status:'pending'});
    }catch{failed.push(file)}
   }
   setSavedReview({rating:Math.round(total??scores.taste!),
     body,moderation_status:'pending',categories:{...scores},
     photos:[...ownPhotos,...nextPhotos]});
   setSubmittedRating(total);setSomePhotosFailed(failed.length>0);
   setOwnPhotos([]);setFiles(failed);setRights(false);
   setBody('');setScores(init());
   setMode('success');setMessage('');
  }catch{setMessage(t.fail)}finally{setBusy(false)}
 }
 if(mode==='loading')return <section className={styles.wrap} aria-live="polite">
  <p className={styles.muted}>{t.checking}</p>
 </section>;
 if((mode==='summary'||mode==='success')&&savedReview){
   const success=mode==='success';
   const value=success?submittedRating:savedScore();
   const live=status==='published';
   return <section className={styles.wrap+' '+styles.completeWrap}
     aria-label={success?t.successTitle:t.summaryTitle}>
     <div className={styles.completeHero}>
       <div className={styles.successIcon} aria-hidden="true">
         <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
           <path d="M5 12.5l4.4 4.4L19.5 6.5"/>
         </svg>
       </div>
       <div className={styles.completeContent}>
         <span className={styles.eyebrow}>{success?t.stageOne:t.summaryTitle}</span>
         <h3>{success?t.successTitle:t.summaryHeading}</h3>
         <p>{success?(somePhotosFailed?t.successPartial:t.successBody):t.summaryText}</p>
       </div>
     </div>
     <div className={styles.summaryMetrics}>
       <div>
         <span>{t.ratingLabel}</span>
         <strong>{value===null?'—':value.toFixed(1)} <small>/ 5</small></strong>
         <div className={styles.summaryStars} aria-hidden="true">
           {[0,1,2,3,4].map(i=><span key={i}
             data-filled={value!==null&&value>=i+0.5}>★</span>)}
         </div>
       </div>
       <div>
         <span>{t.imageCount}</span>
         <strong>{savedReview.photos.length} <small>/ 5</small></strong>
         <span className={styles.reviewState}>{statusText()}</span>
       </div>
     </div>
     <ol className={styles.progressSteps} aria-label={t.statusPending}>
       {[t.stageOne,t.stageTwo,t.stageThree].map((label,i)=>
         <li key={i} data-done={i===0||live} data-current={!live&&i===1}>
           <span className={styles.progressDot}>{i===0||live?'✓':i+1}</span>
           <span>{label}</span>
         </li>)}
     </ol>
     {mode==='summary'&&<details className={styles.savedDetails}>
       <summary>{t.openDetails}</summary>
       <p>{savedReview.body}</p>
     </details>}
     <div className={styles.completeActions}>
       {success&&<button type="button" className={styles.primaryAction}
         onClick={()=>{setMode('summary');setSomePhotosFailed(false)}}>
         {t.viewButton} <span aria-hidden="true">→</span>
       </button>}
       <button type="button" className={success?styles.secondaryAction:styles.primaryAction}
         onClick={beginEdit}>{somePhotosFailed?t.uploadAgain:t.editButton}
         {!success&&<span aria-hidden="true"> →</span>}</button>
       <button type="button" className={styles.textAction}
         onClick={()=>void deleteOwn()} disabled={busy}>{t.delete}</button>
     </div>
   </section>;
 }
 return <section className={styles.wrap} aria-label={t.write}>
  <div className={styles.editorTop}>
   <h3>{mode==='edit'?t.edit:t.write}</h3>
   {mode==='edit'&&<button type="button" className={styles.textAction}
     onClick={cancelEdit} disabled={busy}>{t.cancelButton}</button>}
  </div>
  {hasOwn&&<p className={styles.muted}>{t.existing} · {status==='published'?t.published:
   status==='rejected'?t.rejected:t.pending}</p>}
  <form onSubmit={submit} autoComplete="off">
   <div className={styles.ratings}>
    {keys.map(key=><div className={styles.ratingRow} key={key}>
     <div className={styles.ratingTitle}>{t[key]}{key==='taste'&&' *'}</div>
     <div className={styles.stars} role="group" aria-label={t[key]}>
       {[1,2,3,4,5].map(n=><button key={n} type="button" aria-label={t[key]+' '+n+' '+t.stars}
         className={styles.star} aria-pressed={scores[key]===n}
         onClick={()=>setScores(s=>({...s,[key]:n}))}
         data-active={scores[key]!==null&&n<=scores[key]!}>
         ★
       </button>)}
     </div>
     {key==='taste'?<span className={styles.number}>{scores[key]??'–'}</span>:
      <button type="button" className={styles.skip} onClick={()=>setScores(s=>({...s,[key]:null}))}>
       {scores[key]===null?t.skip:(scores[key]+'/5 · ×')}
      </button>}
    </div>)}
   </div>
   <div className={styles.total}>{t.average}: <strong>{total===null?'—':total.toFixed(1)} / 5</strong></div>
   <label htmlFor={'review-body-'+restaurantId} className={styles.field}>{t.body}
    <textarea id={'review-body-'+restaurantId} required minLength={30} maxLength={1500}
      rows={5} autoComplete="off" value={body} onChange={e=>setBody(e.target.value)} placeholder={t.placeholder}/>
   </label>
   <label className={styles.field}>{t.photos}
    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onSelect}/>
   </label>
   <p className={styles.muted}>{t.photoNote}</p>
   {ownPhotos.length>0&&<div className={styles.photos}>
     {ownPhotos.map(p=><div className={styles.photo} key={p.id}>
       {/* eslint-disable-next-line @next/next/no-img-element */}
       <img src={`/api/restaurants/${encodeURIComponent(restaurantId)}/reviews/photos/${p.id}`}
         alt={t.photos} loading="lazy"/>
       <span>{p.status}</span>
       <button type="button" disabled={busy} onClick={()=>void removeOwnPhoto(p.id)}>{t.removePhoto}</button>
     </div>)}
   </div>}
   {files.length>0&&<div className={styles.photoList}>
      {files.map((f,i)=><div key={i}><span>{f.name} ({(f.size/1024/1024).toFixed(1)} MB)</span>
        <button type="button" onClick={()=>setFiles(p=>p.filter((_,n)=>n!==i))}>×</button>
      </div>)}
    </div>}
   <label className={styles.check}><input type="checkbox" checked={rights}
     onChange={e=>setRights(e.target.checked)}/> {t.rights}</label>
   <p className={styles.muted}>{t.note}</p>
   <div className={styles.actions}>
    <button type="submit" className={styles.submitAction} disabled={busy||scores.taste===null||
     Boolean(files.length&&!rights)}>
      {busy?<span className={styles.spinner} aria-hidden="true"/>:<span aria-hidden="true">✓</span>}
      {busy?t.sending:t.submitButton}
      {!busy&&<span className={styles.buttonArrow} aria-hidden="true">→</span>}
    </button>
    {hasOwn&&<button type="button" className="chip" disabled={busy} onClick={()=>void deleteOwn()}>{t.delete}</button>}
   </div>
   {message&&<p role="status" className={styles.feedback}>{message}</p>}
  </form>
 </section>;
}
