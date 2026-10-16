import Link from 'next/link';
import {seoPublicEnabled} from '@/lib/public-seo';
import {currentStaff,hasPermission} from '@/lib/owner-cms-auth';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {findPublishedBlog,relatedBlogRestaurants} from '@/lib/blog-public';
import {getBlogCategories,blogCategoryName} from '@/lib/blog-categories';
import {BLOG_REQUIRED_LOCALES,BLOG_LOCALE_LABELS} from '@/lib/blog-model';
import {BlogBody as RenderBody} from '@/components/BlogBody';
import styles from '../blog.module.css';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{slug:string}>;searchParams:Promise<{hl?:string}>};
export async function generateMetadata({params,searchParams}:Ctx):Promise<Metadata>{
 const {slug}=await params,{hl}=await searchParams;
 const published=await findPublishedBlog(slug,hl);
 if(!published)return {title:'Story not found',robots:{index:false,follow:false}};
 const t=published.draft.translations[published.locale]||published.draft.translations.en!;
 const ready=seoPublicEnabled();
 return {
  title:t.seo_title||published.title,
  description:t.seo_description||published.excerpt,
  alternates:{
   canonical:published.locale==='ja'?'/ja/blog/'+slug:'/blog/'+slug+(published.locale==='en'?'':'?hl='+encodeURIComponent(published.locale)),
   languages:{
    ...Object.fromEntries(BLOG_REQUIRED_LOCALES.filter(l=>
      Boolean(published.draft.translations[l]?.title)).map(l=>
      [l,l==='ja'?'/ja/blog/'+slug:'/blog/'+slug+(l==='en'?'':'?hl='+encodeURIComponent(l))])),
    'en-US':'/blog/'+slug,
    'x-default':'/blog/'+slug
   }
  },
  robots:{index:ready,follow:ready},
  openGraph:{type:'article',title:t.seo_title||published.title,
   description:t.seo_description||published.excerpt,
   ...(published.cover_image_id?{images:[{url:'/api/blog/images/'+published.cover_image_id,
    alt:published.title}]}:{})}
 };
}
export default async function BlogStory({params,searchParams}:Ctx){
 const {slug}=await params,{hl}=await searchParams;
 const published=await findPublishedBlog(slug,hl);
 if(!published)notFound();
 const t=published.draft.translations[published.locale]||published.draft.translations.en!;
 const [restaurants,categories,staff]=await Promise.all([
   relatedBlogRestaurants(published.draft,published.locale),getBlogCategories(true),currentStaff()
 ]);
 const activeCategory=categories.find(c=>c.slug===published.draft.category);
 const parentCategory=categories.find(c=>c.slug===activeCategory?.parent_slug);
 const date=new Date(published.published_at).toLocaleDateString('en-US',{
   year:'numeric',month:'long',day:'numeric'});
 const structured={
  '@context':'https://schema.org','@type':'BlogPosting',
  headline:published.title,description:published.excerpt,
  datePublished:published.published_at,inLanguage:published.locale,
  author:{'@type':'Organization',name:'WhatEatO Editorial'},
  publisher:{'@type':'Organization',name:'WhatEatO'},
  mainEntityOfPage:(process.env.NEXT_PUBLIC_SITE_URL||'https://whateato.com').replace(/\/$/,'')
    +(published.locale==='ja'?'/ja/blog/':'/blog/')+slug,
  ...(published.cover_image_id?{image:[(process.env.NEXT_PUBLIC_SITE_URL||
    'https://whateato.com').replace(/\/$/,'')+'/api/blog/images/'+published.cover_image_id]}:{})
 };
 return <main className={styles.articleShell} lang={published.locale==='en'?'en-US':published.locale}>
   <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/blog">Blog</Link><span>›</span>
      {parentCategory&&<>
        <Link href={'/blog?category='+parentCategory.slug}>
          {blogCategoryName(parentCategory,published.locale)}</Link><span>›</span>
      </>}
      <Link href={'/blog?category='+encodeURIComponent(published.draft.category)}>
        {blogCategoryName(activeCategory,published.locale)}</Link><span>›</span>
      <span aria-current="page">{published.title.slice(0,65)}</span>
   </nav>
   <header className={styles.articleHeader}>
     <span className={styles.eyebrow}>WHATEATO · FOOD, TRAVEL & BEAUTY</span>
     <h1>{published.title}</h1>
     <p className={styles.dek}>{published.excerpt}</p>
     <div className={styles.meta}><span>WhatEatO Editorial</span><span>·</span>
      <time dateTime={published.published_at}>{date}</time></div>
     <nav className={styles.languageSwitch} aria-label="Article language">
      {BLOG_REQUIRED_LOCALES.map(l=><Link key={l}
       aria-current={published.locale===l?'page':undefined}
       href={l==='ja'?'/ja/blog/'+slug:'/blog/'+slug+(l==='en'?'':'?hl='+encodeURIComponent(l))}>
       {BLOG_LOCALE_LABELS[l]}
      </Link>)}
     </nav>
     {staff&&hasPermission(staff,'edit')&&<Link href={'/admin?tab=blog&editBlog='+encodeURIComponent(slug)} className={styles.ownerEditButton} rel="nofollow">Edit</Link>}
   </header>
   {published.cover_image_id&&<figure className={styles.cover}>
     {/* eslint-disable-next-line @next/next/no-img-element */}
     <img src={'/api/blog/images/'+published.cover_image_id}
        alt={published.title} width={1200} height={810}/>
   </figure>}
   <RenderBody blocks={t.blocks}/>
   {published.draft.tags.length>0&&<div className={styles.tags}>
     {published.draft.tags.map(tag=><span className={styles.tag} key={tag}>
      #{tag.replaceAll('-',' ')}</span>)}
   </div>}
   {restaurants.length>0&&<section className={styles.related} aria-label="Related restaurants">
     <h2>Restaurants mentioned in this guide</h2>
     {restaurants.map(r=><Link href={'/restaurant/'+r.id+'?hl='+published.locale} key={r.id}>
       <strong>{r.name}</strong><span>{r.road_address_ko||'View restaurant'} ↗</span>
     </Link>)}
   </section>}
   <Link className={styles.back} href="/blog">← Back to food stories</Link>
   <script type="application/ld+json"
     dangerouslySetInnerHTML={{__html:JSON.stringify(structured).replace(/</g,'\\u003c')}}/>
 </main>;
}
