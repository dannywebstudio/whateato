import Link from 'next/link';
import type {Metadata} from 'next';
import {listPublishedBlog} from '@/lib/blog-public';
import {BLOG_CATEGORIES,type BlogCategory} from '@/lib/blog-model';
import styles from './blog.module.css';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Korean Food Stories & Dining Guides',
 description:'Discover restaurants, neighborhood food guides, local Korean dishes, and practical dining tips.'};
type Props={searchParams:Promise<{q?:string;category?:string;page?:string;hl?:string}>};
export default async function BlogPage({searchParams}:Props){
 const query=await searchParams;
 const q=(query.q||'').slice(0,90).trim(),category=query.category||'';
 const page=Math.min(100,Math.max(1,Number.parseInt(query.page||'1',10)||1));
 const result=await listPublishedBlog({q,category,locale:query.hl,page});
 const locale=result.locale;
 const url=(nextPage:number,cat=category)=>{
   const params=new URLSearchParams({hl:locale});
   if(q)params.set('q',q);if(cat)params.set('category',cat);
   if(nextPage>1)params.set('page',String(nextPage));
   return '/blog?'+params;
 };
 return <main className={styles.blogPage}>
   <header className={styles.hero}>
     <span className={styles.eyebrow}>WHATEATO JOURNAL · KOREA</span>
     <h1>Good food. Local stories. Better discoveries.</h1>
     <p>Explore Korean food culture, neighborhood dining guides, and thoughtful tips
       for finding the right place to eat in Korea.</p>
   </header>
   <form action="/blog" method="get" className={styles.search} role="search">
     <input type="hidden" name="hl" value={locale}/>
     {category&&<input type="hidden" name="category" value={category}/>}
     <input name="q" defaultValue={q} maxLength={90} placeholder="Search guides, food or neighborhoods…"
       aria-label="Search WhatEatO blog"/>
     <button type="submit">Search stories →</button>
   </form>
   <nav aria-label="Blog categories" className={styles.categories}>
     <Link className={styles.categoryLink} data-active={!category} href={url(1,'')}>All Stories</Link>
     {(Object.entries(BLOG_CATEGORIES) as [BlogCategory,string][]).map(([code,label])=>
       <Link key={code} href={url(1,code)} className={styles.categoryLink}
         data-active={category===code}>{label}</Link>)}
   </nav>
   <div className={styles.sectionTitle}>
     <h2>{q?'Search results':category?(BLOG_CATEGORIES[category as BlogCategory]||'Stories'):'Latest stories'}</h2>
   </div>
   {result.items.length?<div className={styles.cards}>
      {result.items.map(item=><Link className={styles.card} key={item.id}
        href={'/blog/'+item.slug+'?hl='+encodeURIComponent(locale)}>
        <div className={styles.cardImage}>
         {item.cover_image_id?
          // eslint-disable-next-line @next/next/no-img-element
          <img src={'/api/blog/images/'+item.cover_image_id} alt={item.title} loading="lazy"/>:
          <span aria-hidden="true">🍽️</span>}
        </div>
        <div className={styles.cardText}>
          <small>{BLOG_CATEGORIES[item.category as BlogCategory]||'Food stories'}</small>
          <h3>{item.title}</h3>
          <p>{item.excerpt}</p>
          <span className={styles.date}>{new Date(item.published_at).toLocaleDateString('en-US',{
            year:'numeric',month:'short',day:'numeric'})}</span>
        </div>
      </Link>)}
    </div>:<div className={styles.empty}>
       <p>{q?'No matching stories yet. Try another keyword.':
        'Our food guides are being prepared. Check back for the first editorial story.'}</p>
    </div>}
   <div className={styles.pagination}>
     {page>1&&<Link href={url(page-1)}>← Previous</Link>}
     {result.more&&<Link href={url(page+1)}>More stories →</Link>}
   </div>
 </main>;
}
