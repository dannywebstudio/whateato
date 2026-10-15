'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import type {SiteLanguage} from '@/lib/visitor-country';
import styles from './LocalizedChromeText.module.css';

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
 ko:'한국에서 마음에 드는 맛집을 찾아보세요.',
 ja:'韓国でお気に入りのグルメスポットを見つけよう。',
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
 return <p className={styles.tagline}>{taglines[locale]}</p>;
}
const legalLabels:Record<SiteLanguage,{privacy:string;terms:string;contact:string}>={
 en:{privacy:'Privacy Policy',terms:'Terms of Service',contact:'Contact'},
 ko:{privacy:'개인정보처리방침',terms:'이용약관',contact:'문의하기'},
 ja:{privacy:'プライバシーポリシー',terms:'利用規約',contact:'お問い合わせ'},
 'zh-CN':{privacy:'隐私政策',terms:'服务条款',contact:'联系我们'}
};
export function SiteFooter(){
 const locale=useChromeLocale();
 const labels=legalLabels[locale];
 const query='?hl='+encodeURIComponent(locale);
 return <footer className="footer">
  <div className={styles.footerInner}>
   <nav className={styles.legalLinks} aria-label="Legal and contact information">
    <Link href={'/privacy'+query}>{labels.privacy}</Link>
    <span aria-hidden="true">|</span>
    <Link href={'/terms'+query}>{labels.terms}</Link>
    <span aria-hidden="true">|</span>
    <Link href={'/contact'+query}>{labels.contact}</Link>
   </nav>
   <span className={styles.footerNote}>© WhatEatO · {footers[locale]}</span>
  </div>
 </footer>;
}
