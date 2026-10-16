'use client';
import {useEffect,useRef,useState,type DragEvent} from 'react';
import type {BlogBlock,BlogTranslation} from '@/lib/blog-model';
import styles from './blog-editor.module.css';

type ApprovedImage={id:string;alt_text:string;rights_status:string;image_url:string};
type Props={locale:string;articleId:string;translation:BlogTranslation;images:ApprovedImage[];onChange:(patch:Partial<BlogTranslation>)=>void;onChooseFile:(file:File)=>void};

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
const textHtml=(value:string)=>escapeHtml(value).replace(/\n/g,'<br>');
const render=(translation:BlogTranslation,images:ApprovedImage[])=>'<h1 data-title="true">'+textHtml(translation.title)+'</h1>'+
  translation.blocks.map(block=>{
   const value=textHtml(block.text||'');
   if(block.type==='heading')return '<h'+(block.level===3?'3':'2')+'>'+value+'</h'+(block.level===3?'3':'2')+'>';
   if(block.type==='quote')return '<blockquote>'+value+'</blockquote>';
   if(block.type==='list')return '<ul>'+((block.items||[]).map(item=>'<li>'+textHtml(item)+'</li>').join(''))+'</ul>';
   if(block.type==='image'){
    const image=images.find(item=>item.id===block.image_id);
    return '<figure contenteditable="false" data-image-id="'+escapeHtml(block.image_id||'')+'">'+
      (image?'<img src="'+escapeHtml(image.image_url)+'" alt="'+escapeHtml(image.alt_text)+'"/>':'<p>이미지 선택 또는 승인 필요</p>')+
      '<figcaption>'+escapeHtml(block.caption||'')+'</figcaption></figure>';
   }
   if(block.type==='divider')return '<hr/>';
   if(block.type==='table')return '<table><tbody>'+((block.rows||[]).map(row=>'<tr>'+row.map(cell=>'<td>'+textHtml(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
   return '<p>'+value+'</p>';
  }).join('');

function serialize(root:HTMLElement):{title:string;blocks:BlogBlock[]}{
 const nodes=Array.from(root.children);
 const title=(nodes.find(node=>node.matches('[data-title],h1'))?.textContent||'').trim().slice(0,140);
 const blocks:BlogBlock[]=[];
 const add=(type:BlogBlock['type'],rest:Omit<BlogBlock,'id'|'type'>={})=>blocks.push({id:crypto.randomUUID(),type,...rest});
 for(const node of nodes){
  const name=node.tagName.toLowerCase();
  if(name==='h1'&&node.hasAttribute('data-title'))continue;
  if(name==='h2'||name==='h3')add('heading',{level:name==='h2'?2:3,text:(node.textContent||'').slice(0,8000)});
  else if(name==='blockquote')add('quote',{text:(node.textContent||'').slice(0,8000)});
  else if(name==='ul'||name==='ol')add('list',{items:Array.from(node.querySelectorAll(':scope > li')).map(li=>(li.textContent||'').slice(0,450)).slice(0,30)});
  else if(name==='figure')add('image',{image_id:node.getAttribute('data-image-id')||'',caption:(node.querySelector('figcaption')?.textContent||'').slice(0,250)});
  else if(name==='hr')add('divider');
  else if(name==='table'){
   const rows=Array.from(node.querySelectorAll('tr')).slice(0,20).map(tr=>Array.from(tr.querySelectorAll('td,th')).slice(0,6).map(cell=>(cell.textContent||'').slice(0,240)));
   if(rows.length&&rows.every(row=>row.length===rows[0].length&&row.length>=2))add('table',{rows});
  }else if(name!=='h1')add('paragraph',{text:(node.textContent||'').slice(0,8000)});
 }
 return {title,blocks:blocks.slice(0,80)};
}

export default function UnifiedBlogEditor({locale,articleId,translation,images,onChange,onChooseFile}:Props){
 const ref=useRef<HTMLDivElement>(null);
 const pick=useRef<HTMLInputElement>(null);
 const [font,setFont]=useState('sans');
 const [imageChoice,setImageChoice]=useState('');
 const [note,setNote]=useState('');
 const recent=useRef<{articleId:string;locale:string}|null>(null);
 useEffect(()=>{
  if(!ref.current)return;
  // Preserve caret during typing. Rehydrate only when changing article/language.
  if(recent.current?.articleId===articleId&&recent.current?.locale===locale)return;
  ref.current.innerHTML=render(translation,images);
  recent.current={articleId,locale};
 },[articleId,locale,translation,images]);
 const sync=()=>{
  if(!ref.current)return;
  const value=serialize(ref.current);
  onChange(value);
 };
 const focus=()=>ref.current?.focus();
 const format=(tag:'p'|'h2'|'h3'|'blockquote'|'insertUnorderedList'|'bold'|'italic')=>{
  focus();
  if(tag==='bold'||tag==='italic')document.execCommand(tag,false);
  else if(tag==='insertUnorderedList')document.execCommand('insertUnorderedList',false);
  else document.execCommand('formatBlock',false,tag);
  sync();
 };
 const insertImage=(id:string)=>{
  const image=images.find(item=>item.id===id&&item.rights_status==='approved');
  if(!image){setNote('승인된 이미지만 본문에 삽입할 수 있어.');return}
  focus();
  const figure=document.createElement('figure');
  figure.contentEditable='false';
  figure.dataset.imageId=id;
  const img=document.createElement('img');img.src=image.image_url;img.alt=image.alt_text;
  const caption=document.createElement('figcaption');caption.textContent=image.alt_text;
  figure.append(img,caption);
  const selection=window.getSelection();
  if(selection?.rangeCount&&ref.current?.contains(selection.anchorNode)){
   const range=selection.getRangeAt(0);range.deleteContents();range.insertNode(figure);
   const p=document.createElement('p');p.append(document.createElement('br'));figure.after(p);
   range.setStart(p,0);range.collapse(true);selection.removeAllRanges();selection.addRange(range);
  }else ref.current?.append(figure);
  setImageChoice('');sync();
 };
 const handleDrop=(event:DragEvent<HTMLDivElement>)=>{
  const file=Array.from(event.dataTransfer.files).find(f=>['image/jpeg','image/png','image/webp'].includes(f.type));
  if(file){event.preventDefault();onChooseFile(file);setNote('사진이 선택됐어. 아래 사진 출처·사용권을 입력하고 업로드한 뒤, 승인된 사진을 여기서 삽입해.')}
 };
 return <div className={styles.unifiedWrap}>
  <div className={styles.unifiedToolbar} role="toolbar" aria-label="글 작성 도구">
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format('p')}>본문</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format('h2')}>제목</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format('h3')}>소제목</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format('insertUnorderedList')}>목록</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format('blockquote')}>인용</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format('bold')}>굵게</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format('italic')}>기울임</button>
   <label className={styles.fontSelect}>글꼴 <select value={font} onChange={e=>setFont(e.target.value)}>
    <option value="sans">Noto Sans KR</option><option value="serif">Noto Serif KR</option>
    <option value="nanum">나눔고딕</option><option value="myeongjo">나눔명조</option>
   </select></label>
   <button type="button" onClick={()=>pick.current?.click()}>사진 업로드</button>
   <input ref={pick} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)onChooseFile(file);e.target.value=''}}/>
   <select aria-label="승인된 사진 삽입" value={imageChoice} onChange={e=>{setImageChoice(e.target.value);if(e.target.value)insertImage(e.target.value)}}>
    <option value="">사진 위치에 삽입…</option>
    {images.filter(image=>image.rights_status==='approved').map(image=><option value={image.id} key={image.id}>{image.alt_text||image.id}</option>)}
   </select>
  </div>
  {note&&<p className={styles.editorNotice} role="status">{note}</p>}
  <div ref={ref} className={styles.unifiedCanvas} data-font={font} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="제목과 본문 통합 편집" onInput={sync} onBlur={sync} onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()}} onDrop={handleDrop}/>
  <p className={styles.editorHint}>첫 줄에 글 제목을 쓰고 이어서 본문을 작성해. 글자를 선택한 뒤 위 도구를 누르면 서식이 적용돼. 사진은 업로드·권리 승인 후 원하는 커서 위치에 삽입해.</p>
 </div>;
}
