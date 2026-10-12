import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getRestaurantDetail} from '@/lib/restaurant';
export const dynamic='force-dynamic';
export default async function RestaurantDetail({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!process.env.DATABASE_URL)return <main className="content"><h1>Restaurant detail</h1><p className="hint">Preview mode · restaurant database not connected yet.</p><Link className="simple-link" href="/search">← Search</Link></main>;
  const restaurant=await getRestaurantDetail(id);
  if(!restaurant)notFound();
  const r=restaurant;
  const mapsUrl='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent([r.name_ko,r.road_address_ko||r.lot_address_ko||''].join(' '));
  return <main className="content restaurant-detail">
    <Link href="/search" className="simple-link">← Search</Link>
    <h1>{r.name_ko}</h1>
    <p className="hint">{r.region_sido} {r.region_sigungu} · {r.category_code||'음식점'}</p>
    <section className="detail-card"><h2>식당 정보</h2><p>{r.road_address_ko||r.lot_address_ko||'주소 미확인'}</p><p className="hint">영업허가 상태: {r.business_status==='active'?'정상 등록 확인':'최신 영업상태 미확인'}</p><a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="simple-link">Google 지도에서 위치 확인 ↗</a></section>
    <section className="detail-card"><h2>영업시간</h2><p><strong>{r.hours.label}</strong>{r.hours.closesAt?` · ${r.hours.closesAt} 마감 예정`:''}</p><p className="hint">{r.hours.state==='unknown'?'확인된 최신 영업시간 자료가 없습니다.':'확인된 영업시간을 기준으로 계산한 추정치로, 실제 영업 여부와 다를 수 있습니다.'}</p>{r.hours.source_url&&<p className="hint">출처: <a href={r.hours.source_url} target="_blank" rel="noopener noreferrer">확인하기 ↗</a></p>}</section>
    <section className="detail-card"><h2>WhatEatO 평가</h2>{r.ai_rating?<><p className="ai-score"><strong>★ {r.ai_rating.score.toFixed(1)} / 5</strong> <span>AI 예비평점 · 실제 고객 별점 아님</span></p><p className="hint">확인된 독립적인 음식 품질 평가를 바탕으로 한 추정 점수입니다. 신뢰도: {r.ai_rating.confidence==='high'?'높음':'보통'}</p><div className="evidence-links">{r.ai_rating.evidence_urls.map((url,i)=><a key={url} href={url} target="_blank" rel="noopener noreferrer">평가 근거 {i+1} ↗</a>)}</div></>:<p className="hint">AI 예비평점 보류 · 음식 품질을 평가할 독립적인 검증 근거가 부족합니다.</p>}</section>
  </main>;
}
