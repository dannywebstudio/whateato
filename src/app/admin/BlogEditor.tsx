'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type ChangeEvent,type DragEvent} from 'react';
import {BLOG_LOCALES,BLOG_REQUIRED_LOCALES,BLOG_LOCALE_LABELS,blogLocaleReadiness,publishableBlog,parseBlogDraft,blogCategoryName,type BlogCategoryInfo,type BlogBlock,type BlogLocale,type BlogDraft,type BlogTranslation} from '@/lib/blog-model';
import BlogCategoryManager from './BlogCategoryManager';
import UnifiedBlogEditor from './UnifiedBlogEditor';
import BlogMediaLibrary from './BlogMediaLibrary';
import {BlogBody} from '@/components/BlogBody';
import styles from './blog-editor.module.css';

type BlogRow={id:string;slug:string;revision:number;category:string;title:string;state:string;updated_at:string};
type BlogImage={id:string;media_role:'cover'|'inline';alt_text:string;rights_status:string;
 image_url:string;width:number;height:number};
type Detail={id:string;slug:string;revision:number;category:BlogDraft['category'];tags:string[];
 related_restaurant_ids:string[];translations:BlogDraft['translations'];
 review_requested_at:string|null;published_revision:number|null;is_visible:boolean|null;
 images:BlogImage[]};
const blankLocale=():BlogTranslation=>({title:'',excerpt:'',seo_title:'',seo_description:'',blocks:[]});
const emptyDraft=():BlogDraft=>({category:'restaurants',tags:[],related_restaurant_ids:[],
 translations:{en:blankLocale()}});
const newBlock=(type:BlogBlock['type']):BlogBlock=>{
 const id=crypto.randomUUID();
 if(type==='heading')return {id,type,level:2,text:''};
 if(type==='paragraph'||type==='quote')return {id,type,text:''};
 if(type==='list')return {id,type,items:['']};
 if(type==='table')return {id,type,rows:[['Column 1','Column 2'],['','']]};
 if(type==='image')return {id,type,image_id:'',caption:''};
 return {id,type};
};
async function api(url:string,init:RequestInit={}):Promise<any>{
 const response=await fetch(url,{credentials:'same-origin',cache:'no-store',...init});
 const data=await response.json().catch(()=>({error:'invalid_response'}));
 if(!response.ok)throw Error([data.error,data.reason].filter(Boolean).join(' · ')||('HTTP '+response.status));
 return data;
}
const json=(url:string,body:unknown,method='POST')=>api(url,{
 method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
});
const safeSlug=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);

