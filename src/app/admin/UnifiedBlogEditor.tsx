'use client';
import {useEffect,useRef,useState,type DragEvent,type MouseEvent} from 'react';
import type {BlogBlock,BlogTranslation} from '@/lib/blog-model';
import styles from './blog-editor.module.css';

type ApprovedImage={id:string;alt_text:string;rights_status:string;image_url:string};
type Props={locale:string;articleId:string;translation:BlogTranslation;images:ApprovedImage[];onChange:(patch:Partial<BlogTranslation>)=>void;onChooseFile:(file:File)=>void};

const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>(({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' } as Record<string,string>)[char]||char));
const textHtml=(value:string)=>value.split(/(\[[^\]\n]{1,120}\]\(https:\/\/[^\s)<>]{5,500}\))/g).map(part=>{
 const match=/^\[([^\]\n]+)\]\((https:\/\/[^\s)<>]+)\)$/.exec(part);
 return match?'<a href="'+escapeHtml(match[2])+'" target="_blank" rel="noopener noreferrer sponsored nofollow">'+escapeHtml(match[1])+'</a>':escapeHtml(part).replace(/\+\+([^+\n]{1,500})\+\+/g,'<u>$1</u>').replace(/\{color:(#[0-9a-fA-F]{6})\|([^{}\n]{1,500})\}/g,'<span data-text-color="$1" style="color:$1">$2</span>').replace(/\n/g,'<br>');
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
 if(node.tagName==='U')return '++'+content+'++';
 if(node.tagName==='SPAN'&&/^#[0-9a-fA-F]{6}$/.test(node.dataset.textColor||''))return '{color:'+node.dataset.textColor+'|'+content+'}';
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
    return '<figure class="inlinePhoto" contenteditable="false" data-image-id="'+escapeHtml(block.image_id||'')+'" data-width="'+(block.image_width||100)+'" style="width:'+(block.image_width||100)+'%;max-width:100%;margin-inline:auto">'+
      (image?'<img src="'+escapeHtml(image.image_url)+'" alt="'+escapeHtml(image.alt_text)+'"/>':'<p>이미지 선택 또는 승인 필요</p>')+
      '<figcaption>'+escapeHtml(block.caption||'')+'</figcaption></figure>';
   }
   if(block.type==='divider')return '<hr/>';
   if(block.type==='table'){
    const bw=block.table_border_width??1,bc=block.table_border_color||'#dae6df',bs=block.table_border_style||'solid';
    const tableAttrs=' data-border-width="'+bw+'" data-border-color="'+bc+'" data-border-style="'+bs+'"';
    const cols=(block.table_col_widths||[]).map(w=>'<col style="width:'+w+'px" data-width="'+w+'"/>').join('');
    const rows=(block.rows||[]).map((row,i)=>'<tr data-height="'+(block.table_row_heights?.[i]||0)+'" style="height:'+(block.table_row_heights?.[i]||'auto')+(block.table_row_heights?.[i]?'px':'')+'">'+row.map(cell=>'<td style="border:'+bw+'px '+bs+' '+bc+'">'+textHtml(cell)+'</td>').join('')+'</tr>').join('');
    return '<table'+attrs+tableAttrs+' style="border-collapse:collapse;table-layout:fixed;width:max-content"><colgroup>'+cols+'</colgroup><tbody>'+rows+'</tbody></table>';
   }
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
   if(rows.length&&rows.every(row=>row.length===rows[0].length&&row.length>=2)){
    const width=Number(node.getAttribute('data-border-width'));
    const color=node.getAttribute('data-border-color')||'#dae6df';
    const borderStyle=node.getAttribute('data-border-style')||'solid';
    const widths=Array.from(node.querySelectorAll('col')).map(c=>Number(c.getAttribute('data-width'))).filter(v=>v>=45&&v<=1200);
    const heights=Array.from(node.querySelectorAll('tr')).map(r=>Number(r.getAttribute('data-height'))||40);
    add('table',{...style,rows,table_border_width:Number.isInteger(width)&&width>=0&&width<=8?width:1,
     table_border_color:/^#[0-9a-fA-F]{6}$/.test(color)?color:'#dae6df',
     table_border_style:['solid','dashed','dotted','none'].includes(borderStyle)?borderStyle as BlogBlock['table_border_style']:'solid',
     table_col_widths:widths.length===rows[0].length?widths:undefined,table_row_heights:heights});
   }
  }else if(name!=='h1')add('paragraph',{...style,text:inlineText(node).slice(0,8000)});
 }
 return {blocks:blocks.slice(0,80)};
}

export default function UnifiedBlogEditor({locale,articleId,translation,images,onChange,onChooseFile}:Props){
 const ref=useRef<HTMLDivElement>(null);
 const pick=useRef<HTMLInputElement>(null);
 const [font,setFont]=useState('sans');
 const [textColor,setTextColor]=useState('#168454');
 const [tableWidth,setTableWidth]=useState(1);
 const [tableColor,setTableColor]=useState('#dae6df');
 const [tableStyle,setTableStyle]=useState<'solid'|'dashed'|'dotted'|'none'>('solid');
 const [selectedTable,setSelectedTable]=useState(false);
 const activeTable=useRef<HTMLTableElement|null>(null);
 const resizeState=useRef<{axis:'col'|'row';index:number;start:number;initial:number;table:HTMLTableElement}|null>(null);
 const [imageChoice,setImageChoice]=useState('');
 const [note,setNote]=useState('');
 const [imageSize,setImageSize]=useState(100);
 const selectedFigure=useRef<HTMLElement|null>(null);
 const [selectedPhoto,setSelectedPhoto]=useState(false);
 const chooseFigure=(figure:HTMLElement|null)=>{
  selectedFigure.current?.removeAttribute('data-selected');
  selectedFigure.current=figure;
  if(figure){figure.dataset.selected='true';setImageSize(Number(figure.dataset.width)||100)}
  setSelectedPhoto(Boolean(figure));
 };
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
   pending.removeAttribute('data-pending');pending.dataset.imageId=detail.id;pending.dataset.width=pending.dataset.width||'100';
   const img=pending.querySelector('img');
   if(img)img.src=detail.url;
   const caption=pending.querySelector('figcaption');
   if(caption)caption.textContent='';
   sync();
   setNote('');
  };
  const onFailed=(event:Event)=>{
   const message=(event as CustomEvent<{message:string}>).detail?.message||'저장되지 않았어';
   const pending=ref.current?.querySelector('figure[data-pending]');
   if(pending){pending.remove();sync()}
   setNote('사진 업로드 실패: '+message);
  };
  window.addEventListener('whateato-blog-upload-failed',onFailed);
  window.addEventListener('whateato-blog-uploaded',onUploaded);
  return ()=>{window.removeEventListener('whateato-blog-uploaded',onUploaded);window.removeEventListener('whateato-blog-upload-failed',onFailed)};
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
  chooseFigure(null);
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
 const applyTextStyle=(kind:'underline'|'color')=>{
  const range=lastCaret.current;
  if(!range||range.collapsed||!ref.current?.contains(range.commonAncestorContainer)){setNote('먼저 꾸밀 글자를 마우스로 선택해 주세요.');return}
  const selection=window.getSelection();selection?.removeAllRanges();selection?.addRange(range);
  const span=document.createElement(kind==='underline'?'u':'span');
  if(kind==='color'){span.style.color=textColor;span.dataset.textColor=textColor}
  try{range.surroundContents(span)}catch{
   const frag=range.extractContents();span.appendChild(frag);range.insertNode(span);
  }
  sync();setNote('');
 };
 const chooseTable=(table:HTMLTableElement|null)=>{
  activeTable.current=table;setSelectedTable(Boolean(table));
  if(table){setTableWidth(Number(table.dataset.borderWidth)||1);setTableColor(table.dataset.borderColor||'#dae6df');setTableStyle((table.dataset.borderStyle as 'solid'|'dashed'|'dotted'|'none')||'solid')}
 };
 const modifyTable=(change:'border'|'delete-row'|'delete-col'|'insert-row'|'insert-col')=>{
  const table=activeTable.current;if(!table||!ref.current?.contains(table)){setNote('먼저 표의 셀을 클릭해 주세요.');return}
  if(change==='border'){
   table.dataset.borderWidth=String(tableWidth);table.dataset.borderColor=tableColor;table.dataset.borderStyle=tableStyle;
   table.querySelectorAll('td,th').forEach(cell=>{(cell as HTMLElement).style.border=tableWidth+'px '+tableStyle+' '+tableColor});
  }else{
   const selected=(lastCaret.current?.startContainer instanceof Element?lastCaret.current.startContainer:lastCaret.current?.startContainer.parentElement)?.closest('td,th');
   const row=(selected?.closest('tr')||table.rows[0]) as HTMLTableRowElement;
   const ri=row.rowIndex,ci=selected?(selected as HTMLTableCellElement).cellIndex:0;
   if(change==='delete-row'){if(table.rows.length<=1){setNote('표에는 한 행 이상 필요해.');return}table.deleteRow(ri)}
   if(change==='insert-row'){const newRow=table.insertRow(ri+1);for(let k=0;k<table.rows[0].cells.length;k++)newRow.insertCell().textContent=''}
   if(change==='delete-col'){if(table.rows[0].cells.length<=2){setNote('표에는 두 열 이상 필요해.');return}Array.from(table.rows).forEach(r=>r.deleteCell(ci));table.querySelectorAll('col').item(ci)?.remove()}
   if(change==='insert-col'){if(table.rows[0].cells.length>=6){setNote('표는 최대 6열이야.');return}Array.from(table.rows).forEach(r=>r.insertCell(ci+1).textContent='');const col=document.createElement('col');col.dataset.width='120';col.style.width='120px';table.querySelector('colgroup')?.append(col)}
  }
  sync();
 };
 const onTableMouseDown=(event:MouseEvent<HTMLDivElement>)=>{
  const target=event.target;if(!(target instanceof HTMLElement))return;
  const cell=target.closest('td,th') as HTMLTableCellElement|null;
  if(!cell||!ref.current?.contains(cell))return;
  const rect=cell.getBoundingClientRect(),edge=7;
  const axis=Math.abs(event.clientX-rect.right)<=edge?'col':Math.abs(event.clientY-rect.bottom)<=edge?'row':null;
  if(!axis)return;
  const table=cell.closest('table') as HTMLTableElement|null;if(!table)return;
  event.preventDefault();
  const index=axis==='col'?cell.cellIndex:cell.parentElement instanceof HTMLTableRowElement?cell.parentElement.rowIndex:0;
  resizeState.current={axis,index,start:axis==='col'?event.clientX:event.clientY,initial:axis==='col'?cell.offsetWidth:cell.offsetHeight,table};
 };
 const onResizeMove=(event:React.MouseEvent<HTMLDivElement>)=>{
  const state=resizeState.current;
  if(state){
   const value=Math.max(state.axis==='col'?45:25,Math.min(state.axis==='col'?1200:600,Math.round(state.initial+(state.axis==='col'?event.clientX:event.clientY)-state.start)));
   if(state.axis==='col'){
    let group=state.table.querySelector('colgroup');if(!group){group=document.createElement('colgroup');state.table.prepend(group)}
    while(group.children.length<state.table.rows[0].cells.length)group.append(document.createElement('col'));
    const col=group.children[state.index] as HTMLElement;col.style.width=value+'px';col.dataset.width=String(value);
   }else{const row=state.table.rows[state.index];if(row){row.style.height=value+'px';row.dataset.height=String(value)}}
   return;
  }
  const target=event.target;if(!(target instanceof HTMLElement))return;
  const cell=target.closest('td,th') as HTMLTableCellElement|null;
  if(!cell){ref.current?.style.removeProperty('cursor');return}
  const rect=cell.getBoundingClientRect();
  if(ref.current)ref.current.style.cursor=Math.abs(event.clientX-rect.right)<=7?'col-resize':Math.abs(event.clientY-rect.bottom)<=7?'row-resize':'text';
 };
 const finishResize=()=>{if(resizeState.current){resizeState.current=null;sync()}};
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
  const cg=document.createElement('colgroup');for(let j=0;j<c;j++){const col=document.createElement('col');col.dataset.width='140';col.style.width='140px';cg.append(col)}table.prepend(cg);
  table.dataset.borderWidth='1';table.dataset.borderColor='#dae6df';table.dataset.borderStyle='solid';table.style.tableLayout='fixed';table.style.width='max-content';
  putNode(table);chooseTable(table);sync();
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
  const figure=document.createElement('figure');figure.contentEditable='false';figure.dataset.pending='true';figure.className='inlinePhoto';figure.dataset.width=String(imageSize);figure.style.width=imageSize+'%';
  const img=document.createElement('img');img.src=URL.createObjectURL(file);img.alt=file.name;
  img.onload=()=>URL.revokeObjectURL(img.src);
  const caption=document.createElement('figcaption');caption.textContent='';
  figure.append(img,caption);putNode(figure);chooseFigure(figure);onChooseFile(file);
  setNote('');
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
  if(target){chooseFigure(target);target.dataset.width=String(imageSize);target.style.width=imageSize+'%';target.style.maxWidth='100%';sync();setNote('');}
  else setNote('크기를 변경할 이미지를 클릭해 주세요.');
 };
 const insertImage=(id:string)=>{
  const image=images.find(item=>item.id===id&&item.rights_status==='approved');
  if(!image){setNote('승인된 이미지만 본문에 삽입할 수 있어.');return}
  focus();
  const figure=document.createElement('figure');
  figure.contentEditable='false';figure.className='inlinePhoto';figure.dataset.width=String(imageSize);figure.style.width=imageSize+'%';
  figure.dataset.imageId=id;
  const img=document.createElement('img');img.src=image.image_url;img.alt=image.alt_text;
  const caption=document.createElement('figcaption');caption.textContent='';
  figure.append(img,caption);
  const selection=window.getSelection();
  putNode(figure);chooseFigure(figure);
  setImageChoice('');sync();
 };
 useEffect(()=>{
  const insert=(event:Event)=>{const id=(event as CustomEvent<{id:string}>).detail?.id;if(id)insertImage(id)};
  window.addEventListener('whateato-blog-media-insert',insert);
  return ()=>window.removeEventListener('whateato-blog-media-insert',insert);
 },[images]);
 const handleDrop=(event:DragEvent<HTMLDivElement>)=>{
  const stored=event.dataTransfer.getData('application/x-whateato-blog-image');
  if(stored){event.preventDefault();rememberCaret();insertImage(stored);return}
  const file=Array.from(event.dataTransfer.files).find(f=>['image/jpeg','image/png','image/webp'].includes(f.type));
  if(file){event.preventDefault();rememberCaret();previewFile(file)}
 };
 return <div className={styles.unifiedWrap}>
  <div className={styles.unifiedToolbar} role="toolbar" aria-label="글 작성 도구">
   <div className={styles.toolGroup}><strong>문단</strong>
    {(['p','h2','h3','insertUnorderedList','blockquote'] as const).map((t,i)=><button key={t} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format(t)}>{['본문','제목','소제목','목록','인용'][i]}</button>)}
   </div>
   <div className={styles.toolGroup}><strong>글자 꾸미기</strong>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format('bold')}><b>B</b></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>format('italic')}><i>I</i></button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>applyTextStyle('underline')}><u>U</u></button>
    <label>색상 <input type="color" value={textColor} onChange={e=>setTextColor(e.target.value)}/></label>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>applyTextStyle('color')}>색 적용</button>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={insertLink}>링크</button>
    <label>글자 크기 <select defaultValue="16" onChange={e=>applySize(Number(e.target.value))}>{[12,14,16,18,20,24,28,32,40].map(v=><option key={v} value={v}>{v}px</option>)}</select></label>
   </div>
   <div className={styles.toolGroup}><strong>정렬·글꼴</strong>
    {(['left','center','right'] as const).map((v,i)=><button key={v} type="button" onMouseDown={e=>e.preventDefault()} onClick={()=>applyAlign(v)}>{['왼쪽','가운데','오른쪽'][i]}</button>)}
    <label>글꼴 <select value={font} onChange={e=>setFont(e.target.value)}><option value="sans">Noto Sans KR</option><option value="serif">Noto Serif KR</option><option value="nanum">나눔고딕</option><option value="myeongjo">나눔명조</option></select></label>
   </div>
   <div className={styles.toolGroup}><strong>표 편집</strong>
    <button type="button" onMouseDown={e=>e.preventDefault()} onClick={insertTable}>표 삽입</button>
    <label>선 굵기 <select value={tableWidth} onChange={e=>setTableWidth(Number(e.target.value))}>{[0,1,2,3,4,6,8].map(v=><option key={v} value={v}>{v}px</option>)}</select></label>
    <label>선 색 <input type="color" value={tableColor} onChange={e=>setTableColor(e.target.value)}/></label>
    <label>선 종류 <select value={tableStyle} onChange={e=>setTableStyle(e.target.value as typeof tableStyle)}><option value="solid">실선</option><option value="dashed">파선</option><option value="dotted">점선</option><option value="none">없음</option></select></label>
    <button type="button" disabled={!selectedTable} onClick={()=>modifyTable('border')}>스타일 적용</button>
    {(['insert-row','insert-col','delete-row','delete-col'] as const).map((v,i)=><button type="button" key={v} disabled={!selectedTable} onClick={()=>modifyTable(v)}>{['행 추가','열 추가','행 삭제','열 삭제'][i]}</button>)}
   </div>
   <div className={styles.toolGroup}><strong>사진</strong>
    <button type="button" onClick={()=>pick.current?.click()}>사진 업로드</button>
    <label>크기 <select value={imageSize} onChange={e=>setImageSize(Number(e.target.value))}>{[25,40,50,60,75,90,100].map(v=><option key={v} value={v}>{v}%</option>)}</select></label>
    <button type="button" disabled={!selectedPhoto} onClick={resizeImage}>사진 크기 적용</button>
    <input ref={pick} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={e=>{const file=e.target.files?.[0];if(file)previewFile(file);e.target.value=''}}/>
    <select aria-label="승인된 사진 삽입" value={imageChoice} onChange={e=>{setImageChoice(e.target.value);if(e.target.value)insertImage(e.target.value)}}><option value="">사진 위치에 삽입…</option>{images.filter(image=>image.rights_status==='approved').map(image=><option key={image.id} value={image.id}>{image.alt_text||image.id}</option>)}</select>
   </div>
  </div>
  {note&&<p className={styles.editorNotice} role="status">{note}</p>}
  <div ref={ref} className={styles.unifiedCanvas} data-font={font} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="제목과 본문 통합 편집" onInput={()=>{sync();rememberCaret()}} onMouseDown={onTableMouseDown} onMouseMove={onResizeMove} onMouseLeave={finishResize} onMouseUp={e=>{finishResize();rememberCaret()}} onKeyUp={rememberCaret} onClick={e=>{const node=e.target as HTMLElement;const figure=node.closest('figure');chooseFigure(figure&&ref.current?.contains(figure)?figure as HTMLElement:null);chooseTable(node.closest('table') as HTMLTableElement|null)}} onBlur={()=>{rememberCaret();sync()}} onDragOver={e=>{if(e.dataTransfer.types.includes('Files'))e.preventDefault()}} onDrop={handleDrop}/>
  <p className={styles.editorHint}>사진을 클릭하면 선택 테두리가 나타나고, 해당 사진의 크기만 조절할 수 있어. 사진은 문단 사이에 자유롭게 배치돼.</p>
 </div>;
}
