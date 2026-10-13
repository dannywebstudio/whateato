import Link from 'next/link';
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
     <Link href="/account">Google 로그인 / 계정 확인 ↗</Link>
   </section>:<AdminConsole role={staff.role}/>}
 </main>;
}
