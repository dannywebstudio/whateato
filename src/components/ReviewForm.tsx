'use client';
import Link from 'next/link';
import {useEffect,useMemo,useState,type ChangeEvent,type FormEvent} from 'react';
import styles from './ReviewForm.module.css';
const keys=['taste','service','tourist_friendliness','value_for_money','cleanliness'] as const;
type Key=typeof keys[number];
type Scores=Record<Key,number|null>;
type OwnPhoto={id:string;status:string};
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
  uploading:'Uploading photo',stars:'stars'},
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
  uploading:'사진 업로드 중',stars:'점'},
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
  existing:'保存済みレビュー',pending:'審査待ち',published:'公開中',rejected:'非公開',uploading:'写真アップロード中',stars:'点'},
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
  existing:'我的已存评价',pending:'待审核',published:'已公开',rejected:'未公开',uploading:'正在上传图片',stars:'分'}
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
 const [rights,setRights]=useState(false);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState('');
 const total=useMemo(()=>{
  const values=Object.values(scores).filter((v):v is number=>typeof v==='number');
  return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
 },[scores]);
 useEffect(()=>{
  if(!canWrite)return;
  let alive=true;
  void fetch('/api/restaurants/'+encodeURIComponent(restaurantId)+'/reviews?mine=1',
   {credentials:'same-origin',cache:'no-store'}).then(r=>r.ok?r.json():null).then(data=>{
    if(!alive||!data?.review)return;
    const r=data.review;
    setBody(r.body||'');setHasOwn(true);setStatus(r.moderation_status||'');
    setOwnPhotos(Array.isArray(r.photos)?r.photos:[]);
    if(r.categories)setScores({...init(),...r.categories});
    else setScores({...init(),taste:r.rating});
  }).catch(()=>{});
  return ()=>{alive=false};
 },[canWrite,restaurantId]);
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
   setMessage(t.deleted);
  }catch{setMessage(t.deleteFailed)}finally{setBusy(false)}
 }
 async function removeOwnPhoto(id:string){
  if(busy)return;setBusy(true);
  try{
   const r=await fetch('/api/restaurants/'+encodeURIComponent(restaurantId)+
    '/reviews/photos?photo_id='+encodeURIComponent(id),{method:'DELETE',credentials:'same-origin'});
   if(!r.ok)throw Error();
   setOwnPhotos(old=>old.filter(p=>p.id!==id));
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
   setOwnPhotos(old=>[...old,...nextPhotos]);setFiles(failed);
   setMessage(failed.length?t.receivedPartial:t.received);
  }catch{setMessage(t.fail)}finally{setBusy(false)}
 }
 return <section className={styles.wrap} aria-label={t.write}>
  <h3>{hasOwn?t.edit:t.write}</h3>
  {hasOwn&&<p className={styles.muted}>{t.existing} · {status==='published'?t.published:
   status==='rejected'?t.rejected:t.pending}</p>}
  <form onSubmit={submit}>
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
      rows={5} value={body} onChange={e=>setBody(e.target.value)} placeholder={t.placeholder}/>
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
    <button type="submit" className="chip" disabled={busy||scores.taste===null||
     Boolean(files.length&&!rights)}>{busy?t.sending:t.send}</button>
    {hasOwn&&<button type="button" className="chip" disabled={busy} onClick={()=>void deleteOwn()}>{t.delete}</button>}
   </div>
   {message&&<p role="status" className={styles.feedback}>{message}</p>}
  </form>
 </section>;
}
