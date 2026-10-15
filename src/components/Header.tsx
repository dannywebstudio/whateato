'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
type Locale='ko'|'en'|'ja'|'zh-CN';
const countries:[string,string][]=[['KR','🇰🇷 대한민국'],['JP','🇯🇵 日本'],['CN','🇨🇳 中国'],['US','🇺🇸 United States'],['GB','🇬🇧 United Kingdom'],['CA','🇨🇦 Canada'],['AU','🇦🇺 Australia'],['OTHER','🌐 Other']];
const langs:[string,string][]=[['auto','Auto'],['ko','한국어'],['en','English'],['ja','日本語'],['zh-CN','简体中文']];
const countryLocale=(country:string):Locale=>country==='KR'?'ko':country==='JP'?'ja':country==='CN'?'zh-CN':'en';
const normalize=(input:string|null):Locale=>input==='ko'||input==='ja'||input==='zh-CN'?input:'en';
export default function Header(){
  const [country,setCountry]=useState('OTHER');
  const [lang,setLang]=useState('auto');
  const pathname=usePathname();
  const params=useSearchParams();
  const router=useRouter();
  function apply(countryCode:string,languageCode:string){
    const resolved=languageCode==='auto'?countryLocale(countryCode):normalize(languageCode);
    try{localStorage.setItem('we_country',countryCode);localStorage.setItem('we_language',languageCode);localStorage.setItem('we_resolved_language',resolved);}catch{}
    document.documentElement.lang=resolved;
    window.dispatchEvent(new CustomEvent('we_preferences',{detail:{country:countryCode,language:resolved}}));
    const qs=new URLSearchParams(params.toString());
    qs.set('hl',resolved);
    router.replace(pathname+'?'+qs.toString(),{scroll:false});
    router.refresh();
  }
  useEffect(()=>{
    try{
      const savedCountry=localStorage.getItem('we_country');
      const savedLang=localStorage.getItem('we_language')||'auto';
      const region=(navigator.language.split('-')[1]||'').toUpperCase();
      const detected=countries.some(([code])=>code===region)?region:'OTHER';
      const c=savedCountry||detected;
      const l=langs.some(([code])=>code===savedLang)?savedLang:'auto';
      setCountry(c);setLang(l);
      const resolved=l==='auto'?countryLocale(c):normalize(l);
      localStorage.setItem('we_resolved_language',resolved);
      document.documentElement.lang=resolved;
      window.dispatchEvent(new CustomEvent('we_preferences',{detail:{country:c,language:resolved}}));
      if(pathname==='/'||!params.has('hl')){
        const qs=new URLSearchParams(params.toString());qs.set('hl',resolved);
        router.replace(pathname+'?'+qs.toString(),{scroll:false});
      }
    }catch{}
  // Initialize once; subsequent changes are handled by apply().
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  return <header className="topbar"><nav className="navcontent" aria-label="Primary">
    <div className="header-left"><Link href="/" className="brand-logo" aria-label="WhatEatO home"><span className="brand-word">What</span><span className="brand-accent">EatO</span></Link><div className="navlinks"><Link href={'/map?hl='+(lang==='auto'?countryLocale(country):normalize(lang))}>Map</Link><Link href={'/blog?hl='+(lang==='auto'?countryLocale(country):normalize(lang))}>Blog</Link></div></div>
    <div className="preferences"><span aria-hidden="true">🌐</span>
      <label className="sr-only" htmlFor="country">Country</label>
      <select id="country" value={country} onChange={e=>{const c=e.target.value;setCountry(c);setLang('auto');apply(c,'auto')}}>{countries.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select>
      <span className="sep">|</span>
      <label className="sr-only" htmlFor="language">Language</label>
      <select id="language" value={lang} onChange={e=>{const l=e.target.value;setLang(l);apply(country,l)}}>{langs.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select>
    </div>
  </nav></header>;
}
