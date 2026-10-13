'use client';
import type {ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import AnalyticsBeacon from '@/components/AnalyticsBeacon';
function classify(path:string):'home'|'search'|'restaurant'|'map'|'other'{
  if(path==='/')return 'home';
  if(path.startsWith('/search'))return 'search';
  if(path.startsWith('/restaurant/'))return 'restaurant';
  if(path.startsWith('/map'))return 'map';
  return 'other';
}
/** Invisible analytics instrumentation. No changes to the approved design. */
export default function Template({children}:{children:ReactNode}){
  const path=usePathname();
  return <>{children}<AnalyticsBeacon eventType="page_view" pageType={classify(path||'/')}/></>;
}
