'use client';
import Link from 'next/link';
import {useState,type FormEvent} from 'react';
const copies={
  ko:{
    signin:'후기를 작성하려면',google:'Google 로그인 →',required:'이 필요합니다.',
    deleteConfirm:'이 식당에 직접 작성한 리뷰를 삭제하시겠어요?',deleted:'내 리뷰가 삭제됐습니다.',
    deleteFail:'삭제하지 못했습니다. 로그인 상태를 확인해 주세요.',network:'네트워크 연결을 확인해 주세요.',
    received:'리뷰가 접수됐습니다. 관리자의 확인 후 공개됩니다.',
    session:'세션이 만료됐습니다. 다시 로그인해 주세요.',
    submitFail:'리뷰를 접수하지 못했습니다. 글자 수나 로그인 상태를 확인해 주세요.',
    rating:'평가 (1~5점)',visit:'방문 후기',
    placeholder:'방문 경험을 사실에 기반해 적어주세요. 최소 30자, 최대 1,500자입니다.',
    privacy:'민감한 개인정보, 허위사실, 타 사이트 리뷰 복제는 작성하지 마세요.',
    sending:'접수 중…',submit:'후기 제출 (검토 후 공개)',remove:'내 리뷰 삭제',points:'점'
  },
  en:{
    signin:'To write a review,',google:'Sign in with Google →',required:'is required.',
    deleteConfirm:'Delete your review of this restaurant?',deleted:'Your review was deleted.',
    deleteFail:'Could not delete your review. Please check your sign-in.',network:'Please check your connection.',
    received:'Your review was received and will appear only after moderation.',
    session:'Your session expired. Please sign in again.',
    submitFail:'Could not submit your review. Check length and sign-in status.',
    rating:'Rating (1–5)',visit:'Your visit review',
    placeholder:'Describe your first-hand visit (30–1,500 characters).',
    privacy:'Avoid personal data, unsubstantiated claims and copied reviews from other sites.',
    sending:'Submitting…',submit:'Submit review (moderated)',remove:'Delete my review',points:'stars'
  },
  ja:{
    signin:'レビューを書くには',google:'Googleでログイン →',required:'が必要です。',
    deleteConfirm:'このお店のレビューを削除しますか？',deleted:'レビューを削除しました。',
    deleteFail:'削除できませんでした。ログイン状態をご確認ください。',network:'接続を確認してください。',
    received:'レビューを受け付けました。審査後に公開されます。',
    session:'セッションが切れました。再度ログインしてください。',
    submitFail:'送信できませんでした。文字数とログイン状態をご確認ください。',
    rating:'評価（1〜5点）',visit:'来店レビュー',
    placeholder:'実際の来店体験を書いてください（30〜1,500文字）。',
    privacy:'個人情報、根拠のない主張、他サイトのレビュー転載は避けてください。',
    sending:'送信中…',submit:'レビュー送信（審査後公開）',remove:'自分のレビューを削除',points:'点'
  },
  'zh-CN':{
    signin:'撰写评价需要',google:'使用 Google 登录 →',required:'。',
    deleteConfirm:'确定删除您对这家餐厅的评价吗？',deleted:'评价已删除。',
    deleteFail:'无法删除评价。请检查登录状态。',network:'请检查网络连接。',
    received:'评价已提交，审核通过后才会公开。',
    session:'会话已过期，请重新登录。',
    submitFail:'评价提交失败，请检查字数和登录状态。',
    rating:'评分（1—5分）',visit:'到访评价',
    placeholder:'请描述真实到访体验（30至1,500字）。',
    privacy:'请勿包含敏感个人信息、未经证实的事实或复制其他网站评价。',
    sending:'提交中…',submit:'提交评价（审核后公开）',remove:'删除我的评价',points:'分'
  }
} as const;
type ReviewLocale=keyof typeof copies;

export default function ReviewForm({restaurantId,canWrite,locale='ko'}:{restaurantId:string;canWrite:boolean;locale?:string}){
  const t=copies[(locale in copies?locale:'ko') as ReviewLocale];
  const [rating,setRating]=useState(5);
  const [body,setBody]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  if(!canWrite)return <p className="hint">
    {t.signin} <Link className="simple-link" href="/account">{t.google}</Link> {t.required}
  </p>;
  async function removeOwnReview(){
    if(busy)return;
    const confirmed=window.confirm(t.deleteConfirm);
    if(!confirmed)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/restaurants/'+encodeURIComponent(restaurantId)+'/reviews',{
        method:'DELETE',credentials:'same-origin'
      });
      setMessage(response.ok?t.deleted:t.deleteFail);
    }catch{setMessage(t.network)}
    finally{setBusy(false)}
  }
  async function submit(event:FormEvent){
    event.preventDefault();
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/restaurants/'+encodeURIComponent(restaurantId)+'/reviews',{
        method:'POST',headers:{'Content-Type':'application/json'},
        credentials:'same-origin',
        body:JSON.stringify({rating,body})
      });
      if(response.status===202){
        setMessage(t.received);
        setBody('');
      }else if(response.status===401){
        setMessage(t.session);
      }else{
        setMessage(t.submitFail);
      }
    }catch{
      setMessage('네트워크 연결을 확인한 후 다시 시도해 주세요.');
    }finally{setBusy(false)}
  }
  return <form className="result" onSubmit={submit}>
    <label htmlFor="review-rating">{t.rating}</label>
    <select id="review-rating" value={rating} onChange={e=>setRating(Number(e.target.value))}>
      {[5,4,3,2,1].map(n=><option key={n} value={n}>{n}{t.points}</option>)}
    </select>
    <label htmlFor="review-body">{t.visit}</label>
    <textarea id="review-body" required minLength={30} maxLength={1500} value={body}
      onChange={e=>setBody(e.target.value)} rows={5}
      placeholder={t.placeholder}/>
    <span>{t.privacy}</span>
    <button className="chip" type="submit" disabled={busy}>{busy?t.sending:t.submit}</button>
    <button className="chip" type="button" onClick={removeOwnReview} disabled={busy}>{t.remove}</button>
    {message&&<p role="status" className="hint">{message}</p>}
  </form>;
}
