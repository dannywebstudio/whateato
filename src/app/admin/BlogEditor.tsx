'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type ChangeEvent,type DragEvent} from 'react';
import {BLOG_LOCALES,BLOG_REQUIRED_LOCALES,BLOG_LOCALE_LABELS,blogLocaleReadiness,publishableBlog,parseBlogDraft,blogCategoryName,type BlogCategoryInfo,type BlogBlock,type BlogLocale,type BlogDraft,type BlogTranslation} from '@/lib/blog-model';
import BlogCategoryManager from './BlogCategoryManager';
import UnifiedBlogEditor from './UnifiedBlogEditor';
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
 if(!response.ok)throw Error(data.error||('HTTP '+response.status));
 return data;
}
const json=(url:string,body:unknown,method='POST')=>api(url,{
 method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)
});
const safeSlug=(s:string)=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90);

export default function BlogEditor({owner}:{owner:boolean}){
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
 const editorRef=useRef<HTMLDivElement|null>(null);
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
  try{const r=await api('/api/v1/owner/catalog?q='+encodeURIComponent(restaurantQuery));
   setRestaurantMatches(r.items||[])}catch(e){error(e)}
 };
 const upload=async()=>{
  if(dirty){setMessage('이미지 업로드 전에 초안을 먼저 저장해.');return}
  if(!current||!file||!rights){setMessage('사진, 출처, 사용권 확인을 입력해.');return}
  setBusy(true);
  try{
   const form=new FormData();
   form.set('file',file);form.set('media_role',imageRole);form.set('alt_text',alt);
   form.set('source_url',source);form.set('rights_reference',rightsRef);
   form.set('rights_confirmation','yes');
   const data=await api('/api/v1/owner/blog/'+current.id+'/media',{method:'POST',body:form});
   setFile(null);setAlt('');setSource('');setRightsRef('');setRights(false);
   setCurrent(p=>p?{...p,images:[...p.images,{id:data.id,media_role:imageRole,
     alt_text:alt||file.name,rights_status:'pending',image_url:data.image_url,
     width:data.width,height:data.height}]}:p);
   window.dispatchEvent(new CustomEvent('whateato-blog-uploaded',{detail:{id:data.id,url:data.image_url}}));
   setMessage('사진 업로드 완료 · 게시 전에 Owner가 사진 권리를 승인해야 해. ('+data.id+')');
  }catch(e){error(e)}finally{setBusy(false)}
 };
 const inspectImage=async(imageId:string,decision:'approve'|'reject'|'hide')=>{
  if(!current)return;
  setBusy(true);
  try{
   await json('/api/v1/owner/blog/'+current.id+'/media/'+imageId,{decision},'PATCH');
   await open(current.id);setMessage('사진 상태를 변경했어. 발행 내용이 바뀌면 다시 발행해.');
  }catch(e){error(e)}finally{setBusy(false)}
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
    <div className={styles.postList}>{posts.filter(p=>!filter||[p.slug,p.title].join(' ').toLowerCase().includes(filter.toLowerCase()))
     .map(p=><button key={p.id} className={styles.postPick} data-selected={p.id===current?.id}
      onClick={()=>void open(p.id)}>
       <strong>{p.title||p.slug}</strong>
       <small>{p.state==='published'?'공개 중':p.state==='review_requested'?'승인 대기':'초안'} · {p.slug}</small>
     </button>)}</div>
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
      <div className={styles.relatedPicker}>
       <h4>관련 식당 연결 (최대 8곳)</h4>
       <div className={styles.searchRow}><input placeholder="상호명 검색" value={restaurantQuery}
          onChange={e=>setRestaurantQuery(e.target.value)}/>
        <button className={styles.smallButton} onClick={()=>void searchRestaurant()}>식당 찾기</button></div>
       <div className={styles.relatedResults}>
        {restaurantMatches.slice(0,8).map(r=><button className={styles.smallButton}
          key={r.id} disabled={draft.related_restaurant_ids.includes(r.id)||draft.related_restaurant_ids.length>=8}
          onClick={()=>update({related_restaurant_ids:[...draft.related_restaurant_ids,r.id]})}>
          + {r.name_ko} · {r.road_address_ko||'주소 미확인'}</button>)}
       </div>
       <div className={styles.relatedResults}>{draft.related_restaurant_ids.map(id=>
        <button className={styles.selectedRelated} key={id} onClick={()=>
          update({related_restaurant_ids:draft.related_restaurant_ids.filter(v=>v!==id)})}>
          {restaurantMatches.find(r=>r.id===id)?.name_ko||id} ×</button>)}</div>
      </div>
     </div>
     <section className={styles.blockArea}>
      <div className={styles.editorSubhead}><h4>통합 글쓰기</h4><button className={styles.smallButton} onClick={()=>setPreview(x=>!x)}>{preview?'편집 화면':'미리보기'}</button></div>
      {preview?<BlogBody blocks={translation.blocks} preview/>:
       <UnifiedBlogEditor key={current.id+locale} articleId={current.id} locale={locale}
        translation={translation} images={current.images}
        onChange={patch=>updateTranslation(patch)}
        onChooseFile={incoming=>{setFile(incoming);setImageRole('inline');setMessage('본문용 사진을 선택했어. 아래에서 출처와 사용권을 확인하고 업로드해.')}}/>}
     </section>
     <section className={styles.mediaPanel}>
      <h4>블로그 사진 관리</h4>
      <div className={styles.photoDrop}
        onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()}}
        onDrop={e=>{
          if(!e.dataTransfer.files.length)return;
          e.preventDefault();
          const incoming=e.dataTransfer.files[0];
          if(!['image/jpeg','image/png','image/webp'].includes(incoming.type)){
           setMessage('JPG, PNG 또는 WebP만 사용할 수 있어.');return;
          }
          setFile(incoming);setMessage('사진이 선택됐어. 사용권 출처와 설명을 입력한 뒤 업로드해.');
        }}>
        <span aria-hidden="true">📷</span>
        <strong>사진을 여기로 끌어다 놓아도 돼</strong>
        <span>{file?'선택된 사진: '+file.name:'또는 아래에서 파일 선택'}</span>
      </div>
      <p>대표사진 권장 1200×810px · 본문 사진 권장 1400×1100px · JPEG/PNG/WebP 최대 8MB.
       파일은 비공개로 올라가고 사용권 검수 후 발행할 수 있어.</p>
      <div className={styles.twoCols}>
       <label>사진 유형<select value={imageRole}
         onChange={e=>setImageRole(e.target.value as 'cover'|'inline')}>
         <option value="cover">글 카드 대표사진 · 1200×810</option>
         <option value="inline">본문 삽입 사진 · 최대 1400×1100</option></select></label>
       <label>사진 파일<input type="file" accept="image/jpeg,image/png,image/webp"
         onChange={(e:ChangeEvent<HTMLInputElement>)=>setFile(e.target.files?.[0]||null)}/></label>
       <label>사진 설명(대체텍스트)<input value={alt} maxLength={180}
         onChange={e=>setAlt(e.target.value)}/></label>
       <label>사진 원본 출처 HTTPS<input value={source} type="url"
         onChange={e=>setSource(e.target.value)}/></label>
       <label>사진 게시권한 근거 HTTPS<input value={rightsRef} type="url"
         onChange={e=>setRightsRef(e.target.value)}/></label>
      </div>
      <label className={styles.check}><input type="checkbox" checked={rights}
        onChange={e=>setRights(e.target.checked)}/> 사진 사용권과 출처를 확인했어.</label>
      <button className={styles.smallButton} disabled={busy||!file||!rights}
       onClick={()=>void upload()}>비공개 사진 업로드</button>
      <div className={styles.mediaGrid}>{current.images.map(m=><div key={m.id} className={styles.mediaItem}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={m.image_url} alt={m.alt_text} loading="lazy"/>
        <strong>{m.alt_text}</strong>
        <small>{m.media_role==='cover'?'카드 대표사진':'본문 사진'} · {m.width}×{m.height}</small>
        <small>{m.rights_status==='approved'?'게시권 승인':m.rights_status==='pending'?'승인 대기':'비공개'}</small>
        {owner&&<div className={styles.actions}>
         {m.rights_status==='pending'&&<>
          <button onClick={()=>void inspectImage(m.id,'approve')}>승인</button>
          <button onClick={()=>void inspectImage(m.id,'reject')}>거절</button>
         </>}
         {m.rights_status==='approved'&&<button onClick={()=>void inspectImage(m.id,'hide')}>공개 차단</button>}
        </div>}
      </div>)}</div>
     </section>
    </>}
   </section>
  </div>
 </div>;
}
