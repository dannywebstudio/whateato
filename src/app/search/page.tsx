import Link from 'next/link';
import type {Metadata} from 'next';
import AnalyticsBeacon from '@/components/AnalyticsBeacon';
import SearchBoxSynced from '@/components/SearchBoxSynced';
import VerifiedRestaurantPhoto from '@/components/VerifiedRestaurantPhoto';
import {searchRestaurantCatalog,type RestaurantSearchResponse} from '@/lib/restaurant-catalog';
import {normalizeLocale,normalizeTags,normalizeText} from '@/lib/platform-v1';

export const dynamic='force-dynamic';
export const runtime='nodejs';
// Query/filter combinations should never become thin, duplicate indexed pages.
export const metadata:Metadata={robots:{index:false,follow:false},alternates:{canonical:'/search'}};
type Params={q?:string;f?:string;hl?:string;region?:string;offset?:string};
const labels={
  ko:{heading:'Search restaurants',ready:'공공 인허가 자료 기반 검색 결과 · 현재 영업 여부는 별도 확인이 필요합니다.',unavailable:'식당 데이터베이스 연결을 확인하고 있습니다.',empty:'검색 조건과 일치하는 등록 식당이 없습니다.',initial:'음식점 이름, 지역, 메뉴를 입력하거나 필터를 선택해 주세요.',intro:'식당 소개',menu:'대표 메뉴',score:'WhatEatO 독립 평가',next:'다음 결과 →',map:'지도에서 보기 →',address:'주소 정보 없음'},
  en:{heading:'Search restaurants',ready:'Search results from permit records · current opening status is not verified.',unavailable:'The restaurant database is unavailable.',empty:'No registered restaurant matches these criteria.',initial:'Enter a restaurant, location or menu, or select a filter.',intro:'About',menu:'Main menu',score:'Independent WhatEatO score',next:'Next results →',map:'View on Map →',address:'Address not available'},
  ja:{heading:'レストランを探す',ready:'営業許可記録に基づく検索結果（現在の営業状況は未確認）',unavailable:'データベースに接続できません。',empty:'条件に一致する登録店舗はありません。',initial:'店名・地域・料理名を入力するか、フィルターを選択してください。',intro:'紹介',menu:'主なメニュー',score:'WhatEatO独自評価',next:'次の結果 →',map:'地図で見る →',address:'住所情報なし'},
  'zh-CN':{heading:'搜索餐厅',ready:'根据经营许可资料提供的搜索结果（当前营业状态未核实）',unavailable:'餐厅数据库暂时不可用。',empty:'没有符合条件的登记餐厅。',initial:'输入餐厅、地区或菜品，或选择筛选条件。',intro:'简介',menu:'主要菜品',score:'WhatEatO独立评分',next:'下一页 →',map:'在地图上查看 →',address:'暂无地址'}
} as const;
function linkToSearch(q:string,f:string,hl:string,region:string,offset:number){
  const p=new URLSearchParams();
  if(q)p.set('q',q);
  if(f)p.set('f',f);
  if(region)p.set('region',region);
  p.set('hl',hl);
  if(offset)p.set('offset',String(offset));
  return '/search?'+p.toString();
}
export default async function SearchPage({searchParams}:{searchParams:Promise<Params>}){
  const params=await searchParams;
  const q=normalizeText(params.q,100);
  const region=normalizeText(params.region,60);
  const locale=normalizeLocale(params.hl);
  const filterTags=normalizeTags(params.f||'');
  const filterString=filterTags.join(',');
  const requestedOffset=Number.parseInt(params.offset||'0',10);
  const offset=Math.min(2000,Math.max(0,Number.isFinite(requestedOffset)?requestedOffset:0));
  const searched=Boolean(q||region||filterTags.length);
  let found:RestaurantSearchResponse|null=null;
  if(searched){
    try{found=await searchRestaurantCatalog({q,region,filters:filterTags,locale,limit:20,offset})}
    catch{found=null}
  }
  const t=labels[locale];
  const toMap=new URLSearchParams();
  if(q)toMap.set('q',q);
  if(filterString)toMap.set('f',filterString);
  toMap.set('hl',locale);
  return <main className="content">
    {searched&&found&&offset===0&&q?<AnalyticsBeacon eventType="search_submitted" pageType="search" searchTerm={q} resultCount={found.items.length===0?0:undefined}/>:null}
    <h1>{t.heading}</h1>
    <SearchBoxSynced initial={q} initialFilters={filterTags} initialRegion={region} initialLocale={locale}/>
    <p className="hint">{!searched?t.initial:found?t.ready:t.unavailable}</p>
    {found&&<>
      <div className="results">{found.items.map(r=>{
        const detailParams=new URLSearchParams({hl:locale});
        if(q)detailParams.set('q',q);
        if(filterString)detailParams.set('f',filterString);
        if(region)detailParams.set('region',region);
        if(offset)detailParams.set('offset',String(offset));
        const href='/restaurant/'+r.id+'?'+detailParams.toString();
        return <Link className="result" href={href} key={r.id}>
          <VerifiedRestaurantPhoto image={r.featured_image_metadata} restaurantName={r.name}/>
          <strong>{r.name}</strong>
          {r.editorial_score!==null&&<span>★ {r.editorial_score.toFixed(1)} / 5 · {t.score}</span>}
          {r.main_menu&&<span>{t.menu}: {r.main_menu}</span>}
          {r.short_description&&<span>{r.short_description}</span>}
          {r.tags.length>0&&<span>{r.tags.map(tag=>tag.label).join(' · ')}</span>}
          <span>{r.address_ko||t.address}</span>
        </Link>
      })}</div>
      {found.items.length===0&&<p className="empty">{t.empty}</p>}
      {found.has_more&&offset<2000&&
        <Link className="simple-link" href={linkToSearch(q,filterString,locale,region,offset+found.limit)}>{t.next}</Link>}
    </>}
    <Link className="simple-link" href={'/map?'+toMap.toString()}>{t.map}</Link>
  </main>;
}
