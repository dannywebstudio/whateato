import type {Metadata} from 'next';
import {normalizeLocale} from '@/lib/platform-v1';
import styles from './contact.module.css';

export const metadata:Metadata={
 title:'Contact',
 description:'Contact WhatEatO about advertising and restaurant listing or correction requests.'
};
const email='pakrsky2@naver.com';
const copy={
 ko:{
  eyebrow:'GET IN TOUCH',heading:'Contact',intro:'WhatEatO에 문의해 주세요.',
  topic:'광고, 장소 등록&수정 요청 :',suffix:' 로 문의주세요',
  action:'이메일 보내기'
 },
 en:{
  eyebrow:'GET IN TOUCH',heading:'Contact',intro:'Get in touch with WhatEatO.',
  topic:'For advertising and restaurant listing or correction requests, please contact',
  suffix:'.',action:'Send an email'
 },
 ja:{
  eyebrow:'GET IN TOUCH',heading:'Contact',intro:'WhatEatOへのお問い合わせはこちら。',
  topic:'広告、店舗の登録・情報修正のご依頼は',suffix:'までお問い合わせください。',
  action:'メールを送る'
 },
 'zh-CN':{
  eyebrow:'GET IN TOUCH',heading:'Contact',intro:'欢迎联系 WhatEatO。',
  topic:'广告合作、餐厅收录及信息修改申请，请联系',suffix:'。',
  action:'发送邮件'
 }
} as const;
export default async function ContactPage({searchParams}:{
 searchParams:Promise<{hl?:string}>
}){
 const params=await searchParams;
 const locale=normalizeLocale(params.hl);
 const t=copy[locale];
 return <main className={styles.page}>
  <section className={styles.content}>
   <span className={styles.eyebrow}>{t.eyebrow}</span>
   <h1>{t.heading}</h1>
   <p className={styles.intro}>{t.intro}</p>
   <div className={styles.panel}>
    <p className={styles.message}>{t.topic}{' '}
     <a href={'mailto:'+email} className={styles.email}>{email}</a>{t.suffix}</p>
    <a className={styles.action} href={'mailto:'+email}>{t.action} <span aria-hidden="true">↗</span></a>
   </div>
  </section>
 </main>;
}
