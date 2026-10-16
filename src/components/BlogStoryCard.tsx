import Link from 'next/link';
import styles from '@/app/blog/blog.module.css';

// Canonical WhatEatO Blog card used on /blog and under restaurant search results.
// Keeping one component ensures same image ratio, typography, hover and breakpoints.
type BlogStory={
 id:string;slug:string;category:string;title:string;excerpt:string;
 published_at:string;cover_image_id:string|null;
};
export default function BlogStoryCard({story,locale,categoryLabel}:{
 story:BlogStory;locale:string;categoryLabel:string;
}){
 return <Link className={styles.card} href={locale==='ja'?'/ja/blog/'+encodeURIComponent(story.slug):'/blog/'+encodeURIComponent(story.slug)+(locale==='en'?'':'?hl='+encodeURIComponent(locale))}>
  <div className={styles.cardImage}>
   {story.cover_image_id?
    // Only the already-approved blog cover is delivered by the existing protected image API.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={'/api/blog/images/'+story.cover_image_id} alt={story.title} loading="lazy"/>:
    <span aria-hidden="true">🍽️</span>}
  </div>
  <div className={styles.cardText}>
   <small>{categoryLabel}</small>
   <h3>{story.title}</h3>
   <p>{story.excerpt}</p>
   <span className={styles.date}>{new Date(story.published_at).toLocaleDateString('en-US',{
    year:'numeric',month:'short',day:'numeric'
   })}</span>
  </div>
 </Link>;
}
