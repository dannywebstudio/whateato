import Link from 'next/link';
import SearchBox from '@/components/SearchBox';
export default async function MapPage({searchParams}:{searchParams:Promise<{q?:string;f?:string}>}){
 const {q='',f=''}=await searchParams;
 return <main className="content"><h1>Explore on Map</h1>
 <SearchBox target="map" initial={q} initialFilters={f}/>
 <section className="empty-map" aria-label="Map integration preview"><span>Map tiles and restaurant coordinates will appear after a licensed map provider and the dedicated WhatEatO database are connected.</span></section>
 <Link className="simple-link" href={'/search?'+new URLSearchParams({q,f}).toString()}>← View search results</Link>
 </main>;
}
