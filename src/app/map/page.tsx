import Link from 'next/link';
import SearchBoxSynced from '@/components/SearchBoxSynced';
import RestaurantMap from '@/components/RestaurantMap';
import {normalizeLocale,normalizeTags,normalizeText} from '@/lib/platform-v1';
import 'maplibre-gl/dist/maplibre-gl.css';

export const dynamic='force-dynamic';
type Params={q?:string;f?:string;hl?:string};
export const metadata={
  title:'Explore Restaurants on Map',
  robots:{index:false,follow:false},
  alternates:{canonical:'/map'}
};
export default async function MapPage({searchParams}:{
  searchParams:Promise<Params>
}){
  const raw=await searchParams;
  const q=normalizeText(raw.q,100);
  const locale=normalizeLocale(raw.hl);
  const filter=normalizeTags(raw.f||'').join(',');
  const labels={
    ko:{title:'지도로 맛집 찾기',back:'← 검색 결과로 돌아가기'},
    en:{title:'Explore on Map',back:'← Back to Search'},
    ja:{title:'地図でレストランを探す',back:'← 検索に戻る'},
    'zh-CN':{title:'在地图上找餐厅',back:'← 返回搜索'}
  } as const;
  const t=labels[locale];
  return <main className="content" style={{maxWidth:1200}}>
    <h1>{t.title}</h1>
    <SearchBoxSynced target="map" initial={q} initialFilters={filter?filter.split(','):[]} initialLocale={locale}/>
    <RestaurantMap q={q} filter={filter} locale={locale}/>
    <Link className="simple-link" href={'/search?'+new URLSearchParams({
      ...(q?{q}:{}),...(filter?{f:filter}:{}),hl:locale
    }).toString()}>{t.back}</Link>
  </main>;
}
