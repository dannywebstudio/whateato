'use client';
import {useEffect,useRef} from 'react';
import {normalizeLocale} from '@/lib/platform-v1';
type EventType='page_view'|'search_submitted'|'detail_view';
type PageType='home'|'search'|'restaurant'|'map'|'other';
export default function AnalyticsBeacon({eventType,pageType,restaurantId,searchTerm,resultCount}:{
  eventType:EventType;pageType:PageType;restaurantId?:string;searchTerm?:string;resultCount?:number
}){
  const sent=useRef<string|null>(null);
  useEffect(()=>{
    const key=JSON.stringify([eventType,pageType,restaurantId,searchTerm,resultCount]);
    if(sent.current===key)return;
    sent.current=key;
    let stored='';
    try{stored=localStorage.getItem('we_language')||''}catch{}
    const locale=normalizeLocale(stored&&stored!=='auto'?stored:navigator.language);
    let acquisition_channel='unknown';
    try{
      if(!document.referrer)acquisition_channel='direct';
      else{
        const host=new URL(document.referrer).hostname.toLowerCase();
        if(host===location.hostname)acquisition_channel='unknown';
        else if(/(^|\.)(google|naver|bing|daum|yahoo)\./.test(host))acquisition_channel='search';
        else if(/(^|\.)(instagram|facebook|tiktok|youtube|x|twitter)\./.test(host))acquisition_channel='social';
        else acquisition_channel='referral';
      }
    }catch{}
    void fetch('/api/v1/analytics/events',{
      method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({event_type:eventType,page_type:pageType,locale,
        restaurant_id:restaurantId,search_term:searchTerm,result_count:resultCount,
        acquisition_channel}),keepalive:true
    }).catch(()=>{});
  },[eventType,pageType,restaurantId,searchTerm,resultCount]);
  return null;
}
