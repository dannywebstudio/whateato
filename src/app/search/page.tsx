import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
import {findRestaurants} from '@/lib/search';
export const dynamic='force-dynamic';
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string;f?:string;hl?:string}>}){
  const {q='',f=''}=await searchParams;
  const found=await findRestaurants(q,f);
  const mapParams=new URLSearchParams();
  if(q)mapParams.set('q',q);
  if(found.filters.length)mapParams.set('f',found.filters.join(','));
  return <main className="content">
    <h1>Search restaurants</h1>
    <SearchBox initial={q} initialFilters={f}/>
    {!found.ready?
      <p className="hint" role="status">Restaurant database is not connected yet. Search results will appear after the dedicated database is set up.</p>:
      <p className="hint" role="status">{found.items.length} matching restaurants shown{found.items.length===24?' (first 24 results)':''}.</p>}
    <div className="results">
      {found.items.map(r=><Link className="result" href={'/restaurant/'+encodeURIComponent(r.id)} key={r.id}>
        <strong>{r.name_ko}</strong>
        <span>{r.road_address_ko||r.lot_address_ko||'Address not available'}</span>
        <span>{[r.region_sido,r.region_sigungu].filter(Boolean).join(' ')} · {r.business_status==='active'?'영업 인허가 상태 확인':'현재 영업상태 미확인'}</span>
        <span className="result-cta">식당 정보 확인 →</span>
      </Link>)}
    </div>
    {found.ready&&found.items.length===0&&<p className="empty">No matching restaurant information. Try a different restaurant name or location.</p>}
    <Link className="simple-link" href={'/map'+(mapParams.toString()?'?'+mapParams.toString():'')}>View on Map →</Link>
  </main>;
}
