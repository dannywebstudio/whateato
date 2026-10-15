'use client';
import {useEffect,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
const filters=[
['date_night','데이트','Date night','デート','约会'],
['bar','술집','Bars','バー','酒吧'],
['lunch','점심','Lunch','ランチ','午餐'],
['dinner','저녁','Dinner','ディナー','晚餐'],
['solo_dining','혼밥','Solo dining','一人ご飯','单人用餐'],
['family_dining','가족 외식','Family','家人','家庭聚餐'],
['cafe','카페','Cafes','カフェ','咖啡馆'],
['dessert','디저트','Dessert','デザート','甜品'],
['budget_friendly','가성비','Value','お得','高性价比'],
['good_atmosphere','분위기','Atmosphere','雰囲気','氛围'],
['local_pick','현지인 추천','Local picks','地元のおすすめ','当地推荐'],
['traveler_friendly','여행자 편의','Travel friendly','旅行者向け','游客友好']
] as const;
type Locale='ko'|'en'|'ja'|'zh-CN';
const placeholder:Record<Locale,string>={ko:'지역, 음식점, 메뉴를 검색하세요',en:'Search restaurants, food, or places...',ja:'店名・地域・料理を検索...', 'zh-CN':'搜索餐厅、地区或菜品...'};
export default function SearchBox({target='search',initial=''}:{target?:'search'|'map';initial?:string}){
  const [q,setQ]=useState(initial);
  const [selected,setSelected]=useState<string[]>([]);
  const [lang,setLang]=useState<Locale>('en');
  const router=useRouter();
  useEffect(()=>{
    const sync=()=>{const v=localStorage.getItem('we_resolved_language')||'en';setLang(v==='ko'||v==='ja'||v==='zh-CN'?v:'en')};
    sync();window.addEventListener('we_preferences',sync);return()=>window.removeEventListener('we_preferences',sync);
  },[]);
  function submit(e:FormEvent){e.preventDefault();const p=new URLSearchParams();if(q.trim())p.set('q',q.trim());if(selected.length)p.set('f',selected.join(','));p.set('hl',lang);router.push('/'+target+'?'+p.toString())}
  const idx=lang==='ko'?1:lang==='ja'?3:lang==='zh-CN'?4:2;
  return <form className="search-form" onSubmit={submit} role="search">
    <div className="searchfield"><span aria-hidden="true">⌕</span><input aria-label="Restaurant search" maxLength={200} value={q} onChange={e=>setQ(e.target.value)} placeholder={placeholder[lang]} /><button aria-label="Search" type="submit">→</button></div>
    <div className="chips">{filters.map(row=><button key={row[0]} type="button" aria-pressed={selected.includes(row[0])} className={'chip '+(selected.includes(row[0])?'active':'')} onClick={()=>setSelected(s=>s.includes(row[0])?s.filter(x=>x!==row[0]):[...s,row[0]])}>{row[idx]}</button>)}</div>
  </form>;
}
