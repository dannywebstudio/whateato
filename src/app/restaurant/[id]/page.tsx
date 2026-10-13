import Link from 'next/link';
import type {Metadata} from 'next';
import AnalyticsBeacon from '@/components/AnalyticsBeacon';
import {auth,authReady} from '@/auth';
import {getRestaurantCatalogDetail,type RestaurantDetailResponse} from '@/lib/restaurant-catalog';
import {isUuid,normalizeLocale,normalizeText,normalizeTags} from '@/lib/platform-v1';
import {getPublicReviews,getOwnReviewSummary,getLicensedReviewInsights} from '@/lib/reviews';
import ReviewForm from '@/components/ReviewForm';
import RestaurantPhotoGallery from '@/components/RestaurantPhotoGallery';
import {notFound} from 'next/navigation';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Params={
  params:Promise<{id:string}>;
  searchParams:Promise<{hl?:string;q?:string;f?:string;region?:string;offset?:string}>;
};
const hoursLabels={ko:{open:'영업중',closed:'영업종료',unknown:'영업시간 미확인',hours:'영업시간'},en:{open:'Open now',closed:'Closed now',unknown:'Hours not verified',hours:'Opening hours'},ja:{open:'営業中',closed:'営業時間外',unknown:'営業時間未確認',hours:'営業時間'},'zh-CN':{open:'营业中',closed:'休息中',unknown:'营业时间未核实',hours:'营业时间'}} as const;
const labels={
  ko:{heading:'Restaurant details',unavailable:'음식점 DB 연결을 확인하고 있습니다.',category:'일반음식점',license:'인허가 영업 상태 (현재 영업 중이라는 의미 아님)',address:'주소',noAddress:'주소 정보 없음',description:'식당 소개',menus:'대표 메뉴',noPrice:'가격 확인 전',tags:'식당 태그',score:'WhatEatO 독립 평가',reviews:'WhatEatO 이용자 리뷰',reviewNote:'실제로 가입자가 작성한 후기만 표시합니다. 모든 리뷰는 게시 전 검토됩니다.',reviewCount:'승인된 리뷰',subjective:'이용자의 주관적인 평가',noReviews:'아직 승인된 리뷰가 없습니다.',write:'방문 후기 작성',external:'이용허락을 받은 외부 리뷰 참고 정보',negative:'직원 응대 관련 불만 언급',positive:'긍정 언급',directions:'Google Maps 길찾기 ↗',mapSearch:'Google Maps에서 위치 검색 ↗',back:'← 검색 결과로'},
  en:{heading:'Restaurant details',unavailable:'The restaurant database is unavailable.',category:'Restaurant',license:'Permitted business record (not a real-time open-status guarantee)',address:'Address',noAddress:'Address unavailable',description:'About this restaurant',menus:'Main menu',noPrice:'Price not verified',tags:'Restaurant tags',score:'Independent WhatEatO score',reviews:'WhatEatO user reviews',reviewNote:'Only approved reviews written by registered users appear.',reviewCount:'Approved reviews',subjective:'Subjective customer opinions',noReviews:'No approved reviews yet.',write:'Write a review',external:'Licensed external review insights',negative:'Service concerns',positive:'Positive service mentions',directions:'Directions in Google Maps ↗',mapSearch:'Find on Google Maps ↗',back:'← Back to search'},
  ja:{heading:'店舗情報',unavailable:'データベースに接続できません。',category:'飲食店',license:'営業許可情報（現在営業中である保証ではありません）',address:'住所',noAddress:'住所情報なし',description:'店舗の紹介',menus:'主なメニュー',noPrice:'価格未確認',tags:'タグ',score:'WhatEatO独自評価',reviews:'WhatEatOユーザーレビュー',reviewNote:'承認済みレビューのみ表示します。',reviewCount:'承認済みレビュー',subjective:'利用者の主観的な評価',noReviews:'承認済みレビューはまだありません。',write:'レビューを投稿',external:'利用許諾済みの外部レビュー情報',negative:'接客への不満',positive:'肯定的な言及',directions:'Googleマップで経路検索 ↗',mapSearch:'Googleマップで検索 ↗',back:'← 検索結果へ'},
  'zh-CN':{heading:'餐厅详情',unavailable:'餐厅数据库暂时不可用。',category:'餐厅',license:'经营许可记录（不代表当前营业）',address:'地址',noAddress:'暂无地址',description:'餐厅简介',menus:'主要菜品',noPrice:'价格未经核实',tags:'标签',score:'WhatEatO独立评分',reviews:'WhatEatO用户评价',reviewNote:'仅显示已审核的用户评价。',reviewCount:'已审核评价',subjective:'用户主观评价',noReviews:'暂无已审核的评价。',write:'撰写评价',external:'已授权的外部评价信息',negative:'服务投诉',positive:'正面反馈',directions:'Google 地图路线 ↗',mapSearch:'在 Google 地图搜索 ↗',back:'← 返回搜索'}
} as const;

