'use client';
import {useEffect,useState} from 'react';
import RestaurantExperienceCard from '@/components/RestaurantExperienceCard';
// The Map card's compact layout rules are defined here, not in blog typography.
import '@/app/map/map.css';
type MapPlace={id:string;name:string;address:string|null;short_description:string|null;main_menu:string|null;card_accent_color:string|null;editorial_score:number|null;visitor_score:number|null;featured_image_url:string|null;category_code:string|null;opening_hours:{state:'open'|'closed'|'preparing'|'unknown';today_hours:string|null}|null;tags:{code:string;label:string}[]};
export default function InlineBlogRestaurantCard({id,locale='ko'}:{id:string;locale?:string}){
 const [detail,setDetail]=useState<MapPlace|null>(null);
 const [error,setError]=useState(false);
 useEffect(()=>{
  const controller=new AbortController();
  setDetail(null);setError(false);
  fetch('/api/v1/map/focus?id='+encodeURIComponent(id)+'&hl='+encodeURIComponent(locale),{signal:controller.signal})
   .then(r=>{if(!r.ok)throw Error('unavailable');return r.json()})
   .then((data:{focus_id:string;items:MapPlace[]})=>{if(data.focus_id!==id||data.items?.[0]?.id!==id)throw Error('not on map');setDetail(data.items[0])})
   .catch(()=>{if(!controller.signal.aborted)setError(true)});
  return ()=>controller.abort();
 },[id,locale]);
 if(error)return <p role="status">현재 공개된 식당 정보를 확인할 수 없어.</p>;
 if(!detail)return <p aria-busy="true">음식카드 불러오는 중…</p>;
 const r=detail;
 return <div className="map-explore-cards whateato-inline-map-card"><RestaurantExperienceCard name={r.name} address={r.address} description={r.short_description}
  menu={r.main_menu} href={'/restaurant/'+id+'?hl='+encodeURIComponent(locale)}
  mapHref={'/map?focus='+encodeURIComponent(id)}
  variant="map" status={r.opening_hours?.state||'unknown'} hours={r.opening_hours?.today_hours}
  locale={locale} category={r.category_code} accentColor={r.card_accent_color}
  editorialRating={r.editorial_score} visitorRating={r.visitor_score} restaurantId={id}
  tags={r.tags.map(t=>t.label)} imageUrl={r.featured_image_url||null}/></div>;
}
