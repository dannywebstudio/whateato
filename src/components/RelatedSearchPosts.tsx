import BlogStoryCard from '@/components/BlogStoryCard';
import styles from '@/app/blog/blog.module.css';
import {getBlogCategories,blogCategoryName} from '@/lib/blog-categories';
import {listPublishedBlog} from '@/lib/blog-public';

// Renders nothing for a missing keyword or no genuinely published matches.
export default async function RelatedSearchPosts({term,locale}:{term:string;locale:string}){
 const keyword=term.trim();
 if(keyword.length<2||keyword.length>90)return null;
 let posts:Awaited<ReturnType<typeof listPublishedBlog>>['items']=[];
 try{posts=(await listPublishedBlog({q:keyword,locale,page:1})).items.slice(0,6)}
 catch{return null}
 if(posts.length===0)return null;
 // Use the exact same localized category labels as the Blog main page.
 const categories=await getBlogCategories().catch(()=>[]);
 const labels={
  ko:{title:'검색어와 관련된 블로그'},
  en:{title:'Related stories'},
  ja:{title:'検索キーワードに関連する記事'},
  'zh-CN':{title:'与搜索关键词相关的文章'}
 } as const;
 const t=labels[locale as keyof typeof labels]||labels.en;
 return <section className="related-local-posts" aria-label={t.title} data-search-blog>
  <span className="eyebrow">LOCAL STORIES</span><h2>{t.title}</h2>
  <div className={styles.cards} data-related-blog-grid>
   {posts.map(post=><BlogStoryCard key={post.id} story={post} locale={locale}
    categoryLabel={blogCategoryName(categories.find(c=>c.slug===post.category),locale)}/>)}
  </div>
 </section>;
}
