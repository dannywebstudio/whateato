import Link from 'next/link';
import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
import {auth,authReady} from '@/auth';
import {getPool} from '@/lib/db';
import {normalizeLocale} from '@/lib/platform-v1';
import {logout} from '@/app/account/actions';
import MyReviewCards,{type MyReview} from '@/components/MyReviewCards';
import styles from './my-page.module.css';
export const runtime='nodejs',dynamic='force-dynamic';
export const metadata:Metadata={title:'My Page | WhatEatO',robots:{index:false,follow:false}};
const labels={
 ko:{intro:'내가 남긴 리뷰를 한곳에서 관리하세요.',reviews:'내 리뷰',unit:'개',empty:'아직 작성한 리뷰가 없어요.',hint:'맛집을 찾아 첫 후기를 남겨보세요.',search:'식당 찾아보기',account:'계정 관리 및 탈퇴',logout:'로그아웃',prev:'← 이전',next:'다음 →',error:'리뷰를 불러오지 못했습니다. 다시 시도해 주세요.'},
 en:{intro:'Manage every review you have shared, all in one place.',reviews:'My reviews',unit:' reviews',empty:'No reviews yet.',hint:'Explore restaurants and share your first experience.',search:'Explore restaurants',account:'Account and deletion',logout:'Sign out',prev:'← Previous',next:'Next →',error:'Could not load your reviews. Please try again.'},
 ja:{intro:'投稿した口コミを一覧で管理できます。',reviews:'自分の口コミ',unit:'件',empty:'まだ口コミがありません。',hint:'お店を探して、最初の体験を投稿しましょう。',search:'お店を探す',account:'アカウントと退会',logout:'ログアウト',prev:'← 前へ',next:'次へ →',error:'口コミを読み込めません。もう一度お試しください。'},
 'zh-CN':{intro:'集中管理您发表的餐厅评价。',reviews:'我的评价',unit:'条',empty:'暂无评价。',hint:'探索餐厅，分享您的第一次体验。',search:'探索餐厅',account:'账户与注销',logout:'退出登录',prev:'← 上一页',next:'下一页 →',error:'无法加载评价，请重试。'}
} as const;
export default async function MyPage({searchParams}:{searchParams:Promise<{hl?:string;page?:string}>}){
 const params=await searchParams,locale=normalizeLocale(params.hl),t=labels[locale];
 if(!authReady())redirect('/login?hl='+encodeURIComponent(locale));
 const session=await auth(),uid=session?.user?.id;
 if(!uid||!(/^[0-9a-f-]{36}$/i).test(uid))redirect('/login?hl='+encodeURIComponent(locale));
 const pool=getPool(),page=Math.min(500,Math.max(1,Number.parseInt(params.page||'1',10)||1));
 const pageSize=12;
 let reviews:MyReview[]=[],total=0,failed=false;
 try{
  if(!pool)throw Error('Database unavailable');
  const sql=[
    'SELECT r.id::text AS id,r.restaurant_id::text AS restaurant_id,',
    'COALESCE(l.display_name,k.display_name,v.name_ko) AS restaurant_name,',
    'r.rating,r.body,r.moderation_status,r.created_at::text AS created_at,',
    'r.updated_at::text AS updated_at,',
    'CASE WHEN s.review_id IS NULL THEN NULL ELSE jsonb_build_object(',
    "'taste',s.taste,'service',s.service,'tourist_friendliness',s.tourist_friendliness,",
    "'value_for_money',s.value_for_money,'cleanliness',s.cleanliness) END AS categories,",
    '(SELECT count(*)::int FROM whateato_review_photo_assets p WHERE p.review_id=r.id) AS photo_count,',
    'count(*) OVER()::int AS total_count',
    'FROM whateato_user_reviews r JOIN restaurants v ON v.id=r.restaurant_id',
    "LEFT JOIN restaurant_localizations l ON l.restaurant_id=r.restaurant_id AND l.locale=$2 AND l.publication_state='published'",
    "LEFT JOIN restaurant_localizations k ON k.restaurant_id=r.restaurant_id AND k.locale='ko' AND k.publication_state='published'",
    'LEFT JOIN whateato_review_category_scores s ON s.review_id=r.id',
    'WHERE r.account_id=$1',
    "AND NOT (r.moderation_status='rejected' AND r.body='Review removed by its author. Original text is no longer available.')",
    'ORDER BY r.updated_at DESC,r.id DESC LIMIT $3 OFFSET $4'
  ].join(' ');
  const result=await pool.query<MyReview&{total_count:number}>(sql,[uid,locale,pageSize,(page-1)*pageSize]);
  reviews=result.rows;total=result.rows[0]?.total_count??0;
 }catch{failed=true}
 const href=(n:number)=>'/my-page?hl='+encodeURIComponent(locale)+'&page='+n;
 return <main className={styles.page} lang={locale}><div className={styles.inner}>
  <header className={styles.heading}>
   <div><span className={styles.eyebrow}>MY WHATEATO</span><h1>My Page</h1><p className={styles.intro}>{t.intro}</p></div>
   <div className={styles.actions}>
    <Link href="/account" className={styles.accountLink}>{t.account}</Link>
    <form action={logout}><button type="submit" className={styles.logout}>{t.logout}</button></form>
   </div>
  </header>
  <div className={styles.sectionTitle}><h2>{t.reviews}</h2><span>{total}{t.unit}</span></div>
  {failed?<p className={styles.error} role="alert">{t.error}</p>:
   reviews.length?<MyReviewCards initialReviews={reviews} locale={locale}/>:
   <div className={styles.empty}><span className={styles.illustration} aria-hidden="true">✎</span>
    <h3>{t.empty}</h3><p>{t.hint}</p><Link href={'/search?hl='+locale}>{t.search} →</Link>
   </div>}
  {!failed&&total>pageSize&&<nav className={styles.pager} aria-label="Review pages">
    {page>1?<Link href={href(page-1)}>{t.prev}</Link>:<span/>}
    <span>{page} / {Math.ceil(total/pageSize)}</span>
    {page*pageSize<total?<Link href={href(page+1)}>{t.next}</Link>:<span/>}
   </nav>}
 </div></main>;
}
