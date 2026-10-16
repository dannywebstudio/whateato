'use client';
import {useEffect,useState} from 'react';
import RestaurantExperienceCard from '@/components/RestaurantExperienceCard';
import type {RestaurantDetailResponse} from '@/lib/restaurant-catalog';
export default function InlineBlogRestaurantCard({id,locale='ko'}:{id:string;locale?:string}){
 const [detail,setDetail]=useState<RestaurantDetailResponse|null>(null);
 const [error,setError]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  setDetail(null);setError(false);
  fetch('/api/v1/restaurants/'+encodeURIComponent(id)+'?hl='+encodeURIComponent(locale),{signal:controller.signal})
   .then(r=>{if(!r.ok)throw Error('unavailable');return r.json()})
   .then((data:RestaurantDetailResponse)=>setDetail(data))
   .catch(()=>{if(!controller.signal.aborted)setError(true)});
  return ()=>controller.abort();
 },[id,locale]);
 if(error)return <p role="status">현재 공개된 식당 정보를 확인할 수 없어.</p>;
 if(!detail)return <p aria-busy="true">음식카드 불러오는 중…</p>;
 const r=detail.restaurant;
 return <RestaurantExperienceCard name={r.name} address={r.address} description={r.short_description}
  menu={detail.menus[0]?.name} href={'/restaurant/'+id+'?hl='+encodeURIComponent(locale)}
  mapHref={'/map?restaurant='+encodeURIComponent(id)}
  locale={locale} category={r.category_code} accentColor={r.card_accent_color}
  editorialRating={r.editorial_score} restaurantId={id}
  tags={detail.tags.map(t=>t.name)} imageUrl={detail.images[0]?.image_url||null}/>;
}
