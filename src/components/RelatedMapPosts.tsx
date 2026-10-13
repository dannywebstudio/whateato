import Link from 'next/link';
import {getPool} from '@/lib/db';
type Post={slug:string;title:string;excerpt:string|null;published_at:string};
export default async function RelatedMapPosts({term,locale}:{term:string;locale:string}){
 const q=term.trim();
 if(q.length<2||q.length>100)return null;
 const pool=getPool();if(!pool)return null;
 let posts:Post[]=[];
 try{
  const result=await pool.query<Post>(`SELECT slug,title,excerpt,published_at FROM blog_posts_v1
    WHERE status='published' AND published_at<=now() AND locale=$1
      AND (strpos(lower(title),lower($2))>0 OR strpos(lower(body_text),lower($2))>0)
    ORDER BY published_at DESC LIMIT 6`,[locale,q]);
  posts=result.rows;
 }catch{return null}
 if(posts.length===0)return null;
 const t=locale==='ko'?'관련 맛집 이야기':locale==='en'?'Related local stories':locale==='ja'?'関連するグルメ記事':'相关美食文章';
 return <section className="related-local-posts" aria-label={t}>
  <span className="eyebrow">LOCAL STORIES</span><h2>{t}</h2>
  <div className="related-post-grid">{posts.map(p=><Link className="related-post-card" key={p.slug} href={'/blog/'+encodeURIComponent(p.slug)}>
    <strong>{p.title}</strong>{p.excerpt&&<p>{p.excerpt}</p>}
    <span className="we-card-visit" style={{alignSelf:'flex-start'}}>{locale==='ko'?'글 읽기 ↗':'Read ↗'}</span>
  </Link>)}</div>
 </section>;
}
