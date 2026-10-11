'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
const langs:[string,string][]= [['auto','Auto'],['ko','한국어'],['en','English'],['ja','日本語'],['zh-CN','简体中文'],['zh-TW','繁體中文'],['ru','Русский'],['de','Deutsch'],['fr','Français'],['es','Español'],['pt','Português'],['it','Italiano'],['th','ไทย'],['vi','Tiếng Việt'],['id','Bahasa Indonesia'],['ar','العربية']];
const countries:[string,string][]= [['KR','대한민국'],['US','United States'],['JP','日本'],['CN','中国'],['TW','台灣'],['GB','United Kingdom'],['CA','Canada'],['AU','Australia'],['DE','Deutschland'],['FR','France'],['RU','Россия'],['TH','Thailand'],['VN','Việt Nam'],['ID','Indonesia'],['BR','Brasil'],['OTHER','Other']];
export default function Header(){
  const [country,setCountry]=useState('KR');
  const [lang,setLang]=useState('auto');
  useEffect(()=>{
    try {
      const savedCountry=localStorage.getItem('we_country');
      const savedLang=localStorage.getItem('we_language');
      const region=Intl.DateTimeFormat().resolvedOptions().locale.split('-')[1]?.toUpperCase();
      setCountry(savedCountry||((region&&countries.some(([c])=>c===region))?region:'KR'));
      setLang(savedLang||'auto');
    }catch{}
  },[]);
  return <header className="topbar"><nav className="navcontent" aria-label="Primary">
    <div className="navlinks"><Link href="/">Search</Link><Link href="/map">Map</Link><Link href="/blog">Blog</Link></div>
    <div className="preferences"><span aria-hidden="true">🌐</span>
      <label className="sr-only" htmlFor="country">Country</label>
      <select id="country" value={country} onChange={e=>{setCountry(e.target.value);try{localStorage.setItem('we_country',e.target.value)}catch{}}}>{countries.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select>
      <span className="sep">|</span>
      <label className="sr-only" htmlFor="language">Language</label>
      <select id="language" value={lang} onChange={e=>{setLang(e.target.value);try{localStorage.setItem('we_language',e.target.value);window.dispatchEvent(new Event('we_preferences'))}catch{}}}>{langs.map(([code,label])=><option value={code} key={code}>{label}</option>)}</select>
    </div>
  </nav></header>;
}
