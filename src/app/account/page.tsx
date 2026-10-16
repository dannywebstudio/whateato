import Link from 'next/link';
import {auth,authReady} from '@/auth';
import {normalizeLocale} from '@/lib/platform-v1';
import {loginWithGoogle,logout,deleteAccount} from './actions';

export const dynamic='force-dynamic';
export const metadata={title:'Account | WhatEatO',robots:{index:false,follow:false}};
const translations={
 ko:{title:'WhatEatO 계정',intro:'리뷰 작성에 필요한 최소한의 로그인만 제공합니다.',unavailable:'Google 로그인을 준비하고 있습니다. 서버 설정이 완료되면 사용할 수 있습니다.',loginTitle:'Google로 로그인',scope:'요청 권한: 기본 로그인 확인(openid) 및 이메일 확인(email).',storage:'DB에는 Google의 고유 계정 식별자만 저장합니다. 이메일, 이름, 프로필 사진은 저장하지 않습니다.',continue:'Google 계정으로 계속하기 →',signedIn:'로그인 완료',review:'식당 후기 작성이 가능합니다. 리뷰는 검토 후 공개됩니다.',logout:'로그아웃',deleteTitle:'계정 및 리뷰 삭제',deleteDetail:'탈퇴하면 내부 로그인 계정과 직접 작성한 모든 리뷰가 영구 삭제됩니다.',deleteInstruction:'아래 칸에 DELETE를 입력한 뒤 탈퇴를 눌러주세요.',confirm:'삭제 확인',deleteButton:'계정 및 리뷰 삭제',before:'로그인 전에 ',privacy:'개인정보 처리 안내',after:'를 확인해 주세요.',home:'← WhatEatO 홈'},
 en:{title:'WhatEatO Account',intro:'We only ask you to sign in to write reviews.',unavailable:'Google sign-in is not yet available. Please try again once setup is complete.',loginTitle:'Sign in with Google',scope:'Permissions requested: identity verification (openid) and email verification (email).',storage:'We store only your Google account identifier in our database, not your email address, name, or profile photo.',continue:'Continue with Google →',signedIn:'Signed in',review:'You can write restaurant reviews. Reviews are published after moderation.',logout:'Sign out',deleteTitle:'Delete account and reviews',deleteDetail:'Deleting your account permanently removes your account and all reviews you wrote.',deleteInstruction:'Type DELETE below to confirm account deletion.',confirm:'Deletion confirmation',deleteButton:'Delete account and reviews',before:'Before signing in, please read our ',privacy:'Privacy Policy',after:'.',home:'← WhatEatO Home'},
 ja:{title:'WhatEatO アカウント',intro:'口コミの投稿に必要な最低限のログイン情報のみ使用します。',unavailable:'Googleログインは現在準備中です。設定完了後にご利用ください。',loginTitle:'Googleでログイン',scope:'要求する権限：本人確認（openid）とメール認証（email）。',storage:'データベースにはGoogleアカウントの識別子のみを保存し、メールアドレス・氏名・プロフィール写真は保存しません。',continue:'Googleで続ける →',signedIn:'ログイン済み',review:'飲食店の口コミを投稿できます。口コミは審査後に公開されます。',logout:'ログアウト',deleteTitle:'アカウントと口コミの削除',deleteDetail:'退会すると、アカウントと投稿したすべての口コミが完全に削除されます。',deleteInstruction:'削除するには、下の欄にDELETEと入力してください。',confirm:'削除の確認',deleteButton:'アカウントと口コミを削除',before:'ログイン前に',privacy:'プライバシーポリシー',after:'をご確認ください。',home:'← WhatEatO ホーム'},
 'zh-CN':{title:'WhatEatO 账户',intro:'我们仅要求您登录以撰写餐厅评价。',unavailable:'Google 登录尚未开放，请等待设置完成。',loginTitle:'使用 Google 登录',scope:'请求权限：身份验证（openid）和电子邮件验证（email）。',storage:'数据库仅保存 Google 账户标识符，不保存邮箱、姓名或头像。',continue:'使用 Google 继续 →',signedIn:'已登录',review:'您可以撰写餐厅评价，评价审核后才会公开。',logout:'退出登录',deleteTitle:'删除账户及评价',deleteDetail:'注销账户将永久删除您的账户及您撰写的全部评价。',deleteInstruction:'请在下方输入 DELETE 以确认注销。',confirm:'删除确认',deleteButton:'删除账户及评价',before:'登录前请阅读',privacy:'隐私政策',after:'。',home:'← WhatEatO 首页'}
} as const;

export default async function AccountPage({searchParams}:{searchParams:Promise<{hl?:string}>}){
 const {hl}=await searchParams;
 const locale=normalizeLocale(hl),t=translations[locale],query='?hl='+encodeURIComponent(locale);
 const ready=authReady();
 const session=ready?await auth():null;
 return <main className="content" lang={locale}>
  <h1>{t.title}</h1>
  <p className="hint">{t.intro}</p>
  {!ready&&<div className="empty">{t.unavailable}</div>}
  {ready&&!session?.user?.id&&<section className="result">
   <strong>{t.loginTitle}</strong>
   <span>{t.scope}</span>
   <span>{t.storage}</span>
   <form action={loginWithGoogle}><button className="chip" type="submit">{t.continue}</button></form>
  </section>}
  {ready&&session?.user?.id&&<>
   <section className="result">
    <strong>{t.signedIn}</strong>
    <span>{t.review}</span>
    <form action={logout}><button className="chip" type="submit">{t.logout}</button></form>
   </section>
   <section className="result" aria-label={t.deleteTitle}>
    <strong>{t.deleteTitle}</strong>
    <span>{t.deleteDetail}</span>
    <span>{t.deleteInstruction}</span>
    <form action={deleteAccount}>
     <label htmlFor="confirmation">{t.confirm}</label>
     <input id="confirmation" name="confirmation" placeholder="DELETE" required pattern="DELETE" autoComplete="off" />
     <button className="chip" type="submit">{t.deleteButton}</button>
    </form>
   </section>
  </>}
  <p className="hint">{t.before}<Link className="simple-link" href={'/privacy'+query}>{t.privacy}</Link>{t.after}</p>
  <Link className="simple-link" href="/">{t.home}</Link>
 </main>;
}