// Index only launched, active restaurants with a verified/published editorial
// description. Permit-only rows do not warrant generated SEO landing pages.
export async function generateMetadata({params,searchParams}:Params):Promise<Metadata>{
  const {id}=await params;
  const blocked:Metadata={robots:{index:false,follow:false}};
  if(!isUuid(id)||process.env.NEXT_PUBLIC_LAUNCH_READY!=='true')return blocked;
  const query=await searchParams;
  try{
    const detail=await getRestaurantCatalogDetail(id,normalizeLocale(query.hl));
    const r=detail?.restaurant;
    if(!r?.short_description||r.short_description.trim().length<35)return blocked;
    const description=r.short_description.trim().slice(0,155);
    return {
      title:r.name,
      description,
      alternates:{canonical:'/restaurant/'+id},
      robots:{index:true,follow:true},
      openGraph:{
        type:'website',title:r.name,description,url:'/restaurant/'+id,
        ...(detail?.images[0]?.url?{images:[{url:detail.images[0].url,alt:detail.images[0].alt_ko||r.name}]}:{})
      }
    };
  }catch{return blocked}
}

export default async function RestaurantDetail({params,searchParams}:Params){
  const {id}=await params;
  if(!isUuid(id))notFound();
  const query=await searchParams;
  const locale=normalizeLocale(query.hl);
  const t=labels[locale];
  const backParams=new URLSearchParams({hl:locale});
  const backQ=normalizeText(query.q,100);
  const backRegion=normalizeText(query.region,60);
  const backTags=normalizeTags(query.f||'');
  const backOffset=Number.parseInt(query.offset||'0',10);
  if(backQ)backParams.set('q',backQ);
  if(backRegion)backParams.set('region',backRegion);
  if(backTags.length)backParams.set('f',backTags.join(','));
  if(Number.isInteger(backOffset)&&backOffset>0&&backOffset<=10000)backParams.set('offset',String(backOffset));
  const backHref='/search?'+backParams.toString();
  let detail:RestaurantDetailResponse|null;
  try{detail=await getRestaurantCatalogDetail(id,locale)}
  catch{
    return <main className="content"><h1>{t.heading}</h1><p className="hint">{t.unavailable}</p>
      <Link className="simple-link" href={backHref}>{t.back}</Link></main>;
  }
  if(!detail)notFound();
  const r=detail.restaurant;
  const hasTrustedCoordinate=Number.isFinite(r.latitude)&&Number.isFinite(r.longitude)
    && r.latitude!==null && r.longitude!==null
    && r.latitude>=33 && r.latitude<=39.5 && r.longitude>=124 && r.longitude<=132;
  // Open Google's documented Maps URLs without an API key or additional API bill.
  // Registered coordinates are approximate permit positions, not verified entrances.
  // If no coordinates are available, use the restaurant's registered address.
  const googlePlaceQuery=(r.name_ko+' '+(r.road_address_ko||r.lot_address_ko||'')).trim();
  const googleHref=hasTrustedCoordinate
    ?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(r.latitude+','+r.longitude)
    :'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(googlePlaceQuery);
  const session=authReady()?await auth():null;
  const [reviews,summary,external]=await Promise.all([
    getPublicReviews(id),getOwnReviewSummary(id),getLicensedReviewInsights(id)
  ]);
  return <main className="content">
    <AnalyticsBeacon eventType="detail_view" pageType="restaurant" restaurantId={id}/>
    <h1>{r.name}</h1>
    <RestaurantPhotoGallery images={detail.images} name={r.name} locale={locale}/>
    <p className="hint">{r.category_code||t.category} · {t.license}</p>
    <p className="hint" aria-label="Restaurant opening status">{hoursLabels[locale][r.opening_hours?.state||'unknown']}</p>
    <p className="hint">{locale==='ko'?'영업 상태는 등록된 영업시간 기준이며, 식당 사정에 따라 실제와 다를 수 있습니다.':locale==='en'?'Hours-based status may differ from actual operations.':locale==='ja'?'営業状況は登録された営業時間に基づき、実際と異なる場合があります。':'营业状态按登记营业时间计算，实际情况可能有所不同。'}</p>
    {r.opening_hours&&r.opening_hours.weekly.length>0&&<section className="result"><strong>{hoursLabels[locale].hours}</strong>
      {r.opening_hours.weekly.map((slot,i)=><span key={i}>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][slot.weekday]} {slot.start}–{slot.end}</span>)}
    </section>}
    {r.editorial_score!==null&&<p className="hint">★ {r.editorial_score.toFixed(1)} / 5 · {t.score}</p>}
    {(r.short_description||r.full_description)&&<>
      <h2>{t.description}</h2>
      <section className="result"><span>{r.full_description||r.short_description}</span></section>
    </>}
    <section className="result">
      <strong>{t.address}</strong><span>{r.road_address_ko||r.lot_address_ko||t.noAddress}</span>
      {(hasTrustedCoordinate||r.road_address_ko||r.lot_address_ko)&&
        <a className="simple-link" href={googleHref} target="_blank" rel="noopener noreferrer">
          {hasTrustedCoordinate?t.directions:t.mapSearch}
        </a>}
    </section>
    {detail.tags.length>0&&<>
      <h2>{t.tags}</h2>
      <section className="result"><span>{detail.tags.map(tag=>tag.label).join(' · ')}</span></section>
    </>}
    {detail.menus.length>0&&<>
      <h2>{t.menus}</h2>
      <div className="results">{detail.menus.map(menu=><section className="result" key={menu.id}>
        <strong>{menu.name}</strong>
        {menu.description&&<span>{menu.description}</span>}
        {menu.price_krw!==null&&<span>₩{menu.price_krw.toLocaleString('ko-KR')}</span>}
      </section>)}</div>
    </>}
    <h2>{t.reviews}</h2>
    <p className="hint">{t.reviewNote}</p>
    {summary&&<p className="hint">{t.reviewCount} {summary.reviewCount} · ★ {summary.averageRating} / 5
      <span> · {t.subjective}</span></p>}
    <div className="results">{reviews.length?reviews.map(rev=>
      <article className="result" key={rev.id}>
        <strong>★ {rev.rating} / 5</strong>
        <p>{rev.body}</p>
        <span>익명 이용자 · {new Date(rev.created_at).toLocaleDateString('ko-KR')}</span>
      </article>):<div className="empty">{t.noReviews}</div>}</div>
    <h2>{t.write}</h2>
    <ReviewForm restaurantId={id} canWrite={Boolean(session?.user?.id)} locale={locale}/>
    {external.length>0&&<>
      <h2>{t.external}</h2>
      <div className="results">{external.map(x=><div className="result" key={x.provider}>
        <strong>{x.provider} · {x.reviewCount}</strong>
        <span>{t.negative} {x.serviceConcernMentions} · {t.positive} {x.servicePraiseMentions}</span>
        <span>{x.note}</span>
      </div>)}</div>
    </>}
    <Link className="simple-link" href={backHref}>{t.back}</Link>
  </main>;
}
