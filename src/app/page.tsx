'use client';
import {useEffect,useState} from 'react';
import SearchBox from '@/components/SearchBox';
const copy={ko:'한국에서 다음 맛집을 찾아보세요.',en:'Find your next favorite place to eat in Korea.',ja:'韓国でお気に入りのお店を見つけましょう。','zh-CN':'探索韩国的下一家心仪餐厅。'} as const;
type Locale=keyof typeof copy;
export default function Home(){
  const [locale,setLocale]=useState<Locale>('en');
  useEffect(()=>{
    const sync=()=>{const value=localStorage.getItem('we_resolved_language')||'en';setLocale(value in copy?value as Locale:'en')};
    sync();window.addEventListener('we_preferences',sync);
    return()=>window.removeEventListener('we_preferences',sync);
  },[]);
  return <main className="home"><section className="hero"><h1>What<span>EatO</span></h1><p>{copy[locale]}</p><SearchBox/></section></main>;
}
