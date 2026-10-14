'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';

const langs=[['ko','한국어'],['en','English'],['ja','日本語'],['zh-CN','简体中文']] as const;
const countries:[string,string][]= [
 ['KR','대한민국'],['US','United States'],['JP','日本'],['CN','中国'],
 ['TW','台灣'],['GB','United Kingdom'],['CA','Canada'],['AU','Australia'],
 ['DE','Deutschland'],['FR','France'],['RU','Россия'],['TH','Thailand'],
 ['VN','Việt Nam'],['ID','Indonesia'],['BR','Brasil'],['OTHER','Other']
];
const countryCodes=new Set(countries.map(([code])=>code));
const supportedLanguages=new Set<string>(langs.map(([code])=>code));
const countryFlagFallback:Record<string,string>={
 KR:'🇰🇷',US:'🇺🇸',JP:'🇯🇵',CN:'🇨🇳',TW:'🇹🇼',
 GB:'🇬🇧',CA:'🇨🇦',AU:'🇦🇺',DE:'🇩🇪',FR:'🇫🇷',
 RU:'🇷🇺',TH:'🇹🇭',VN:'🇻🇳',ID:'🇮🇩',BR:'🇧🇷'
};
function browserLanguage(raw:string){
 const value=raw.toLowerCase();
 if(value.startsWith('ko'))return 'ko';
 if(value.startsWith('ja'))return 'ja';
 if(value.startsWith('zh'))return 'zh-CN';
 return 'en';
}
export default function Header(){
 const [country,setCountry]=useState('KR');
 const [lang,setLang]=useState('en');
 const [flagUnavailable,setFlagUnavailable]=useState(false);
 useEffect(()=>{
  try{
   const savedCountry=localStorage.getItem('we_country');
   const savedLanguage=localStorage.getItem('we_language');
   const browserLocale=navigator.language||'en';
   const region=browserLocale.split('-')[1]?.toUpperCase();
   const nextCountry=savedCountry&&countryCodes.has(savedCountry)?savedCountry:
     region&&countryCodes.has(region)?region:'KR';
   const nextLanguage=savedLanguage&&supportedLanguages.has(savedLanguage)?
     savedLanguage:browserLanguage(browserLocale);
   setCountry(nextCountry);setLang(nextLanguage);
   // Retire previously supported languages without leaving invalid preferences.
   if(savedLanguage&&!supportedLanguages.has(savedLanguage)){
    localStorage.setItem('we_language',nextLanguage);
    window.dispatchEvent(new Event('we_preferences'));
   }
  }catch{}
 },[]);
 const flag=country==='OTHER'?null:'https://flagcdn.com/w40/'+country.toLowerCase()+'.png';
 return <header className="topbar"><nav className="navcontent" aria-label="Primary">
  <div className="header-left">
   <Link href="/" className="brand-logo" aria-label="WhatEatO homepage">
    <span className="brand-word">What</span><span className="brand-accent">EatO</span>
   </Link>
   <div className="navlinks"><Link href="/map">Map</Link><Link href="/blog">Blog</Link></div>
  </div>
  <div className="preferences">
   <div className="country-control">
    <span className="country-flag" aria-hidden="true">
     {flag&&!flagUnavailable?
      // eslint-disable-next-line @next/next/no-img-element
      <img src={flag} width="24" height="17" alt="" onError={()=>setFlagUnavailable(true)}/>:
      <span>{countryFlagFallback[country]||'🌐'}</span>}
    </span>
    <label className="sr-only" htmlFor="country">Country</label>
    <select id="country" value={country} onChange={e=>{
     setCountry(e.target.value);setFlagUnavailable(false);
     try{localStorage.setItem('we_country',e.target.value)}catch{}
    }}>{countries.map(([code,label])=>
     <option value={code} key={code}>{label}</option>)}</select>
   </div>
   <span className="sep" aria-hidden="true"></span>
   <label className="sr-only" htmlFor="language">Language</label>
   <select id="language" value={lang} onChange={e=>{
    setLang(e.target.value);
    try{
     localStorage.setItem('we_language',e.target.value);
     window.dispatchEvent(new Event('we_preferences'));
    }catch{}
   }}>{langs.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select>
  </div>
 </nav></header>;
}
