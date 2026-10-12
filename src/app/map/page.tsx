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
  return <main className="content">
    <h1>Explore on Map</h1>
    <SearchBoxSynced target="map" initial={q} initialFilters={filter?filter.split(','):[]} initialLocale={locale}/>
    <RestaurantMap q={q} filter={filter} locale={locale}/>
    <Link className="simple-link" href={'/search?'+new URLSearchParams({
      ...(q?{q}:{}),...(filter?{f:filter}:{}),hl:locale
    }).toString()}>← Back to Search</Link>
  </main>;
}
