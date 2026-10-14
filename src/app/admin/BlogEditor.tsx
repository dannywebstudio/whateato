'use client';
import Link from 'next/link';
import {useCallback,useEffect,useRef,useState,type ChangeEvent,type DragEvent} from 'react';
import {BLOG_CATEGORIES,BLOG_LOCALES,type BlogBlock,type BlogLocale,type BlogDraft,type BlogTranslation} from '@/lib/blog-model';
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
const emptyDraft=():BlogDraft=>({category:'food-guides',tags:[],related_restaurant_ids:[],
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
 const [current,setCurrent]=useState<Detail|null>(null);
 const [draft,setDraft]=useState<BlogDraft>(emptyDraft);
 const [locale,setLocale]=useState<BlogLocale>('en');
 const [slug,setSlug]=useState('');const [filter,setFilter]=useState('');
 const [tagsText,setTagsText]=useState('');const [restaurantQuery,setRestaurantQuery]=useState('');
 const [restaurantMatches,setRestaurantMatches]=useState<{id:string;name_ko:string;road_address_ko:string|null}[]>([]);
 const [preview,setPreview]=useState(false);
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const [dirty,setDirty]=useState(false);
 const [dragged,setDragged]=useState<string|null>(null);
 const [file,setFile]=useState<File|null>(null);const [imageRole,setImageRole]=useState<'cover'|'inline'>('cover');
 const [alt,setAlt]=useState('');const [source,setSource]=useState('');const [rightsRef,setRightsRef]=useState('');
 const [rights,setRights]=useState(false);
 const editorRef=useRef<HTMLDivElement|null>(null);
 const translation=draft.translations[locale]||blankLocale();
 const error=(e:unknown)=>setMessage(e instanceof Error?e.message:String(e));
 const refresh=useCallback(async()=>{
  const data=await api('/api/v1/owner/blog');
  setPosts(data.items||[]);
 },[]);
 useEffect(()=>{void refresh().catch(error)},[refresh]);
 const open=async(id:string)=>{
  if(dirty&&!window.confirm('저장되지 않은 수정 사항이 있어. 이동할까?'))return;
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
  if(!safeSlug(slug)||safeSlug(slug).length<3){setMessage('영문 슬러그를 3자 이상 입력해.');return}
  setBusy(true);
  try{
   const made=await json('/api/v1/owner/blog',{slug:safeSlug(slug)});
   setDirty(false);await refresh();await open(made.id);setSlug('');
   setMessage('새 글 초안을 만들었어. 제목과 본문을 작성해.');
  }catch(e){error(e)}finally{setBusy(false)}
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
   setMessage(name==='submit'?'검수 요청 완료':name==='publish'?
    '발행 완료 · 공개 블로그에서 볼 수 있어.':'블로그 공개가 중단됐어.');
  }catch(e){error(e)}finally{setBusy(false)}
 };
 const searchRestaurant=async()=>{
  try{const r=await api('/api/v1/owner/catalog?q='+encodeURIComponent(restaurantQuery));
   setRestaurantMatches(r.items||[])}catch(e){error(e)}
 };
 const upload=async()=>{
  if(!current||!file||!rights){setMessage('사진, 출처, 사용권 확인을 입력해.');return}
  setBusy(true);
  try{
   const form=new FormData();
   form.set('file',file);form.set('media_role',imageRole);form.set('alt_text',alt);
   form.set('source_url',source);form.set('rights_reference',rightsRef);
   form.set('rights_confirmation','yes');
   const data=await api('/api/v1/owner/blog/'+current.id+'/media',{method:'POST',body:form});
   setFile(null);setAlt('');setSource('');setRightsRef('');setRights(false);
   await open(current.id);
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
  if(!id||!b||!b.text)return;
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
    <p>초안과 공개 글은 분리돼. 저장 → 검수 요청 → Owner 승인 발행 순서야.</p></div>
   <Link href="/blog" target="_blank" rel="noopener noreferrer">공개 블로그 ↗</Link>
  </div>
  {message&&<p className={styles.notification} role="status">{message}</p>}
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
       <button disabled={busy||dirty} className={styles.smallButton} onClick={()=>void action('submit')}>검수 요청</button>
       {owner&&<button disabled={busy||dirty||!current.review_requested_at}
         className={styles.publishButton} onClick={()=>void action('publish')}>승인하고 발행</button>}
       {owner&&current.is_visible&&<button disabled={busy} className={styles.dangerButton}
         onClick={()=>void action('unpublish')}>공개 중단</button>}
      </div>
     </div>
     <div className={styles.languageTabs} role="group" aria-label="작성 언어">
      {BLOG_LOCALES.map(l=><button key={l} aria-pressed={locale===l}
       onClick={()=>setLocale(l)}>{l==='en'?'English':l==='ko'?'한국어':l==='ja'?'日本語':'简体中文'}
       {draft.translations[l]?.title?' ✓':''}</button>)}
     </div>
     <div className={styles.details}>
      <label>제목 <input value={translation.title} maxLength={140}
        onChange={e=>updateTranslation({title:e.target.value})} placeholder="Human-focused editorial title"/></label>
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
         onChange={e=>update({category:e.target.value as BlogDraft['category']})}>
         {Object.entries(BLOG_CATEGORIES).map(([value,label])=>
          <option key={value} value={value}>{label}</option>)}
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
     <div className={styles.blockArea}>
      <div className={styles.editorSubhead}><div><h4>본문 편집기</h4>
       <p>블록 추가 · 드래그 정렬 · 모바일에서 ↑↓ 이동 · 간단한 강조 문법과 표 지원</p></div>
       <button className={styles.smallButton} onClick={()=>setPreview(x=>!x)}>{preview?'편집 화면':'미리보기'}</button>
      </div>
      {preview?<BlogBody blocks={translation.blocks} preview/>:<>
       <div className={styles.toolbar}>
        {(['paragraph','heading','list','quote','table','image','divider'] as const).map(type=>
         <button key={type} onClick={()=>addBlock(type)}>+ {type==='paragraph'?'문단':
           type==='heading'?'제목':type==='list'?'목록':type==='quote'?'인용':
           type==='table'?'표':type==='image'?'사진':'구분선'}</button>)}
        <button onClick={()=>applyInline('bold')}>**굵게**</button>
        <button onClick={()=>applyInline('italic')}>*기울임*</button>
        <button onClick={()=>applyInline('link')}>링크</button>
        {['🍜','🥢','🥘','☕','🍽️','📍','⭐','✨'].map(emoji=>
         <button key={emoji} title="아래 새 문단에 추가" onClick={()=>setBlocks([
           ...translation.blocks,{...newBlock('paragraph'),text:emoji+' '}])}>{emoji}</button>)}
       </div>
       {translation.blocks.map((block,index)=><article key={block.id}
         draggable onDragStart={()=>setDragged(block.id)}
         onDragOver={e=>e.preventDefault()} onDrop={e=>onDrop(block.id,e)}
         onDragEnd={()=>setDragged(null)} className={styles.blockCard}>
         <div className={styles.blockHeader}><strong>⠿ {index+1}. {block.type}</strong>
          <div className={styles.actions}>
           <button title="위로" disabled={index===0} onClick={()=>shift(block.id,index-1)}>↑</button>
           <button title="아래로" disabled={index===translation.blocks.length-1}
             onClick={()=>shift(block.id,index+1)}>↓</button>
           <button title="블록 복제" onClick={()=>setBlocks([...translation.blocks.slice(0,index+1),
             {...block,id:crypto.randomUUID()},...translation.blocks.slice(index+1)])}>복제</button>
           <button title="삭제" onClick={()=>setBlocks(translation.blocks.filter(b=>b.id!==block.id))}>삭제</button>
          </div>
         </div>
         {(block.type==='paragraph'||block.type==='heading'||block.type==='quote')&&<>
          {block.type==='heading'&&<select value={block.level||2}
            onChange={e=>changeBlock(block.id,{level:Number(e.target.value) as 2|3})}>
             <option value="2">H2 섹션 제목</option><option value="3">H3 소제목</option></select>}
          <textarea data-blog-block-id={block.id} rows={block.type==='paragraph'?5:2}
           value={block.text||''} placeholder="사실과 검증된 정보만 입력해."
           onChange={e=>changeBlock(block.id,{text:e.target.value})}/>
         </>}
         {block.type==='list'&&<textarea rows={5} value={(block.items||[]).join('\n')}
          placeholder="항목 하나당 한 줄"
          onChange={e=>changeBlock(block.id,{items:e.target.value.split('\n').slice(0,30)})}/>}
         {block.type==='table'&&<div className={styles.tableEditor}>
          {(block.rows||[]).map((row,r)=><div className={styles.tableRow} key={r}>
           {row.map((cell,col)=><input key={col} value={cell} aria-label={r+'행 '+col+'열'}
            onChange={e=>changeBlock(block.id,{rows:(block.rows||[]).map((v,i)=>i===r?
              v.map((x,j)=>j===col?e.target.value:x):v)})}/>)}
          </div>)}
          <button onClick={()=>changeBlock(block.id,{rows:[...(block.rows||[]),
           new Array(block.rows?.[0]?.length||2).fill('')]})}>+ 행 추가</button>
          <button onClick={()=>changeBlock(block.id,{rows:(block.rows||[]).map(r=>[...r,''])})}>+ 열 추가</button>
          <button onClick={()=>changeBlock(block.id,{rows:(block.rows||[]).slice(0,-1)})}>− 마지막 행</button>
         </div>}
         {block.type==='image'&&<>
          <label>승인된 사진 선택
           <select value={block.image_id||''} onChange={e=>changeBlock(block.id,{image_id:e.target.value})}>
            <option value="">본문에 넣을 사진 선택</option>
            {current.images.filter(m=>m.rights_status==='approved').map(m=>
             <option key={m.id} value={m.id}>{m.alt_text} ({m.media_role})</option>)}
           </select></label>
          <input placeholder="이미지 캡션" maxLength={250} value={block.caption||''}
           onChange={e=>changeBlock(block.id,{caption:e.target.value})}/>
          {block.image_id&&<img src={'/api/v1/owner/blog/images/'+block.image_id}
            alt={block.caption||'블로그 사진'} loading="lazy" className={styles.thumbnail}/>}
         </>}
         {block.type==='divider'&&<hr/>}
       </article>)}
       {!translation.blocks.length&&<p className={styles.blank}>상단에서 + 문단 또는 + 제목을 눌러 본문을 작성해.</p>}
      </>}
     </div>
     <section className={styles.mediaPanel}>
      <h4>블로그 사진 관리</h4>
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