export default function BlogEditor({owner,initialSlug=''}:{owner:boolean;initialSlug?:string}){
 const [posts,setPosts]=useState<BlogRow[]>([]);
 const [categories,setCategories]=useState<BlogCategoryInfo[]>([]);
 const [current,setCurrent]=useState<Detail|null>(null);
 const [draft,setDraft]=useState<BlogDraft>(emptyDraft);
 const [locale,setLocale]=useState<BlogLocale>('en');
 const [slug,setSlug]=useState('');const [filter,setFilter]=useState('');
 const [tagsText,setTagsText]=useState('');const [restaurantQuery,setRestaurantQuery]=useState('');
 const [restaurantMatches,setRestaurantMatches]=useState<{id:string;name_ko:string;road_address_ko:string|null}[]>([]);
 const [preview,setPreview]=useState(false);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const [dirty,setDirty]=useState(false);
 const [assistantPackage,setAssistantPackage]=useState('');
 const [dragged,setDragged]=useState<string|null>(null);
 const [file,setFile]=useState<File|null>(null);const [imageRole,setImageRole]=useState<'cover'|'inline'>('cover');
 const [alt,setAlt]=useState('');const [source,setSource]=useState('');const [rightsRef,setRightsRef]=useState('');
 const [rights,setRights]=useState(false);
 const [showPublished,setShowPublished]=useState(false);
 const editorRef=useRef<HTMLDivElement|null>(null);
 const didAutoOpen=useRef(false);
 const translation=draft.translations[locale]||blankLocale();
 const readiness=BLOG_REQUIRED_LOCALES.map(lang=>({
  locale:lang,...blogLocaleReadiness(draft,lang)
 }));
 const readyCount=readiness.filter(item=>item.ready).length;
 const readyToPublish=publishableBlog(draft)===null;
 const error=(e:unknown)=>setMessage(e instanceof Error?e.message:String(e));
 const refreshCategories=useCallback(async()=>{
   const response=await api('/api/v1/owner/blog/categories');
   setCategories(response.items||[]);
 },[]);
 const refresh=useCallback(async()=>{
  const data=await api('/api/v1/owner/blog');
  setPosts(data.items||[]);
 },[]);
 useEffect(()=>{void refresh().catch(error);void refreshCategories().catch(error)},[refresh,refreshCategories]);
 useEffect(()=>{
  if(didAutoOpen.current||!initialSlug)return;
  didAutoOpen.current=true;
  void api('/api/v1/owner/blog?q='+encodeURIComponent(initialSlug))
   .then(data=>{
    const match=(data.items as BlogRow[]).find(post=>post.slug===initialSlug);
    if(!match){setMessage('편집할 글을 찾지 못했어.');return}
    setShowPublished(true);
    void open(match.id,true);
   }).catch(error);
 },[initialSlug]);
 const open=async(id:string,ignoreDirty=false)=>{
  if(dirty&&!ignoreDirty&&!window.confirm('저장되지 않은 수정 사항이 있어. 이동할까?'))return;
  setBusy(true);setMessage('');
  try{
   const {article}: {article:Detail}=await api('/api/v1/owner/blog/'+id);
   setCurrent(article);
   setDraft({category:article.category,tags:article.tags||[],
    related_restaurant_ids:article.related_restaurant_ids||[],
    translations:article.translations||{en:blankLocale()}});
   setTagsText((article.tags||[]).join(', '));setLocale('en');setDirty(false);setPreview(false);
  }catch(e){error(e)}finally{setBusy(false)}
 };
 const deleteDraft=async(post:BlogRow)=>{
  if(!owner){setMessage('초안 삭제는 Owner만 가능해.');return}
  const published=post.state==='published';
  const label=published?'발행된 게시글':'초안';
  if(!window.confirm(label+' '+post.slug+'와 첨부 사진을 영구 삭제할까? 발행된 URL도 사라지고 복구할 수 없어.'))return;
  if(published&&window.prompt('발행된 글을 영구 삭제하려면 DELETE를 입력해.')!=='DELETE')return;
  setBusy(true);
  try{
   await api('/api/v1/owner/blog/'+post.id,{method:'DELETE',headers:{'x-whateato-confirm-delete':post.id}});
   if(current?.id===post.id){setCurrent(null);setDirty(false)}
   await refresh();setMessage(label+'을 삭제했어.');
  }catch(e){error(e)}finally{setBusy(false)}
 };
 const create=async()=>{
  const nextSlug=safeSlug(slug)||'new-story-'+Date.now().toString(36);
  if(nextSlug.length<3){setMessage('영문 주소를 3자 이상 입력해.');return}
  setBusy(true);
  try{
   const made=await json('/api/v1/owner/blog',{slug:nextSlug});
   setDirty(false);await refresh();await open(made.id,true);setSlug('');
   setMessage('새 글 초안을 만들었어. 제목과 본문을 작성해.');
  }catch(e){error(e);if(e instanceof Error&&e.message==='slug_already_exists')setMessage('이미 사용 중인 주소야. 다른 주소를 입력해.')}finally{setBusy(false)}
 };
 const update=(patch:Partial<BlogDraft>)=>{setDraft(p=>({...p,...patch}));setDirty(true)};
 const updateTranslation=(patch:Partial<BlogTranslation>)=>{
  setDraft(p=>({...p,translations:{...p.translations,[locale]:{
   ...(p.translations[locale]||blankLocale()),...patch
  }}}));setDirty(true);
 };
 const setBlocks=(blocks:BlogBlock[])=>updateTranslation({blocks});
 const changeBlock=(id:string,patch:Partial<BlogBlock>)=>
   setBlocks(translation.blocks.map(b=>b.id===id?{...b,...patch} as BlogBlock:b));
 const shift=(id:string,to:number)=>{
  const arr=[...translation.blocks],at=arr.findIndex(b=>b.id===id);
  if(at<0||to<0||to>=arr.length||to===at)return;
  arr.splice(to,0,...arr.splice(at,1));setBlocks(arr);
 };
 const addBlock=(type:BlogBlock['type'])=>{
  const block=newBlock(type);setBlocks([...translation.blocks,block]);
 };
 const save=async()=>{
  if(!current)return;
  setBusy(true);setMessage('');
  try{
   const tags=tagsText.split(',').map(s=>s.trim().toLowerCase().replace(/[^a-z0-9-]/g,'-'))
    .filter(Boolean).slice(0,8);
   const normalized={...draft,tags:[...new Set(tags)]};
   const r=await json('/api/v1/owner/blog/'+current.id,{
    expected_revision:current.revision,draft:normalized},'PUT');
   setCurrent({...current,revision:r.revision,review_requested_at:null});
   setDraft(normalized);setTagsText(normalized.tags.join(', '));setDirty(false);
   await refresh();setMessage('초안 저장 완료 · 공개 글은 변경되지 않았어.');
  }catch(e){error(e)}finally{setBusy(false)}
 };
 const action=async(name:'submit'|'publish'|'unpublish')=>{
  if(!current)return;
  if(dirty){setMessage('저장되지 않은 수정 사항이 있어. 먼저 초안을 저장해.');return}
  if(name==='unpublish'&&!window.confirm('공개된 글을 숨길까? 초안은 보존돼.'))return;
  setBusy(true);setMessage('');
  try{
   await json('/api/v1/owner/blog/'+current.id+'/actions',{
     action:name,expected_revision:current.revision});
   await open(current.id);await refresh();
   setMessage(name==='submit'?'4개 언어 검수 요청 완료':name==='publish'?
    '한국어·영어·일본어·중국어 4개 언어가 함께 발행됐어.':'블로그 공개가 중단됐어.');
  }catch(e){error(e)}finally{setBusy(false)}
 };
 const importPreparedArticle=()=>{
  if(assistantPackage.length<10||assistantPackage.length>180000){
   setMessage('JSON 원고 패키지는 10~180,000자여야 해.');return;
  }
  if(dirty&&!window.confirm('현재 작성 중인 저장되지 않은 내용을 원고 패키지로 덮어쓸까?'))return;
  try{
   const candidate:unknown=JSON.parse(assistantPackage);
   const parsed=parseBlogDraft(candidate);
   if(!parsed){setMessage('원고 구조 오류: category, tags, related_restaurant_ids, translations(en/ko/ja/zh-CN)와 본문 블록 형식을 확인해.');return}
   if(!categories.some(cat=>cat.slug===parsed.category&&cat.is_active)){
    setMessage('현재 사용할 수 없는 카테고리야. 카테고리 관리에서 활성화된 분류를 선택해.');return;
   }
   setDraft(parsed);setTagsText(parsed.tags.join(', '));
   setLocale('en');setPreview(false);setDirty(true);
   setMessage(publishableBlog(parsed)?'원고를 가져왔어. 누락된 언어와 SEO 정보를 마무리한 뒤 초안 저장해.':
      '한국어·영어·일본어·중국어 원고를 한 번에 가져왔어. 내용 확인 후 초안 저장해.');
   setAssistantPackage('');
  }catch{
   setMessage('JSON 원고 패키지 구문 오류야. JSON 형식을 확인해.');
  }
 };
 const searchRestaurant=async()=>{
  try{
   // Only public venues that the Map focus endpoint can actually display.
   const result=await api('/api/v1/restaurants?q='+encodeURIComponent(restaurantQuery)+'&hl='+encodeURIComponent(locale)+'&limit=30');
   const candidates=(result.items||[]) as {id:string;name_ko:string;name:string;address_ko:string|null;address:string|null}[];
   const checked=await Promise.all(candidates.map(async item=>{
    try{
     const response=await fetch('/api/v1/map/focus?id='+encodeURIComponent(item.id)+'&hl='+encodeURIComponent(locale),{cache:'no-store'});
     if(!response.ok)return null;
     const data=await response.json();
     return data.focus_id===item.id&&data.items?.[0]?.id===item.id?{id:item.id,name_ko:item.name||item.name_ko,road_address_ko:item.address||item.address_ko}:null;
    }catch{return null}
   }));
   setRestaurantMatches(checked.filter((item):item is {id:string;name_ko:string;road_address_ko:string|null}=>item!==null).slice(0,12));
  }catch(e){setRestaurantMatches([]);error(e)}
 };
 const upload=async(incoming?:File)=>{
  const chosenFile=incoming||file;
  const chosenRole=incoming?'inline':imageRole;
  if(!current||!chosenFile){const msg='먼저 게시글 초안을 만들고 사진을 선택해 줘.';setMessage(msg);throw Error(msg)}
  const articleId=current.id;
  setBusy(true);setMessage('');
  try{
   const form=new FormData();
   form.set('file',chosenFile);
   form.set('media_role',chosenRole);
   form.set('alt_text',(alt.trim().length>=3?alt.trim():chosenFile.name.slice(0,170)).padEnd(3,'_'));
   const data=await api('/api/v1/owner/blog/'+articleId+'/media',{method:'POST',body:form});
   if(!data.id||!data.image_url)throw Error('업로드 결과에 사진 ID 또는 주소가 없어. 다시 시도해 줘.');
   // Do not report success until the server can actually serve the saved photo.
   const photoResponse=await fetch(data.image_url,{credentials:'same-origin',cache:'no-store'});
   if(!photoResponse.ok||!photoResponse.headers.get('content-type')?.startsWith('image/'))
    throw Error('사진은 저장됐지만 이미지 조회에 실패했어. 서버 스토리지 설정을 확인해 줘. (HTTP '+photoResponse.status+')');
   const result=await api('/api/v1/owner/blog/'+articleId);
   const article=result.article as Detail;
   if(!article.images.some(image=>image.id===data.id))throw Error('사진 저장 후 목록 조회에 반영되지 않았어.');
   setCurrent(previous=>previous?.id===articleId?{...previous,images:article.images}:previous);
   setFile(null);
   window.dispatchEvent(new CustomEvent('whateato-blog-uploaded',{detail:{id:data.id,url:data.image_url}}));
   setMessage('사진이 저장되고 라이브러리에 반영됐어.');
  }catch(e){
   const message=e instanceof Error?e.message:String(e);
   setMessage('사진 업로드 오류: '+message);
   window.dispatchEvent(new CustomEvent('whateato-blog-upload-failed',{detail:{message}}));
   throw e;
  }finally{setBusy(false)}
 };
 const inspectImage=async(imageId:string,decision:'approve'|'reject'|'hide')=>{
  if(!current)return;
  setBusy(true);
  try{
   await json('/api/v1/owner/blog/'+current.id+'/media/'+imageId,{decision},'PATCH');
   await open(current.id);setMessage('사진 상태를 변경했어. 발행 내용이 바뀌면 다시 발행해.');
  }catch(e){error(e)}finally{setBusy(false)}
 };
 const deleteLibraryImage=async(image:BlogImage)=>{
  if(!current||!owner)return;
  if(JSON.stringify(draft.translations).includes(image.id))throw Error('현재 편집 중인 글에서 이 사진을 먼저 제거하고 초안을 저장해 줘.');
  const articleId=current.id;
  await api('/api/v1/owner/blog/'+articleId+'/media/'+image.id,{method:'DELETE',headers:{'x-whateato-confirm-delete':image.id}});
  setCurrent(previous=>previous?.id===articleId?{...previous,images:previous.images.filter(item=>item.id!==image.id)}:previous);
  setMessage('사용되지 않는 사진을 라이브러리에서 삭제했어.');
 };
 const applyInline=(marker:'bold'|'italic'|'link')=>{
  const area=document.activeElement;
  if(!(area instanceof HTMLTextAreaElement))return;
  const id=area.dataset.blogBlockId;
  const b=translation.blocks.find(x=>x.id===id);
  if(!id||!b||typeof b.text!=='string')return;
  const start=area.selectionStart,end=area.selectionEnd;
  const selected=b.text.slice(start,end)||'text';
  const formatted=marker==='link'?'['+selected+'](https://example.com)':
    marker==='bold'?'**'+selected+'**':'*'+selected+'*';
  changeBlock(id,{text:b.text.slice(0,start)+formatted+b.text.slice(end)});
 };
 const onDrop=(target:string,e:DragEvent<HTMLElement>)=>{
  e.preventDefault();
  if(!dragged||dragged===target)return;
  shift(dragged,translation.blocks.findIndex(b=>b.id===target));setDragged(null);
 };
 return <div className={styles.blogCms} ref={editorRef}>
  <div className={styles.heading}>
   <div><span>WHATEATO · EDITORIAL CMS</span><h2>블로그 콘텐츠 관리</h2>
    <p>4개 언어 동시 발행 · 한국어 / English (US) / 日本語 / 简体中文</p></div>
   <Link href="/blog" target="_blank" rel="noopener noreferrer">공개 블로그 ↗</Link>
  </div>
  {message&&<p className={styles.notification} role="status">{message}</p>}
  <BlogCategoryManager items={categories} owner={owner} onChanged={refreshCategories}/>
  <div className={styles.workspace}>
   <aside className={styles.sidebar}>
    <h3>새 글 작성</h3>
    <label>고유 주소 (영문·숫자·하이픈)<input value={slug}
      onChange={e=>setSlug(e.target.value)} placeholder="best-food-in-myeongdong"/></label>
    <button className={styles.greenButton} disabled={busy} onClick={()=>void create()}>+ 새 글 초안 만들기</button>
    <div className={styles.sidebarDivider}/>
    <h3>작성된 글</h3>
    <input value={filter} placeholder="슬러그/제목 찾기" onChange={e=>setFilter(e.target.value)}/>
    <button className={styles.smallButton} onClick={()=>void refresh().catch(error)}>목록 새로고침</button>
    <label className={styles.check}><input type="checkbox" checked={showPublished} onChange={e=>setShowPublished(e.target.checked)}/> 발행 완료 글 표시</label>
    <div className={styles.postList}>{posts.filter(p=>(showPublished||p.state!=='published')&&(!filter||[p.slug,p.title].join(' ').toLowerCase().includes(filter.toLowerCase())))
      .map(p=><div className={styles.postPickRow} key={p.id}>
       <button className={styles.postPick} data-selected={p.id===current?.id} onClick={()=>void open(p.id)}>
        <strong>{p.title||p.slug}</strong><small>{p.state==='published'?'공개 중':p.state==='review_requested'?'승인 대기':'초안'} · {p.slug}</small>
       </button>
       {owner&&<button type="button" className={styles.postDelete} disabled={busy}
         onClick={()=>void deleteDraft(p)} aria-label={p.slug+' 영구 삭제'}>삭제</button>}
      </div>)}</div>
    {current&&<div className={styles.sidebarMedia}><BlogMediaLibrary images={current.images} disabled={!owner||busy} onUpload={async image=>{await upload(image)}} onDelete={deleteLibraryImage}/></div>}
   </aside>
   <section className={styles.mainPanel}>
    {!current?<div className={styles.blank}>왼쪽에서 기존 글을 선택하거나 새 글을 생성해.</div>:<>
     <div className={styles.editorHead}>
      <div><span className={styles.postSlug}>/blog/{current.slug}</span>
       <h3>{translation.title||'새 블로그 글'}</h3>
       <small>초안 v{current.revision}{current.published_revision?' · 공개 v'+current.published_revision:''}
       {current.review_requested_at?' · 검수 요청됨':''}</small></div>
      <div className={styles.actions}>
       <button disabled={busy||!dirty} className={styles.greenButton} onClick={()=>void save()}>
        {busy?'처리 중…':'초안 저장'}</button>
       <button disabled={busy||dirty||!readyToPublish} className={styles.smallButton}
         onClick={()=>void action('submit')}>4개 언어 검수 요청</button>
       {owner&&<button disabled={busy||dirty||!current.review_requested_at||!readyToPublish}
         className={styles.publishButton} onClick={()=>void action('publish')}>4개 언어 동시 발행</button>}
       {owner&&current.is_visible&&<button disabled={busy} className={styles.dangerButton}
         onClick={()=>void action('unpublish')}>공개 중단</button>}
      </div>
     </div>
     <details className={styles.assistantImport}>
      <summary>ChatGPT 작성 원고 4개 언어 한번에 가져오기</summary>
      <p>내가 작성한 JSON 원고 패키지 한 개를 붙여넣으면 네 언어의 제목·본문·SEO가 동시에 편집기에 채워져.
      자동 발행하지 않고, 초안 저장 → 검수 → Owner 승인 단계를 그대로 거쳐.</p>
      <textarea rows={6} maxLength={180000} value={assistantPackage}
       placeholder={'{"category":"restaurants","tags":[],"related_restaurant_ids":[],"translations":{"en":{...},"ko":{...},"ja":{...},"zh-CN":{...}}}'}
       onChange={e=>setAssistantPackage(e.target.value)}/>
      <button type="button" className={styles.smallButton}
       onClick={importPreparedArticle} disabled={busy||!assistantPackage.trim()}>
       4개 언어 원고 가져오기
      </button>
     </details>
     <div className={styles.languageReadiness} aria-label="언어별 발행 준비 상태">
      <div className={styles.readinessTitle}>
       <strong>4개 언어 동시 발행 준비</strong>
       <span>{readyCount} / 4 준비 완료</span>
      </div>
      <div className={styles.readinessItems}>
       {readiness.map(item=><button key={item.locale} type="button"
        aria-pressed={locale===item.locale} data-ready={item.ready}
        onClick={()=>setLocale(item.locale)}>
        <span aria-hidden="true">{item.ready?'✓':'○'}</span>
        {BLOG_LOCALE_LABELS[item.locale]}
        <span className={styles.readinessStatus}>{item.ready?'완료':'작성 필요'}</span>
       </button>)}
      </div>
      {!readyToPublish&&<p>
       모든 언어의 제목·요약·본문·SEO 정보와 소제목을 작성하면 검수 요청이 활성화돼.
       영어는 미국 방문객을 포함하는 동일한 버전이야.
      </p>}
     </div>
     <div className={styles.languageTabs} role="group" aria-label="작성 언어">
      {BLOG_LOCALES.map(l=><button key={l} aria-pressed={locale===l}
       data-complete={readiness.find(item=>item.locale===l)?.ready}
       onClick={()=>setLocale(l)}>{BLOG_LOCALE_LABELS[l]}
       {readiness.find(item=>item.locale===l)?.ready?' ✓':''}</button>)}
     </div>
     <div className={styles.details}>
      <label>포스팅 제목 (블로그 목록·상세에 표시)
       <input value={translation.title} maxLength={140}
        onChange={e=>updateTranslation({title:e.target.value})} placeholder="독자가 보게 될 글 제목을 입력해"/></label>
      <label>짧은 소개 (글 목록·검색에 표시) <textarea value={translation.excerpt}
        maxLength={320} rows={3} onChange={e=>updateTranslation({excerpt:e.target.value})}/></label>
      <div className={styles.twoCols}>
       <label>SEO 제목 <input maxLength={160} value={translation.seo_title}
         onChange={e=>updateTranslation({seo_title:e.target.value})}/></label>
       <label>SEO 설명 <input maxLength={200} value={translation.seo_description}
         onChange={e=>updateTranslation({seo_description:e.target.value})}/></label>
      </div>
      <div className={styles.twoCols}>
       <label>카테고리 <select value={draft.category}
         onChange={e=>update({category:e.target.value})}>
         {!categories.some(cat=>cat.slug===draft.category&&cat.is_active)&&
            <option value={draft.category}>{draft.category} · 비활성 (다른 분류 선택)</option>}
         {categories.filter(cat=>cat.is_active&&!cat.parent_slug)
           .sort((a,b)=>a.position-b.position||a.slug.localeCompare(b.slug))
           .map(root=><optgroup key={root.slug} label={blogCategoryName(root,'ko')}>
             <option value={root.slug}>{blogCategoryName(root,'ko')} (전체)</option>
             {categories.filter(cat=>cat.is_active&&cat.parent_slug===root.slug)
               .sort((a,b)=>a.position-b.position||a.slug.localeCompare(b.slug))
               .map(child=><option key={child.slug} value={child.slug}>
                 └ {blogCategoryName(child,'ko')}
               </option>)}
           </optgroup>)}
       </select></label>
       <label>태그 (쉼표 구분, 최대 8개)<input value={tagsText} onChange={e=>{
         setTagsText(e.target.value);setDirty(true)}} placeholder="seoul, korean-bbq, solo-dining"/></label>
      </div>
     </div>
     <div className={styles.blogWritingLayout}>
     <section className={styles.blockArea}>
      <div className={styles.editorSubhead}><h4>통합 글쓰기</h4><button className={styles.smallButton} onClick={()=>setPreview(x=>!x)}>{preview?'편집 화면':'미리보기'}</button></div>
      {preview?<BlogBody blocks={translation.blocks} locale={locale} preview/>:
       <UnifiedBlogEditor key={current.id+locale} articleId={current.id} locale={locale}
        translation={translation} images={current.images}
        onChange={patch=>updateTranslation(patch)}
        restaurantQuery={restaurantQuery} onRestaurantQuery={setRestaurantQuery}
        restaurantMatches={restaurantMatches} onRestaurantSearch={()=>void searchRestaurant()}
        onRestaurantInsert={id=>{if(!draft.related_restaurant_ids.includes(id)&&draft.related_restaurant_ids.length<8)update({related_restaurant_ids:[...draft.related_restaurant_ids,id]})}}
        onChooseFile={incoming=>{setFile(incoming);setImageRole('inline');void upload(incoming).catch(()=>{})}}/>}
     </section>
     </div>
    </>}
   </section>
  </div>
 </div>;
}
