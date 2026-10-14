import Link from 'next/link';
import type {Metadata} from 'next';
import {listPublishedBlog} from '@/lib/blog-public';
import {getBlogCategories,blogCategoryGroups,blogCategoryName} from '@/lib/blog-categories';
import styles from './blog.module.css';
export const runtime='nodejs';export const dynamic='force-dynamic';
export const metadata:Metadata={title:'Food, Travel & K-Beauty Stories',
 description:'Discover Korean restaurants, travel tips, shopping picks and K-Beauty guides.'};
type Props={searchParams:Promise<{q?:string;category?:string;page?:string;hl?:string}>};
export default async function BlogPage({searchParams}:Props){
 const query=await searchParams;
 const q=(query.q||'').slice(0,90).trim(),category=query.category||'';
 const page=Math.min(100,Math.max(1,Number.parseInt(query.page||'1',10)||1));
 const [result,categories]=await Promise.all([
  listPublishedBlog({q,category,locale:query.hl,page}),getBlogCategories()
 ]);
 const locale=result.locale;
 const groups=blogCategoryGroups(categories);
 const selectedCategory=categories.find(c=>c.slug===category);
 const selectedParent=selectedCategory?.parent_slug||selectedCategory?.slug;
 const url=(nextPage:number,cat=category)=>{
   const params=new URLSearchParams({hl:locale});
   if(q)params.set('q',q);if(cat)params.set('category',cat);
   if(nextPage>1)params.set('page',String(nextPage));
   return '/blog?'+params;
 };
 return <main className={styles.blogPage}>
   <header className={styles.hero}>
     <span className={styles.eyebrow}>WHATEATO JOURNAL · KOREA</span>
     <h1>Eat well. Explore Korea. Discover more.</h1>
     <p>Restaurant discoveries, travel essentials, shopping recommendations and K-Beauty insights, all in one place.</p>
   </header>
   <form action="/blog" method="get" className={styles.search} role="search">
     <input type="hidden" name="hl" value={locale}/>
     {category&&<input type="hidden" name="category" value={category}/>}
     <input name="q" defaultValue={q} maxLength={90} placeholder="Search guides, food or neighborhoods…"
       aria-label="Search WhatEatO blog"/>
     <button type="submit">Search stories →</button>
   </form>
   <nav aria-label="Blog categories" className={styles.categoryTree}>
     <Link className={styles.categoryLink} data-active={!category} href={url(1,'')}>All Stories</Link>
     {groups.map(root=><div className={styles.categoryGroup} key={root.slug}>
       <Link href={url(1,root.slug)} className={styles.categoryRoot}
         data-active={selectedParent===root.slug}>{blogCategoryName(root,locale)}</Link>
       {root.children.length>0&&<div className={styles.subcategories}>
         {root.children.map(child=><Link key={child.slug} href={url(1,child.slug)}
           className={styles.subcategory} data-active={category===child.slug}>
           {blogCategoryName(child,locale)}</Link>)}
       </div>}
     </div>)}
   </nav>
   <div className={styles.sectionTitle}>
     <h2>{q?'Search results':category?(blogCategoryName(selectedCategory,locale)):'Latest stories'}</h2>
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
          <small>{blogCategoryName(categories.find(c=>c.slug===item.category),locale)}</small>
          <h3>{item.title}</h3>
          <p>{item.excerpt}</p>
          <span className={styles.date}>{new Date(item.published_at).toLocaleDateString('en-US',{
            year:'numeric',month:'short',day:'numeric'})}</span>
        </div>
      </Link>)}
    </div>:<div className={styles.empty}>
       <p>{q?'No matching stories yet. Try another keyword.':
        'Our first stories are being prepared. Check back soon.'}</p>
    </div>}
   <div className={styles.pagination}>
     {page>1&&<Link href={url(page-1)}>← Previous</Link>}
     {result.more&&<Link href={url(page+1)}>More stories →</Link>}
   </div>
 </main>;
}
