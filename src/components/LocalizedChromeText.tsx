'use client';
import {useEffect,useState} from 'react';
import type {SiteLanguage} from '@/lib/visitor-country';

function useChromeLocale():SiteLanguage{
 const [locale,setLocale]=useState<SiteLanguage>('en');
 useEffect(()=>{
  const sync=()=>{
   let lang:string|null=null;
   try{lang=localStorage.getItem('we_language')}catch{}
   setLocale(lang==='ko'||lang==='ja'||lang==='zh-CN'?lang:'en');
  };
  sync();window.addEventListener('we_preferences',sync);
  return()=>window.removeEventListener('we_preferences',sync);
 },[]);
 return locale;
}
const taglines:Record<SiteLanguage,string>={
 en:'Find your next favorite place to eat in Korea.',
 ko:'한국에서 다음으로 좋아할 맛집을 찾아보세요.',
 ja:'韓国で次のお気に入りのお店を見つけよう。',
 'zh-CN':'发现你在韩国的下一家心仪餐厅。'
};
const footers:Record<SiteLanguage,string>={
 en:'Restaurant information may change · Visitor reviews are moderated',
 ko:'식당 정보는 변동될 수 있습니다 · 방문 후기는 검수 후 게시됩니다',
 ja:'店舗情報は変更される場合があります · 口コミは審査後に公開されます',
 'zh-CN':'餐厅信息可能发生变化 · 用户评价经审核后发布'
};
export function HomeTagline(){
 const locale=useChromeLocale();
 return <p>{taglines[locale]}</p>;
}
export function SiteFooter(){
 const locale=useChromeLocale();
 return <footer className="footer">© WhatEatO · {footers[locale]}</footer>;
}
