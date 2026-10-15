import type {Metadata} from 'next';
import {normalizeLocale} from '@/lib/platform-v1';
import LegalPage from '@/components/LegalPage';
import {termsCopy} from '@/lib/legal-terms';

export const metadata:Metadata={
 title:'Terms of Service',
 description:'Terms governing WhatEatO restaurant information, Google sign-in, reviews, and photos.',
 robots:{index:false,follow:false}
};
export default async function TermsPage({searchParams}:{
 searchParams:Promise<{hl?:string}>
}){
 const {hl}=await searchParams;
 const locale=normalizeLocale(hl);
 return <LegalPage locale={locale} doc={termsCopy[locale]}/>;
}
