import Link from 'next/link';
import AnalyticsBeacon from '@/components/AnalyticsBeacon';
import {auth,authReady} from '@/auth';
import {getPool} from '@/lib/db';
import {validUuid,getPublicReviews,getOwnReviewSummary,getLicensedReviewInsights} from '@/lib/reviews';
import ReviewForm from '@/components/ReviewForm';
import {notFound} from 'next/navigation';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Params={params:Promise<{id:string}>};

export default async function RestaurantDetail({params}:Params){
  const {id}=await params;
  if(!validUuid(id))notFound();
  const pool=getPool();
  if(!pool)return <main className="content">
    <h1>Restaurant details</h1><p className="hint">음식점 DB 연결 준비 중입니다.</p>
    <Link className="simple-link" href="/search">← Search</Link>
  </main>;
  const found=await pool.query<{
    name_ko:string;road_address_ko:string|null;lot_address_ko:string|null;
    category_code:string|null;business_status:string;
  }>(
    "SELECT name_ko,road_address_ko,lot_address_ko,category_code,business_status "+
    "FROM restaurants WHERE id=$1 AND business_status='active' AND publication_status='published'",
    [id]
  );
  const r=found.rows[0];if(!r)notFound();
  const session=authReady()?await auth():null;
  const [reviews,summary,external]=await Promise.all([
    getPublicReviews(id),getOwnReviewSummary(id),getLicensedReviewInsights(id)
  ]);
  return <main className="content">
    <AnalyticsBeacon eventType="detail_view" pageType="restaurant" restaurantId={id}/>
    <h1>{r.name_ko}</h1>
    <p className="hint">{r.category_code||'일반음식점'} · 인허가 영업 상태 (현재 영업 중이라는 의미 아님)</p>
    <section className="result">
      <strong>주소</strong><span>{r.road_address_ko||r.lot_address_ko||'주소 정보 없음'}</span>
    </section>
    <h2>WhatEatO 이용자 리뷰</h2>
    <p className="hint">실제로 가입자가 작성한 후기만 표시합니다. 모든 리뷰는 게시 전 검토됩니다.</p>
    {summary&&<p className="hint">승인된 리뷰 {summary.reviewCount}건 · 평균 {summary.averageRating} / 5점
      <span> · 이용자의 주관적인 평가</span></p>}
    <div className="results">{reviews.length?reviews.map(rev=>
      <article className="result" key={rev.id}>
        <strong>{rev.rating} / 5점</strong>
        <p>{rev.body}</p>
        <span>익명 이용자 · {new Date(rev.created_at).toLocaleDateString('ko-KR')}</span>
      </article>):<div className="empty">아직 승인된 리뷰가 없습니다.</div>}</div>
    <h2>방문 후기 작성</h2>
    <ReviewForm restaurantId={id} canWrite={Boolean(session?.user?.id)}/>
    {external.length>0&&<>
      <h2>이용허락을 받은 외부 리뷰 참고 정보</h2>
      <div className="results">{external.map(x=><div className="result" key={x.provider}>
        <strong>{x.provider} · {x.reviewCount}건의 허가된 리뷰 신호</strong>
        <span>직원 응대 관련 불만 언급 {x.serviceConcernMentions}건 · 긍정 언급 {x.servicePraiseMentions}건</span>
        <span>{x.note}</span>
      </div>)}</div>
    </>}
    <Link className="simple-link" href="/search">← 검색 결과로</Link>
  </main>;
}
