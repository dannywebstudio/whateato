import Link from 'next/link';
import type {Metadata} from 'next';
import AnalyticsBeacon from '@/components/AnalyticsBeacon';
import {auth,authReady} from '@/auth';
import {getRestaurantCatalogDetail,type RestaurantDetailResponse} from '@/lib/restaurant-catalog';
import {isUuid,normalizeLocale,normalizeText,normalizeTags} from '@/lib/platform-v1';
import {getPublicReviews,getOwnReviewSummary,getLicensedReviewInsights} from '@/lib/reviews';
import ReviewForm from '@/components/ReviewForm';
import RestaurantPhotoGallery from '@/components/RestaurantPhotoGallery';
import GooglePlacesPhotoPreview from '@/components/GooglePlacesPhotoPreview';
import {notFound} from 'next/navigation';
import {groupedOpeningHours} from '@/lib/group-opening-hours';
import {currentStaff,hasPermission} from '@/lib/owner-cms-auth';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Params={
  params:Promise<{id:string}>;
  searchParams:Promise<{hl?:string;q?:string;f?:string;region?:string;offset?:string}>;
};
const hoursLabels={ko:{open:'영업중',closed:'영업종료',preparing:'영업준비중',unknown:'영업시간 미확인',hours:'영업시간'},en:{open:'Open now',closed:'Closed now',preparing:'Preparing to open',unknown:'Hours not verified',hours:'Opening hours'},ja:{open:'営業中',closed:'営業時間外',preparing:'準備中',unknown:'営業時間未確認',hours:'営業時間'},'zh-CN':{open:'营业中',closed:'休息中',preparing:'准备中',unknown:'营业时间未核实',hours:'营业时间'}} as const;
const labels={
  ko:{heading:'Restaurant details',unavailable:'음식점 DB 연결을 확인하고 있습니다.',category:'일반음식점',license:'인허가 영업 상태 (현재 영업 중이라는 의미 아님)',address:'주소',noAddress:'주소 정보 없음',description:'식당 소개',menus:'대표 메뉴',noPrice:'가격 확인 전',tags:'식당 태그',score:'WhatEatO 독립 평가',reviews:'방문후기 리뷰',reviewNote:'실제로 가입자가 작성한 후기만 표시합니다. 모든 리뷰는 게시 전 검토됩니다.',reviewCount:'승인된 리뷰',subjective:'이용자의 주관적인 평가',noReviews:'아직 승인된 리뷰가 없습니다.',write:'방문 후기 작성',external:'이용허락을 받은 외부 리뷰 참고 정보',negative:'직원 응대 관련 불만 언급',positive:'긍정 언급',directions:'Google Maps 길찾기 ↗',saveGoogle:'내 Google 지도에 저장하기 ↗',saveHelp:'Google Maps에서 식당을 확인한 뒤 저장을 눌러주세요.',mapSearch:'Google Maps에서 위치 검색 ↗',back:'← 검색 결과로'},
  en:{heading:'Restaurant details',unavailable:'The restaurant database is unavailable.',category:'Restaurant',license:'Permitted business record (not a real-time open-status guarantee)',address:'Address',noAddress:'Address unavailable',description:'About this restaurant',menus:'Main menu',noPrice:'Price not verified',tags:'Restaurant tags',score:'Independent WhatEatO score',reviews:'Visitor reviews',reviewNote:'Only approved reviews written by registered users appear.',reviewCount:'Approved reviews',subjective:'Subjective customer opinions',noReviews:'No approved reviews yet.',write:'Write a review',external:'Licensed external review insights',negative:'Service concerns',positive:'Positive service mentions',directions:'Directions in Google Maps ↗',saveGoogle:'Save to my Google Maps ↗',saveHelp:'Open the place in Google Maps and tap Save.',mapSearch:'Find on Google Maps ↗',back:'← Back to search'},
  ja:{heading:'店舗情報',unavailable:'データベースに接続できません。',category:'飲食店',license:'営業許可情報（現在営業中である保証ではありません）',address:'住所',noAddress:'住所情報なし',description:'店舗の紹介',menus:'主なメニュー',noPrice:'価格未確認',tags:'タグ',score:'WhatEatO独自評価',reviews:'来店レビュー',reviewNote:'承認済みレビューのみ表示します。',reviewCount:'承認済みレビュー',subjective:'利用者の主観的な評価',noReviews:'承認済みレビューはまだありません。',write:'レビューを投稿',external:'利用許諾済みの外部レビュー情報',negative:'接客への不満',positive:'肯定的な言及',directions:'Googleマップで経路検索 ↗',saveGoogle:'Googleマップに保存 ↗',saveHelp:'Googleマップで店舗を確認して「保存」を押してください。',mapSearch:'Googleマップで検索 ↗',back:'← 検索結果へ'},
  'zh-CN':{heading:'餐厅详情',unavailable:'餐厅数据库暂时不可用。',category:'餐厅',license:'经营许可记录（不代表当前营业）',address:'地址',noAddress:'暂无地址',description:'餐厅简介',menus:'主要菜品',noPrice:'价格未经核实',tags:'标签',score:'WhatEatO独立评分',reviews:'到店评价',reviewNote:'仅显示已审核的用户评价。',reviewCount:'已审核评价',subjective:'用户主观评价',noReviews:'暂无已审核的评价。',write:'撰写评价',external:'已授权的外部评价信息',negative:'服务投诉',positive:'正面反馈',directions:'Google 地图路线 ↗',saveGoogle:'保存到我的 Google 地图 ↗',saveHelp:'在 Google 地图中核对餐厅后点击“保存”。',mapSearch:'在 Google 地图搜索 ↗',back:'← 返回搜索'}
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
  const miniMapHref=hasTrustedCoordinate
    ?'https://www.openstreetmap.org/export/embed.html?bbox='+encodeURIComponent([r.longitude!-0.003,r.latitude!-0.002,r.longitude!+0.003,r.latitude!+0.002].join(','))+'&layer=mapnik&marker='+encodeURIComponent(r.latitude+','+r.longitude)
    :null;
  const googlePlaceQuery=(r.name_ko+' '+(r.road_address_ko||r.lot_address_ko||'')).trim();
  const googleHref=hasTrustedCoordinate
    ?'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(r.latitude+','+r.longitude)
    :'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(googlePlaceQuery);
  // A Google Maps URL opens a place; saving to the user's account must be done in Google Maps.
  // Use a venue name AND address to reduce incorrect matches. No unverified Place ID is assumed.
  const googleSaveHref='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(googlePlaceQuery);
  const session=authReady()?await auth():null;
  const staff=await currentStaff();
  const [reviews,summary,external]=await Promise.all([
    getPublicReviews(id),getOwnReviewSummary(id),getLicensedReviewInsights(id)
  ]);
  return <main className="content restaurant-detail-page">
    <AnalyticsBeacon eventType="detail_view" pageType="restaurant" restaurantId={id}/>
    {staff&&hasPermission(staff,'edit')&&<div style={{textAlign:'right',marginBlock:'0 10px'}}>
      <Link href={'/admin?restaurant='+encodeURIComponent(id)} style={{display:'inline-flex',gap:6,
        fontSize:12,fontWeight:700,color:'#166b4f',border:'1px solid #c9ded2',padding:'8px 12px',borderRadius:8}}>
        ✎ 관리자 수정
      </Link>
    </div>}
    <header className="restaurant-hero"><div className="restaurant-hero-main"><span className="eyebrow">WhatEatO · {r.category_code||t.category}</span><h1>{r.name}</h1><p className="restaurant-lede">{r.short_description}</p><div className="restaurant-facts"><span className={"status-pill "+(r.opening_hours?.state==="open"?"is-open":r.opening_hours?.state==="closed"?"is-closed":r.opening_hours?.state==="preparing"?"is-preparing":"")}>{hoursLabels[locale][r.opening_hours?.state||"unknown"]}</span>{r.opening_hours?.today_hours&&<span className="meta-chip">◷ {r.opening_hours.today_hours}</span>}{detail.tags.slice(0,3).map(tag=><span className="meta-chip" key={tag.code}>{tag.label}</span>)}{r.ratings.external&&<span className="meta-chip">★ {r.ratings.external.rating.toFixed(1)}</span>}</div></div><div className="hero-location" style={{display:'flex',flexDirection:'column',alignItems:'flex-start',gap:7}}><div>⌖ <span>{r.address||r.road_address_ko||r.lot_address_ko||t.noAddress}</span></div>{r.opening_hours?.weekly&&r.opening_hours.weekly.length>0&&<div style={{display:'flex',gap:8,alignItems:'baseline',flexWrap:'wrap'}}><strong>{hoursLabels[locale].hours}</strong><span>{groupedOpeningHours(r.opening_hours.weekly,locale).join(' · ')}</span></div>}</div></header>
    <RestaurantPhotoGallery images={detail.images} name={r.name} locale={locale}/>
    {process.env.WHATEATO_GOOGLE_PHOTO_APPROVED==='true' && detail.images.length===0 && <GooglePlacesPhotoPreview restaurantId={id} restaurantName={r.name} locale={locale}/>}

    {r.ratings.external&&<p className="hint">★ {r.ratings.external.rating.toFixed(1)} / 5 ({r.ratings.external.source==='naver'?'네이버 참조':'Google 참조'})</p>}
    {r.ratings.whateato&&<p className="hint">★ WhatEatO {r.ratings.whateato.rating.toFixed(1)} / 5 ({r.ratings.whateato.review_count})</p>}
    {detail.menus.length>0&&<>
      <h2 className="detail-section-title">{t.menus}</h2>
      <div className="menu-grid">{detail.menus.map(menu=><section className="menu-item" key={menu.id}>
        <strong>{menu.name}</strong>
        {menu.description&&<span>{menu.description}</span>}
        {menu.price_krw!==null&&<span>₩{menu.price_krw.toLocaleString('ko-KR')}</span>}
      </section>)}</div>
      <p className="hint">{locale==='ko'?'메뉴 가격은 확인 시점 기준이며 실제 매장 가격과 다를 수 있습니다.':'Menu prices are reference prices and may change.'}</p>
    </>}
    {(r.short_description||r.full_description)&&<>
      <h2 className="detail-section-title">{t.description}</h2>
      <p className="restaurant-description-text" style={{margin:'9px 0 22px',lineHeight:1.75,whiteSpace:'pre-line'}}>{r.full_description||r.short_description}</p>
    </>}
    <section className="result detail-address-panel" style={{display:'flex',flexDirection:'column',gap:14}}>
      <div style={{minWidth:0}}>
        <strong>{t.address}</strong>
        <span style={{display:'block',overflowWrap:'anywhere',marginTop:4}}>{r.road_address_ko||r.lot_address_ko||t.noAddress}</span>
      </div>
      {miniMapHref&&<iframe title={locale==='ko'?'식당 위치 미니맵':'Restaurant location mini map'} src={miniMapHref} loading="lazy" referrerPolicy="no-referrer" style={{display:'block',width:'100%',height:280,border:0,borderRadius:10}}/>}
      <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        {(hasTrustedCoordinate||r.road_address_ko||r.lot_address_ko)&&
          <a className="simple-link" href={googleHref} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,margin:0}}>
            <span aria-hidden="true">🧭</span>{hasTrustedCoordinate?t.directions:t.mapSearch}
          </a>}
        {googlePlaceQuery&&<a className="simple-link" href={googleSaveHref} target="_blank" rel="noopener noreferrer" style={{display:'inline-flex',alignItems:'center',gap:6,margin:0}}>
          <span aria-hidden="true">🔖</span>{t.saveGoogle}
        </a>}
      </div>
      {googlePlaceQuery&&<p className="hint" style={{margin:0}}>{t.saveHelp}</p>}
    </section>
    <h2>{t.reviews}</h2>
    <p className="hint">{t.reviewNote}</p>
    {summary&&<p className="hint">{t.reviewCount} {summary.reviewCount}
      <span> · {t.subjective}</span></p>}
    <div className="results">{reviews.length?reviews.map(rev=>
      <article className="result" key={rev.id}>
        <strong>★ {rev.rating} / 5</strong>
        <p>{rev.body}</p>
        <span>익명 이용자 · {new Date(rev.created_at).toLocaleDateString('ko-KR')}</span>
      </article>):<div className="empty">{t.noReviews}</div>}</div>
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
