import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {findPublishedBlog,relatedBlogRestaurants} from '@/lib/blog-public';
import {BLOG_CATEGORIES} from '@/lib/blog-model';
import {BlogBody as RenderBody} from '@/components/BlogBody';
import styles from '../blog.module.css';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{slug:string}>;searchParams:Promise<{hl?:string}>};
export async function generateMetadata({params,searchParams}:Ctx):Promise<Metadata>{
 const {slug}=await params,{hl}=await searchParams;
 const published=await findPublishedBlog(slug,hl);
 if(!published)return {title:'Story not found',robots:{index:false,follow:false}};
 const t=published.draft.translations[published.locale]||published.draft.translations.en!;
 const ready=process.env.NEXT_PUBLIC_LAUNCH_READY==='true';
 return {
  title:t.seo_title||published.title,
  description:t.seo_description||published.excerpt,
  alternates:{canonical:'/blog/'+slug,
   languages:Object.fromEntries(Object.keys(published.draft.translations).map(l=>
    [l,'/blog/'+slug+'?hl='+encodeURIComponent(l)]))},
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
 const restaurants=await relatedBlogRestaurants(published.draft,published.locale);
 const date=new Date(published.published_at).toLocaleDateString('en-US',{
   year:'numeric',month:'long',day:'numeric'});
 const structured={
  '@context':'https://schema.org','@type':'BlogPosting',
  headline:published.title,description:published.excerpt,
  datePublished:published.published_at,inLanguage:published.locale,
  author:{'@type':'Organization',name:'WhatEatO Editorial'},
  publisher:{'@type':'Organization',name:'WhatEatO'},
  mainEntityOfPage:(process.env.NEXT_PUBLIC_SITE_URL||'https://whateato.com').replace(/\/$/,'')
    +'/blog/'+slug,
  ...(published.cover_image_id?{image:[(process.env.NEXT_PUBLIC_SITE_URL||
    'https://whateato.com').replace(/\/$/,'')+'/api/blog/images/'+published.cover_image_id]}:{})
 };
 return <main className={styles.articleShell}>
   <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/blog">Blog</Link><span>›</span>
      <Link href={'/blog?category='+encodeURIComponent(published.draft.category)}>
       {BLOG_CATEGORIES[published.draft.category]}</Link><span>›</span>
      <span aria-current="page">{published.title.slice(0,65)}</span>
   </nav>
   <header className={styles.articleHeader}>
     <span className={styles.eyebrow}>WHATEATO · KOREAN FOOD JOURNAL</span>
     <h1>{published.title}</h1>
     <p className={styles.dek}>{published.excerpt}</p>
     <div className={styles.meta}><span>WhatEatO Editorial</span><span>·</span>
      <time dateTime={published.published_at}>{date}</time></div>
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
