'use client';
import Link from 'next/link';
import {useState,type FormEvent} from 'react';
export default function ReviewForm({restaurantId,canWrite}:{restaurantId:string;canWrite:boolean}){
  const [rating,setRating]=useState(5);
  const [body,setBody]=useState('');
  const [message,setMessage]=useState('');
  const [busy,setBusy]=useState(false);
  if(!canWrite)return <p className="hint">
    후기를 작성하려면 <Link className="simple-link" href="/account">Google 로그인 →</Link>이 필요합니다.
  </p>;
  async function removeOwnReview(){
    if(busy)return;
    const confirmed=window.confirm('이 식당에 직접 작성한 리뷰를 삭제하시겠어요?');
    if(!confirmed)return;
    setBusy(true);setMessage('');
    try{
      const response=await fetch('/api/restaurants/'+encodeURIComponent(restaurantId)+'/reviews',{
        method:'DELETE',credentials:'same-origin'
      });
      setMessage(response.ok?'내 리뷰가 삭제됐습니다.':'삭제하지 못했습니다. 로그인 상태를 확인해 주세요.');
    }catch{setMessage('네트워크 연결을 확인해 주세요.')}
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
        setMessage('리뷰가 접수됐습니다. 관리자의 확인 후 공개됩니다.');
        setBody('');
      }else if(response.status===401){
        setMessage('세션이 만료됐습니다. 다시 로그인해 주세요.');
      }else{
        setMessage('리뷰를 접수하지 못했습니다. 글자 수나 로그인 상태를 확인해 주세요.');
      }
    }catch{
      setMessage('네트워크 연결을 확인한 후 다시 시도해 주세요.');
    }finally{setBusy(false)}
  }
  return <form className="result" onSubmit={submit}>
    <label htmlFor="review-rating">평가 (1~5점)</label>
    <select id="review-rating" value={rating} onChange={e=>setRating(Number(e.target.value))}>
      {[5,4,3,2,1].map(n=><option key={n} value={n}>{n}점</option>)}
    </select>
    <label htmlFor="review-body">방문 후기</label>
    <textarea id="review-body" required minLength={30} maxLength={1500} value={body}
      onChange={e=>setBody(e.target.value)} rows={5}
      placeholder="방문 경험을 사실에 기반해 적어주세요. 최소 30자, 최대 1,500자입니다."/>
    <span>민감한 개인정보, 허위사실, 타 사이트 리뷰 복제는 작성하지 마세요.</span>
    <button className="chip" type="submit" disabled={busy}>{busy?'접수 중…':'후기 제출 (검토 후 공개)'}</button>
    <button className="chip" type="button" onClick={removeOwnReview} disabled={busy}>내 리뷰 삭제</button>
    {message&&<p role="status" className="hint">{message}</p>}
  </form>;
}
