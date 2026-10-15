'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import styles from './HeaderAccountLink.module.css';
import type {SiteLanguage} from '@/lib/visitor-country';

// The server's Auth.js session is the authority, not localStorage or the URL.
export default function HeaderAccountLink({lang}:{lang:SiteLanguage}){
 const pathname=usePathname();
 const [signedIn,setSignedIn]=useState<boolean|null>(null);
 useEffect(()=>{
  const controller=new AbortController();
  void fetch('/api/auth/session',{credentials:'same-origin',cache:'no-store',signal:controller.signal})
   .then(async response=>{
    if(!response.ok)throw new Error('Auth session unavailable');
    return response.json() as Promise<{user?:{id?:string}}>;
   })
   .then(session=>{
    if(!controller.signal.aborted)setSignedIn(Boolean(session?.user?.id));
   })
   .catch(()=>{if(!controller.signal.aborted)setSignedIn(false)});
  return()=>controller.abort();
 },[pathname]);
 if(signedIn===null)return <span className={styles.placeholder} aria-label="Loading account" aria-busy="true"/>;
 return <Link className={styles.accountLink} href={(signedIn?'/my-page':'/login')+'?hl='+encodeURIComponent(lang)}>
  {signedIn?'My Page':'Login'}
 </Link>;
}
