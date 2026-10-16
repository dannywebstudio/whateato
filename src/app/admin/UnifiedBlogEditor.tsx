'use client';
import {useEffect,useRef,useState,type DragEvent} from 'react';
import type {BlogBlock,BlogTranslation} from '@/lib/blog-model';
import styles from './blog-editor.module.css';

type ApprovedImage={id:string;alt_text:string;rights_status:string;image_url:string};
type Props={locale:string;articleId:string;translation:BlogTranslation;images:ApprovedImage[];onChange:(patch:Partial<BlogTranslation>)=>void;onChooseFile:(file:File)=>void};

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>(({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as Record<string,string>)[char]||char));
const textHtml=(value:string)=>value.split(/(\[[^\]\n]{1,120}\]\(https:\/\/[^\s)<>]{5,500}\))/g).map(part=>{
 const match=/^\[([^\]\n]+)\]\((https:\/\/[^\s)<>]+)\)$/.exec(part);
 return match?'<a href="'+escapeHtml(match[2])+'" target="_blank" rel="noopener noreferrer sponsored nofollow">'+escapeHtml(match[1])+'</a>':escapeHtml(part).replace(/\n/g,'<br>');
}).join('');
const inlineText=(node:Node):string=>{
 if(node.nodeType===Node.TEXT_NODE)return node.textContent||'';
 if(!(node instanceof HTMLElement))return '';
 const content=Array.from(node.childNodes).map(inlineText).join('');
 if(node.tagName==='A'){
  const url=node.getAttribute('href')||'';
  return /^https:\/\/[^\s)<>]{5,500}$/.test(url)?'['+content.replace(/[\[\]]/g,'')+']('+url+')':content;
 }
 if(node.tagName==='BR')return '\n';
 if(node.tagName==='STRONG'||node.tagName==='B')return '**'+content+'**';
 if(node.tagName==='EM'||node.tagName==='I')return '*'+content+'*';
 return content;
};
const render=(translation:BlogTranslation,images:ApprovedImage[])=>
  translation.blocks.map(block=>{
   const value=textHtml(block.text||'');
   const attrs=' data-align="'+(block.align||'left')+'"'+(block.font_size?' data-size="'+block.font_size+'"':'')+' style="text-align:'+(block.align||'left')+';'+(block.font_size?'font-size:'+block.font_size+'px':'')+'"';
   if(block.type==='heading')return '<h'+(block.level===3?'3':'2')+attrs+'>'+value+'</h'+(block.level===3?'3':'2')+'>';
   if(block.type==='quote')return '<blockquote'+attrs+'>'+value+'</blockquote>';
   if(block.type==='list')return '<ul'+attrs+'>'+((block.items||[]).map(item=>'<li>'+textHtml(item)+'</li>').join(''))+'</ul>';
   if(block.type==='image'){
    const image=images.find(item=>item.id===block.image_id);
    return '<figure contenteditable="false" data-image-id="'+escapeHtml(block.image_id||'')+'" data-width="'+(block.image_width||100)+'" style="width:'+(block.image_width||100)+'%;max-width:100%;margin-inline:auto">'+
      (image?'<img src="'+escapeHtml(image.image_url)+'" alt="'+escapeHtml(image.alt_text)+'"/>':'<p>이미지 선택 또는 승인 필요</p>')+
      '<figcaption>'+escapeHtml(block.caption||'')+'</figcaption></figure>';
   }
   if(block.type==='divider')return '<hr/>';
   if(block.type==='table')return '<table'+attrs+'><tbody>'+(block.rows||[]).map(row=>'<tr>'+row.map(cell=>'<td>'+textHtml(cell)+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
   return '<p'+attrs+'>'+value+'</p>';
  }).join('');

function serialize(root:HTMLElement):{blocks:BlogBlock[]}{
 const nodes=Array.from(root.children);
 const blocks:BlogBlock[]=[];
 const add=(type:BlogBlock['type'],rest:Omit<BlogBlock,'id'|'type'>={})=>blocks.push({id:crypto.randomUUID(),type,...rest});
 for(const node of nodes){
  const name=node.tagName.toLowerCase();
  if(name==='figure'&&node.hasAttribute('data-pending'))continue;
  const align=['left','center','right'].includes((node as HTMLElement).dataset.align||'')?(node as HTMLElement).dataset.align as BlogBlock['align']:undefined;
  const size=Number((node as HTMLElement).dataset.size);
  const style={align,font_size:size>=12&&size<=40?size:undefined};
  if(name==='h2'||name==='h3')add('heading',{...style,level:name==='h2'?2:3,text:inlineText(node).slice(0,8000)});
  else if(name==='blockquote')add('quote',{...style,text:inlineText(node).slice(0,8000)});
  else if(name==='ul'||name==='ol')add('list',{...style,items:Array.from(node.querySelectorAll(':scope > li')).map(li=>inlineText(li).slice(0,450)).slice(0,30)});
  else if(name==='figure')add('image',{align,image_width:Number(node.getAttribute('data-width'))||100,image_id:node.getAttribute('data-image-id')||'',caption:(node.querySelector('figcaption')?.textContent||'').slice(0,250)});
  else if(name==='hr')add('divider');
  else if(name==='table'){
   const rows=Array.from(node.querySelectorAll('tr')).slice(0,20).map(tr=>Array.from(tr.querySelectorAll('td,th')).slice(0,6).map(cell=>inlineText(cell).slice(0,240)));
   if(rows.length&&rows.every(row=>row.length===rows[0].length&&row.length>=2))add('table',{...style,rows});
  }else if(name!=='h1')add('paragraph',{...style,text:inlineText(node).slice(0,8000)});
 }
 return {blocks:blocks.slice(0,80)};
}

export default function UnifiedBlogEditor({locale,articleId,translation,images,onChange,onChooseFile}:Props){
 const ref=useRef<HTMLDivElement>(null);
 const pick=useRef<HTMLInputElement>(null);
 const [font,setFont]=useState('sans');
 const [imageChoice,setImageChoice]=useState('');
 const [note,setNote]=useState('');
 const [imageSize,setImageSize]=useState(100);
 const selectedFigure=useRef<HTMLElement|null>(null);
 const recent=useRef<{articleId:string;locale:string}|null>(null);
 const lastCaret=useRef<Range|null>(null);
 useEffect(()=>{
  const id='whateato-cms-free-fonts';
  if(document.getElementById(id))return;
  const link=document.createElement('link');link.id=id;link.rel='stylesheet';
  link.href='https://fonts.googleapis.com/css2?family=Nanum+Gothic:wght@400;700&family=Nanum+Myeongjo:wght@400;700&family=Noto+Sans+KR:wght@400;700&family=Noto+Serif+KR:wght@400;700&display=swap';
  document.head.appendChild(link);
 },[]);
 useEffect(()=>{
  const onUploaded=(event:Event)=>{
   const detail=(event as CustomEvent<{id:string;url:string}>).detail;
   if(!detail?.id||!ref.current)return;
   const pending=ref.current.querySelector('figure[data-pending]') as HTMLElement|null;
   if(!pending)return;
   pending.removeAttribute('data-pending');pending.dataset.imageId=detail.id;pending.dataset.width='100';
   const img=pending.querySelector('img');
   if(img)img.src=detail.url;
   const caption=pending.querySelector('figcaption');
   if(caption)caption.textContent='사용권 승인 대기';
   sync();
   setNote('사진을 본문 위치에 연결했어. 사용권 승인 후 공개할 수 있어.');
  };
  window.addEventListener('whateato-blog-uploaded',onUploaded);
  return ()=>window.removeEventListener('whateato-blog-uploaded',onUploaded);
 },[onChange]);
 const rememberCaret=()=>{
  const selection=window.getSelection();
  if(selection?.rangeCount&&ref.current?.contains(selection.anchorNode))lastCaret.current=selection.getRangeAt(0).cloneRange();
 };
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
 const insertLink=()=>{
  const range=lastCaret.current;
  if(!range||range.collapsed||!ref.current?.contains(range.commonAncestorContainer)){
   setNote('링크를 걸 글자를 드래그해 선택해 주세요.');return;
  }
  const raw=window.prompt('제휴마케팅 또는 외부 링크 URL (https://)');
  if(raw===null)return;
  const url=raw.trim();
  if(!/^https:\/\/[^\s)<>]{5,500}$/.test(url)){
   setNote('https:// 로 시작하는 올바른 링크를 입력해 주세요.');return;
  }
  const label=range.toString().trim();
  if(!label||label.length>120||/[\[\]\n]/.test(label)){
   setNote('링크 텍스트는 1~120자로 선택해 주세요.');return;
  }
  const anchor=document.createElement('a');anchor.href=url;anchor.textContent=label;
  anchor.rel='noopener noreferrer sponsored nofollow';anchor.target='_blank';
  range.deleteContents();range.insertNode(anchor);
  lastCaret.current=null;sync();setNote('링크가 삽입됐어. 초안 저장 후에도 유지돼.');
 };
 const insertTable=()=>{
  const raw=window.prompt('표 크기 (행,열)', '3,3');
  if(!raw)return;
  const [r,c]=raw.split(',').map(Number);
  if(!Number.isInteger(r)||!Number.isInteger(c)||r<1||r>20||c<2||c>6){setNote('표는 1~20행, 2~6열만 가능해.');return}
  const table=document.createElement('table');
  for(let i=0;i<r;i++){
   const tr=table.insertRow();
   for(let j=0;j<c;j++){const td=tr.insertCell();td.textContent=i===0?'항목':'';}
  }
  putNode(table);sync();
 };
 const putNode=(node:HTMLElement)=>{
  const range=lastCaret.current;
  const element=range?.startContainer instanceof HTMLElement?range.startContainer:range?.startContainer.parentElement;
  const block=element?.closest('p,h2,h3,blockquote,ul,ol,table,figure');
  if(block&&ref.current?.contains(block)){block.after(node)}
  else ref.current?.append(node);
  const p=document.createElement('p');p.append(document.createElement('br'));node.after(p);
  const caret=document.createRange();caret.setStart(p,0);caret.collapse(true);
  const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(caret);
  lastCaret.current=caret.cloneRange();
 };
 const previewFile=(file:File)=>{
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>8*1024*1024){setNote('JPG/PNG/WebP 8MB 이하만 지원해.');return}
  const figure=document.createElement('figure');figure.contentEditable='false';figure.dataset.pending='true';
  const img=document.createElement('img');img.src=URL.createObjectURL(file);img.alt=file.name;
  img.onload=()=>URL.revokeObjectURL(img.src);
  const caption=document.createElement('figcaption');caption.textContent='업로드 대기 · '+file.name;
  figure.append(img,caption);putNode(figure);onChooseFile(file);
  setNote('사진 미리보기가 본문에 삽입됐어. 저장 전에 아래에서 출처와 사용권을 확인하고 업로드해.');
 };
 const applyAlign=(align:'left'|'center'|'right')=>{
  const selected=lastCaret.current?.startContainer;
  const node=(selected instanceof HTMLElement?selected:selected?.parentElement)?.closest('p,h2,h3,blockquote,ul,table') as HTMLElement|null;
  if(node&&ref.current?.contains(node)){node.dataset.align=align;node.style.textAlign=align;sync();}
 };
 const applySize=(size:number)=>{
  const selected=lastCaret.current?.startContainer;
  const node=(selected instanceof HTMLElement?selected:selected?.parentElement)?.closest('p,h2,h3,blockquote,ul,table') as HTMLElement|null;
  if(node&&ref.current?.contains(node)){node.dataset.size=String(size);node.style.fontSize=size+'px';sync();}
 };
 const resizeImage=()=>{
  const selected=lastCaret.current?.startContainer;
  const figure=(selected instanceof HTMLElement?selected:selected?.parentElement)?.closest('figure') as HTMLElement|null;
  const target=selectedFigure.current&&ref.current?.contains(selectedFigure.current)?selectedFigure.current:figure&&ref.current?.contains(figure)?figure:null;
  if(target){target.dataset.width=String(imageSize);target.style.width=imageSize+'%';sync();}
  else setNote('크기를 변경할 이미지를 클릭해 주세요.');
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
  if(lastCaret.current&&ref.current?.contains(lastCaret.current.commonAncestorContainer)){
   const range=lastCaret.current;range.deleteContents();range.insertNode(figure);
   const p=document.createElement('p');p.append(document.createElement('br'));figure.after(p);
   range.setStart(p,0);range.collapse(true);selection?.removeAllRanges();selection?.addRange(range);lastCaret.current=range.cloneRange();
  }else ref.current?.append(figure);
  setImageChoice('');sync();
 };
 const handleDrop=(event:DragEvent<HTMLDivElement>)=>{
  const file=Array.from(event.dataTransfer.files).find(f=>['image/jpeg','image/png','image/webp'].includes(f.type));
  if(file){event.preventDefault();rememberCaret();previewFile(file)}
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
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={insertLink}>링크 / 제휴 링크</button>
   <label className={styles.fontSelect}>글꼴 <select value={font} onChange={e=>setFont(e.target.value)}>
    <option value="sans">Noto Sans KR</option><option value="serif">Noto Serif KR</option>
    <option value="nanum">나눔고딕</option><option value="myeongjo">나눔명조</option>
   </select></label>
   <button type="button" onClick={()=>pick.current?.click()}>사진 업로드</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={insertTable}>표 삽입</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>applyAlign('left')}>왼쪽</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>applyAlign('center')}>가운데</button>
   <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>applyAlign('right')}>오른쪽</button>
   <label>글자 크기 <select defaultValue="16" onChange={e=>applySize(Number(e.target.value))}>{[12,14,16,18,20,24,28,32,40].map(v=><option key={v} value={v}>{v}px</option>)}</select></label>
   <label>사진 크기 <select value={imageSize} onChange={e=>setImageSize(Number(e.target.value))}>{[25,40,50,60,75,90,100].map(v=><option key={v} value={v}>{v}%</option>)}</select></label>
   <button type="button" onClick={resizeImage}>사진 크기 적용</button>
   <input ref={pick} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)previewFile(file);e.target.value=''}}/>
   <select aria-label="승인된 사진 삽입" value={imageChoice} onChange={e=>{setImageChoice(e.target.value);if(e.target.value)insertImage(e.target.value)}}>
    <option value="">사진 위치에 삽입…</option>
    {images.filter(image=>image.rights_status==='approved').map(image=><option value={image.id} key={image.id}>{image.alt_text||image.id}</option>)}
   </select>
  </div>
  {note&&<p className={styles.editorNotice} role="status">{note}</p>}
  <div ref={ref} className={styles.unifiedCanvas} data-font={font} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="제목과 본문 통합 편집" onInput={()=>{sync();rememberCaret()}} onKeyUp={rememberCaret} onMouseUp={rememberCaret} onClick={e=>{const node=e.target as HTMLElement;const figure=node.closest('figure');if(figure&&ref.current?.contains(figure)){selectedFigure.current=figure as HTMLElement;setImageSize(Number(figure.getAttribute('data-width'))||100)}}} onBlur={()=>{rememberCaret();sync()}} onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()}} onDrop={handleDrop}/>
  <p className={styles.editorHint}>포스팅 제목은 위쪽 별도 입력칸에서 작성해. 글자를 선택한 뒤 위 도구를 누르면 서식이 적용돼. 사진은 업로드·권리 승인 후 원하는 커서 위치에 삽입해.</p>
 </div>;
}
