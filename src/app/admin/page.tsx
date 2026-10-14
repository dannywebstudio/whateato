import Link from 'next/link';
import {authReady,signIn} from '@/auth';
import {currentStaff} from '@/lib/owner-cms-auth';
import AdminConsole from './AdminConsole';
import styles from './admin.module.css';
export const dynamic='force-dynamic';
export const metadata={title:'WhatEatO CMS',robots:{index:false,follow:false}};
export default async function AdminPage(){
 const staff=await currentStaff();
 return <main className={styles.wrap}>
   {!staff?<section className={styles.locked}>
     <div className={styles.eyebrow}>WHATEATO · PRIVATE ADMIN</div>
     <h1>관리자 접근 제한</h1>
     <p>Google 로그인 후 승인된 관리자 계정만 사용할 수 있어. 관리자 기능은 별도 서버 권한이 필요해.</p>
     {authReady()?
      <form action={async()=>{'use server';await signIn('google',{redirectTo:'/admin'})}}>
        <button type="submit" style={{border:0,borderRadius:9,background:'#16875b',color:'#fff',
          padding:'11px 17px',cursor:'pointer',fontWeight:700}}>관리자 Google 로그인 →</button>
      </form>:
      <p>Google OAuth가 아직 연결되지 않았어. 아래 계정 페이지에서 일반 로그인 상태를 확인할 수 있어.</p>}
     <Link href="/account">계정 상태 확인 ↗</Link>
   </section>:<AdminConsole role={staff.role}/>}
 </main>;
}
