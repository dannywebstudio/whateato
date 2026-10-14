import Link from 'next/link';
import type {Metadata} from 'next';
import {listPublishedBlog} from '@/lib/blog-public';
import {getBlogCategories,blogCategoryGroups,blogCategoryName} from '@/lib/blog-categories';
import styles from './blog.module.css';
import BlogStoryCard from '@/components/BlogStoryCard';
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
 const labels={
  en:{all:'All Stories',search:'Search',placeholder:'Search stories, places or topics...',latest:'Latest Stories',results:'Search results',everything:'All',empty:'Our first stories are being prepared. Check back soon.',notFound:'No matching stories yet. Try another keyword.',previous:'← Previous',next:'More stories →'},
  ko:{all:'전체',search:'검색',placeholder:'블로그 글, 여행지, 키워드 검색...',latest:'최신 글',results:'검색 결과',everything:'전체',empty:'첫 번째 이야기를 준비하고 있어요. 곧 찾아올게요.',notFound:'검색된 글이 없어요. 다른 키워드로 검색해 보세요.',previous:'← 이전',next:'더 보기 →'},
  ja:{all:'すべて',search:'検索',placeholder:'記事・地域・キーワードを検索...',latest:'最新記事',results:'検索結果',everything:'すべて',empty:'最初の記事を準備しています。もうしばらくお待ちください。',notFound:'記事が見つかりませんでした。別のキーワードでお試しください。',previous:'← 前へ',next:'もっと見る →'},
  'zh-CN':{all:'全部',search:'搜索',placeholder:'搜索文章、地区或关键词...',latest:'最新文章',results:'搜索结果',everything:'全部',empty:'我们正在准备第一批文章，敬请期待。',notFound:'没有找到相关文章，请尝试其他关键词。',previous:'← 上一页',next:'查看更多 →'}
 } as const;
 const t=labels[locale];
 const openRoot=groups.find(root=>root.slug===selectedParent);
 const showSidebar=Boolean(openRoot&&openRoot.children.length);
 return <main className={styles.blogPage}>
   <form action="/blog" method="get" className={'search-form '+styles.blogSearch} role="search">
     <input type="hidden" name="hl" value={locale}/>
     {category&&<input type="hidden" name="category" value={category}/>}
     <div className="searchfield">
       <span aria-hidden="true">⌕</span>
       <input name="q" type="text" defaultValue={q} maxLength={90}
         placeholder={t.placeholder} aria-label={t.search}/>
       <button aria-label={t.search} type="submit">→</button>
     </div>
   </form>
   <nav aria-label="Blog main categories" className={styles.mainCategories}>
     <Link className={styles.mainCategory} data-active={!category} href={url(1,'')}
       aria-current={!category?'page':undefined}>{t.all}</Link>
     {groups.map(root=><Link key={root.slug} href={url(1,root.slug)}
       className={styles.mainCategory} data-active={selectedParent===root.slug}
       aria-current={category===root.slug?'page':undefined}>
       {blogCategoryName(root,locale)}
     </Link>)}
   </nav>
   <div className={showSidebar?styles.blogLayoutWithSidebar:styles.blogLayout}>
     {showSidebar&&openRoot&&<aside className={styles.categorySidebar}>
       <div className={styles.sidebarTitle}>{blogCategoryName(openRoot,locale)}</div>
       <nav aria-label={blogCategoryName(openRoot,locale)+' subcategories'}
         className={styles.sidebarItems}>
         <Link href={url(1,openRoot.slug)}
           className={styles.sidebarItem} data-active={category===openRoot.slug}
           aria-current={category===openRoot.slug?'page':undefined}>
           {t.everything} {blogCategoryName(openRoot,locale)}
         </Link>
         {openRoot.children.map(child=><Link key={child.slug} href={url(1,child.slug)}
           className={styles.sidebarItem} data-active={category===child.slug}
           aria-current={category===child.slug?'page':undefined}>
           {blogCategoryName(child,locale)}
         </Link>)}
       </nav>
     </aside>}
     <section className={styles.storyContent}>
   <div className={styles.sectionTitle}>
     <h2>{q?t.results:category?(blogCategoryName(selectedCategory,locale)):t.latest}</h2>
   </div>
   {result.items.length?<div className={styles.cards}>
      {result.items.map(item=><BlogStoryCard key={item.id} story={item} locale={locale}
        categoryLabel={blogCategoryName(categories.find(c=>c.slug===item.category),locale)}/>)}
    </div>:<div className={styles.empty}>
       <p>{q?t.notFound:t.empty}</p>
    </div>}
   <div className={styles.pagination}>
     {page>1&&<Link href={url(page-1)}>{t.previous}</Link>}
     {result.more&&<Link href={url(page+1)}>{t.next}</Link>}
   </div>
     </section>
   </div>
 </main>;
}
