import type {Metadata} from 'next';
import {normalizeLocale} from '@/lib/platform-v1';
import LegalPage from '@/components/LegalPage';
import {privacyCopy} from '@/lib/legal-privacy';

export const metadata:Metadata={
 title:'Privacy Policy',
 description:'How WhatEatO handles Google sign-in, account IDs, reviews, photos, and service data.',
 robots:{index:false,follow:false}
};
export default async function PrivacyPage({searchParams}:{
 searchParams:Promise<{hl?:string}>
}){
 const {hl}=await searchParams;
 const locale=normalizeLocale(hl);
 return <LegalPage locale={locale} doc={privacyCopy[locale]}/>;
}
