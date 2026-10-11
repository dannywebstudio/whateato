import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
import {findRestaurants} from '@/lib/search';
export const dynamic='force-dynamic';
export default async function SearchPage({searchParams}:{searchParams:Promise<{q?:string;f?:string;hl?:string}>}){
  const {q='',f=''}=await searchParams;
  const found=await findRestaurants(q);
  return <main className="content"><h1>Search restaurants</h1><SearchBox initial={q}/><p className="hint">{found.ready?'Showing verified database results':'Preview mode · restaurant database not connected yet.'}</p>
    <div className="results">{found.items.map(r=><Link className="result" href={'/restaurant/'+r.id} key={r.id}><strong>{r.name_ko}</strong><span>{r.road_address_ko||'Address not available'}</span></Link>)}</div>
    {found.items.length===0&&<p className="empty">No matching restaurant data is available yet.</p>}
    <Link className="simple-link" href={'/map?q='+encodeURIComponent(q)}>View on Map →</Link>
  </main>;
}
