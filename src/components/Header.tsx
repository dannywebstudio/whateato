'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import HeaderAccountLink from './HeaderAccountLink';

const languages=[['ko','한국어'],['en','English'],['ja','日本語'],['zh-CN','简体中文']] as const;
type Language=typeof languages[number][0];
const countries:[string,string][]= [
 ['KR','대한민국'],['US','United States'],['JP','日本'],['CN','中国'],
 ['TW','台灣'],['GB','United Kingdom'],['CA','Canada'],['AU','Australia'],
 ['DE','Deutschland'],['FR','France'],['RU','Россия'],['TH','Thailand'],
 ['VN','Việt Nam'],['ID','Indonesia'],['BR','Brasil'],['OTHER','Other']
];
const countryFlagFallback:Record<string,string>={
 KR:'🇰🇷',US:'🇺🇸',JP:'🇯🇵',CN:'🇨🇳',TW:'🇹🇼',
 GB:'🇬🇧',CA:'🇨🇦',AU:'🇦🇺',DE:'🇩🇪',FR:'🇫🇷',
 RU:'🇷🇺',TH:'🇹🇭',VN:'🇻🇳',ID:'🇮🇩',BR:'🇧🇷'
};
function validCountry(code:unknown):code is string{
 return typeof code==='string'&&/^[A-Z]{2}$/.test(code)&&code!=='ZZ'&&code!=='XX';
}
function validLanguage(code:unknown):code is Language{
 return languages.some(([locale])=>locale===code);
}
function languageForCountry(code:string):Language{
 return code==='KR'?'ko':code==='JP'?'ja':code==='CN'?'zh-CN':'en';
}
function deviceCountry():string{
 // Temporary hints only, used when reliable edge/IP location is unavailable.
 // Browser timezone/locale does not prove the visitor's physical country.
 const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
 if(zone==='Asia/Seoul'||zone==='Asia/Pyongyang')return 'KR';
 if(zone==='Asia/Tokyo')return 'JP';
 if(['Asia/Shanghai','Asia/Chongqing','Asia/Harbin','Asia/Urumqi'].includes(zone))return 'CN';
 const region=(navigator.language||'').match(/[-_]([A-Za-z]{2})(?:$|[-_])/ )?.[1]?.toUpperCase();
 return region&&validCountry(region)?region:'US';
}
function flagEmoji(country:string){
 if(!validCountry(country))return '🌐';
 return String.fromCodePoint(...[...country].map(s=>127397+s.charCodeAt(0)));
}
function initialUrlLanguage():Language|null{
 const query=new URLSearchParams(window.location.search).get('hl');
 return validLanguage(query)?query:null;
}
export default function Header(){
 const [country,setCountry]=useState('US');
 const [lang,setLang]=useState<Language>('en');
 const [flagUnavailable,setFlagUnavailable]=useState(false);
 const router=useRouter();
 function sync(countryCode:string,language:Language){
  setCountry(countryCode);setLang(language);setFlagUnavailable(false);
  document.documentElement.lang=language==='en'?'en-US':language;
  try{
   localStorage.setItem('we_country',countryCode);
   localStorage.setItem('we_language',language);
  }catch{}
  window.dispatchEvent(new Event('we_preferences'));
 }
 function navigateLanguage(language:Language,force=false){
  const path=window.location.pathname;
  if(path==='/'||!/^\/(search|map|blog(?:\/|$)|contact(?:\/|$)|restaurant\/)/.test(path))return;
  const params=new URLSearchParams(window.location.search);
  // Explicit language URLs from search engines and shared links are respected
  // on initial auto detection. Only manual choice can replace such a URL.
  if(!force&&params.has('hl'))return;
  if(params.get('hl')===language)return;
  params.set('hl',language);
  router.replace(path+'?'+params.toString()+window.location.hash,{scroll:false});
 }
 useEffect(()=>{
  let alive=true;
  let countryOverride:string|null=null;
  try{
   const saved=sessionStorage.getItem('we_country_override');
   if(validCountry(saved))countryOverride=saved;
  }catch{}
  const fallback=countryOverride||deviceCountry();
  const explicitLocale=initialUrlLanguage();
  const update=(detected:string,finalized=false)=>{
   if(!alive)return;
   let manualCountry:string|null=null,manualLanguage:Language|null=null;
   try{
    manualCountry=sessionStorage.getItem('we_country_override');
    const saved=sessionStorage.getItem('we_language_override');
    if(validLanguage(saved))manualLanguage=saved;
   }catch{}
   const selectedCountry=validCountry(manualCountry)?manualCountry:null;
   const chosen=selectedCountry||detected;
   // Manual language > manual country > explicit link language > geolocation.
   const preferred=manualLanguage||
     (selectedCountry?languageForCountry(chosen):explicitLocale||languageForCountry(chosen));
   sync(chosen,preferred);
   if(finalized&&(!explicitLocale||selectedCountry||manualLanguage))
    navigateLanguage(preferred,true);
  };
  // Show reasonable local hints first; trust edge/IP once it responds.
  // Don't navigate twice while geolocation is resolving.
  update(fallback);
  if(countryOverride){
   update(fallback,true);
  }else{
   let sessionRegion:string|null=null;
   try{sessionRegion=sessionStorage.getItem('we_detected_country')}catch{}
   if(validCountry(sessionRegion)){
    update(sessionRegion,true);
   }else{
    void fetch('/api/visitor-country',{credentials:'same-origin',cache:'no-store'})
     .then(async response=>response.ok?response.json():null)
     .then((data:unknown)=>{
      if(!alive)return;
      const detected=(data as {country?:unknown}|null)?.country;
      if(validCountry(detected)){
       try{sessionStorage.setItem('we_detected_country',detected)}catch{}
      }
      update(validCountry(detected)?detected:fallback,true);
     }).catch(()=>update(fallback,true));
   }
  }
  return()=>{alive=false};
 // Header persists in root layout; don't rerun on client route changes.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const options=validCountry(country)&&!countries.some(([id])=>id===country)?
  [...countries.slice(0,-1),[country,(()=>{try{
   return new Intl.DisplayNames([lang==='zh-CN'?'zh-CN':lang],{type:'region'}).of(country)||country;
  }catch{return country}})()] as [string,string],countries[countries.length-1]]:countries;
 const flag=country==='OTHER'?null:'https://flagcdn.com/w40/'+country.toLowerCase()+'.png';
 return <header className="topbar"><nav className="navcontent" aria-label="Primary">
  <div className="header-left">
   <Link href="/" className="brand-logo" aria-label="WhatEatO homepage">
    <span className="brand-signature"><span className="brand-w">W</span>hat</span>
    <span className="brand-accent">EatO</span>
   </Link>
   <div className="navlinks">
    <Link href={'/map?hl='+encodeURIComponent(lang)}>
     {{ko:'지도',en:'Map',ja:'地図','zh-CN':'地图'}[lang]}
    </Link>
    <Link href={'/blog?hl='+encodeURIComponent(lang)}>
     {{ko:'블로그',en:'Blog',ja:'ブログ','zh-CN':'博客'}[lang]}
    </Link>
    <Link href={'/contact?hl='+encodeURIComponent(lang)}>Contact</Link>
    <HeaderAccountLink/>
   </div>
  </div>
  <div className="preferences">
   <div className="country-control">
    <span className="country-flag" aria-hidden="true">
     {flag&&!flagUnavailable?
      // eslint-disable-next-line @next/next/no-img-element
      <img src={flag} width="24" height="17" alt="" onError={()=>setFlagUnavailable(true)}/>:
      <span>{countryFlagFallback[country]||flagEmoji(country)}</span>}
    </span>
    <label className="sr-only" htmlFor="country">Country</label>
    <select id="country" value={country} onChange={e=>{
     const next=e.target.value;
     try{
      sessionStorage.setItem('we_country_override',next);
      sessionStorage.removeItem('we_language_override');
     }catch{}
     const newLanguage=languageForCountry(next);
     sync(next,newLanguage);
     navigateLanguage(newLanguage,true);
    }}>{options.map(([code,label])=>
     <option value={code} key={code}>{label}</option>)}</select>
   </div>
   <span className="sep" aria-hidden="true"></span>
   <label className="sr-only" htmlFor="language">Language</label>
   <select id="language" value={lang} onChange={e=>{
    const chosen=e.target.value as Language;
    if(!validLanguage(chosen))return;
    try{sessionStorage.setItem('we_language_override',chosen)}catch{}
    sync(country,chosen);
    navigateLanguage(chosen,true);
   }}>{languages.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select>
  </div>
 </nav></header>;
}
