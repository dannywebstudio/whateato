'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import {parseFilters} from '@/lib/search-query';
const filters=[['date_night','데이트','Date night'],['bar','술집','Bars'],['lunch','점심','Lunch'],['dinner','저녁','Dinner'],['solo_dining','혼밥','Solo dining'],['family_dining','가족 외식','Family'],['cafe','카페','Cafes'],['dessert','디저트','Dessert'],['budget_friendly','가성비','Value'],['good_atmosphere','분위기','Atmosphere'],['local_pick','현지인 추천','Local picks'],['traveler_friendly','여행자 편의','Travel friendly']];
export default function SearchBox({target='search',initial='',initialFilters=''}:{target?:'search'|'map';initial?:string;initialFilters?:string}){
  const [q,setQ]=useState(initial);
  const [selected,setSelected]=useState<string[]>(()=>parseFilters(initialFilters));
  const [lang,setLang]=useState('en');
  const router=useRouter();
  useEffect(()=>{setQ(initial);setSelected(parseFilters(initialFilters))},[initial,initialFilters]);
  useEffect(()=>{
    const sync=()=>{const choice=localStorage.getItem('we_language')||'auto';setLang(choice==='auto'?(navigator.language||'en').split('-')[0]:choice)};
    sync();window.addEventListener('we_preferences',sync);return()=>window.removeEventListener('we_preferences',sync);
  },[]);
  function submit(e:FormEvent){e.preventDefault();const p=new URLSearchParams();if(q.trim())p.set('q',q.trim());if(selected.length)p.set('f',selected.join(','));const choice=localStorage.getItem('we_language')||'auto';p.set('hl',choice==='auto'?( /[가-힣]/.test(q)?'ko':lang):choice);router.push('/'+target+'?'+p.toString())}
  const isKo=lang==='ko';
  return <form className="search-form" onSubmit={submit} role="search">
    <div className="searchfield"><span aria-hidden="true">⌕</span><input aria-label="Restaurant search" maxLength={200} value={q} onChange={e=>setQ(e.target.value)} placeholder={isKo?'지역, 음식점, 메뉴를 검색하세요':'Search restaurants, food, or places...'} /><button aria-label="Search" type="submit">→</button></div>
    <div className="chips">{filters.map(([code,ko,en])=><button key={code} type="button" aria-pressed={selected.includes(code)} className={'chip '+(selected.includes(code)?'active':'')} onClick={()=>setSelected(s=>s.includes(code)?s.filter(x=>x!==code):[...s,code])}>{isKo?ko:en}</button>)}</div>
  </form>;
}
