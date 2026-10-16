import Link from 'next/link';
import {redirect} from 'next/navigation';
import type {Metadata} from 'next';
import {auth,authReady} from '@/auth';
import {normalizeLocale} from '@/lib/platform-v1';
import {loginGoogle} from './actions';
import styles from './login.module.css';

export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Login | WhatEatO',robots:{index:false,follow:false}};
const copy={
 ko:{eyebrow:'WELCOME BACK',title:'WhatEatO에 로그인',intro:'Google 계정 하나로 리뷰를 작성하고, 내가 남긴 후기를 관리할 수 있어요.',button:'Google 계정으로 로그인',notice:'로그인 시 Google의 이메일 인증 여부를 확인하며, 이메일·이름·프로필 사진은 계정 DB에 저장하지 않습니다.',privacy:'개인정보처리방침',terms:'이용약관',unavailable:'Google 로그인이 준비되지 않았습니다.'},
 en:{eyebrow:'WELCOME BACK',title:'Sign in to WhatEatO',intro:'Use your Google account to write reviews and manage everything you have shared.',button:'Continue with Google',notice:'We verify your Google email status at sign-in but do not store your email, name or avatar in our account database.',privacy:'Privacy Policy',terms:'Terms of Service',unavailable:'Google sign-in is not available yet.'},
 ja:{eyebrow:'WELCOME BACK',title:'WhatEatOにログイン',intro:'Googleアカウントで口コミを書き、投稿をまとめて管理できます。',button:'Googleでログイン',notice:'メール認証の有無は確認しますが、メールアドレス・氏名・写真はアカウントDBに保存しません。',privacy:'プライバシーポリシー',terms:'利用規約',unavailable:'Googleログインを利用できません。'},
 'zh-CN':{eyebrow:'WELCOME BACK',title:'登录 WhatEatO',intro:'使用 Google 账号撰写评价，并管理您发布的所有内容。',button:'使用 Google 登录',notice:'登录时验证 Google 邮箱状态，但不会在账户数据库保存邮箱、姓名或头像。',privacy:'隐私政策',terms:'服务条款',unavailable:'Google 登录暂不可用。'}
} as const;
export default async function LoginPage({searchParams}:{searchParams:Promise<{hl?:string}>}){
 const {hl}=await searchParams;
 const locale=normalizeLocale(hl);
 const ready=authReady();
 if(ready){
  const session=await auth();
  if(session?.user?.id)redirect('/my-page?hl='+encodeURIComponent(locale));
 }
 const t=copy[locale];
 return <main className={styles.page} lang={locale}>
  <section className={styles.panel}>
   <span className={styles.eyebrow}>{t.eyebrow}</span>
   <h1>{locale==='en'?'Sign in to ':locale==='zh-CN'?'登录 ':''}<span className={styles.headingLogo} aria-label="WhatEatO"><span className="brand-signature"><span className="brand-w">W</span>hat</span><span className="brand-accent">EatO</span></span>{locale==='ko'?'에 로그인':locale==='ja'?'にログイン':''}</h1>
   <p className={styles.intro}>{t.intro}</p>
   {ready?<form action={loginGoogle}>
    <input type="hidden" name="hl" value={locale}/>
    <button type="submit" className={styles.googleButton}>
     <span className={styles.googleMark} aria-hidden="true">G</span>{t.button}<span className={styles.arrow} aria-hidden="true">→</span>
    </button>
   </form>:<p className={styles.unavailable} role="status">{t.unavailable}</p>}
   <p className={styles.notice}>{t.notice}</p>
   <div className={styles.links}><Link href={'/privacy?hl='+locale}>{t.privacy}</Link><span aria-hidden="true">·</span><Link href={'/terms?hl='+locale}>{t.terms}</Link></div>
  </section>
 </main>;
}
