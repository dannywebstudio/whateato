import type {Metadata} from 'next';
import Header from '@/components/Header';
import {SiteFooter} from '@/components/LocalizedChromeText';
import './globals.css';
const ready=process.env.NEXT_PUBLIC_LAUNCH_READY==='true';
export const metadata:Metadata={
  metadataBase:new URL(process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000'),
  title:{default:'WhatEatO — Find Restaurants in Korea',template:'%s | WhatEatO'},
  description:'Discover restaurants in Korea by name, neighborhood, dish or address.',
  robots:{index:ready,follow:ready}
};
export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><Header/>{children}<SiteFooter/></body></html>;
}
