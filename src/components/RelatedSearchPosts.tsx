import Link from 'next/link';
import {listPublishedBlog} from '@/lib/blog-public';

// Renders nothing for a missing keyword or no genuinely published matches.
export default async function RelatedSearchPosts({term,locale}:{term:string;locale:string}){
 const keyword=term.trim();
 if(keyword.length<2||keyword.length>90)return null;
 let posts:Awaited<ReturnType<typeof listPublishedBlog>>['items']=[];
 try{posts=(await listPublishedBlog({q:keyword,locale,page:1})).items.slice(0,6)}
 catch{return null}
 if(posts.length===0)return null;
 const labels={
  ko:{title:'검색어와 관련된 블로그',read:'글 읽기'},
  en:{title:'Related stories',read:'Read story'},
  ja:{title:'検索キーワードに関連する記事',read:'記事を読む'},
  'zh-CN':{title:'与搜索关键词相关的文章',read:'阅读文章'}
 } as const;
 const t=labels[locale as keyof typeof labels]||labels.en;
 return <section className="related-local-posts" aria-label={t.title} data-search-blog>
  <span className="eyebrow">LOCAL STORIES</span><h2>{t.title}</h2>
  <div className="related-post-grid">
   {posts.map(post=><Link className="related-post-card" key={post.id}
    href={'/blog/'+encodeURIComponent(post.slug)+'?hl='+encodeURIComponent(locale)}>
    <strong>{post.title}</strong>
    {post.excerpt&&<p>{post.excerpt}</p>}
    <span className="we-card-visit" style={{alignSelf:'flex-start'}}>{t.read} ↗</span>
   </Link>)}
  </div>
 </section>;
}
