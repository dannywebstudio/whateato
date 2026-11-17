import type {ReactNode} from 'react';
import type {BlogBlock} from '@/lib/blog-model';
import InlineBlogRestaurantCard from '@/components/InlineBlogRestaurantCard';
import styles from '@/app/blog/blog.module.css';

/** Extract the existing editorial links without altering source URLs or executing HTML.
 * Only apply the location action layout to explicitly tagged place paragraphs.
 */
function locationActions(value:string){
 const match=/\[([^\]]+)\]\((https:\/\/www\.google\.com\/maps\/[^)]+)\)\s*·\s*\[([^\]]+)\]\((https:\/\/map\.naver\.com\/[^)]+)\)\s*·\s*\[([^\]]+)\]\((https:\/\/[^)]+)\)\.?\s*$/.exec(value);
 if(!match)return null;
 return {body:value.slice(0,match.index).trim(),
  google:{label:match[1],url:match[2]},
  naver:{label:match[3],url:match[4]},
  source:{label:match[5],url:match[6]}};
}
function localNearbyQuery(blockId:string):string{
 const found=/-actual-place-([0-3])-b$/.exec(blockId);
 return ['사직로','자하문로','삼청동','안국'][Number(found?.[1]??0)];
}

/** Inline formatting parser for editorial plain text. HTML is never interpreted. */
export function InlineBlogText({value}:{value:string}){
 const pattern=/(\*\*[^*\n]{1,500}\*\*|\*[^*\n]{1,500}\*|\+\+[^+\n]{1,500}\+\+|\{color:#[0-9a-fA-F]{6}\|[^{}\n]{1,500}\}|\[[^\]\n]{1,120}\]\(https:\/\/[^\s)<>]{5,500}\))/g;
 const chunks=value.split(pattern);
 return <>{chunks.map((part,index)=>{
  if(part.startsWith('**')&&part.endsWith('**'))
   return <strong key={index}>{part.slice(2,-2)}</strong>;
  if(part.startsWith('*')&&part.endsWith('*'))
   return <em key={index}>{part.slice(1,-1)}</em>;
  if(part.startsWith('++')&&part.endsWith('++'))return <u key={index}>{part.slice(2,-2)}</u>;
  const colored=/^\{color:(#[0-9a-fA-F]{6})\|([^{}]+)\}$/.exec(part);
  if(colored)return <span key={index} style={{color:colored[1]}}>{colored[2]}</span>;
  const link=/^\[([^\]]+)\]\((https:\/\/[^\s)<>]+)\)$/.exec(part);
  if(link)return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer nofollow">
   {link[1]} <span aria-hidden="true">↗</span></a>;
  return <span key={index}>{part}</span>;
 })}</>;
}
export function BlogBody({blocks,preview=false,locale='ko'}:{blocks:BlogBlock[];preview?:boolean;locale?:string}){
 const nodes:ReactNode[]=blocks.map(b=>{
  const style={textAlign:b.align||'left',fontSize:b.font_size?b.font_size+'px':undefined} as const;
  if(b.type==='restaurant'&&b.restaurant_id)return <div key={b.id} className={styles.inlineRestaurantCard}><InlineBlogRestaurantCard id={b.restaurant_id} locale={locale}/></div>;
  if(b.type==='heading'){
   return b.level===3?<h3 key={b.id} style={style}><InlineBlogText value={b.text||''}/></h3>:
    <h2 key={b.id} style={style}><InlineBlogText value={b.text||''}/></h2>;
  }
  if(b.type==='paragraph'&&/-actual-place-[0-3]-b$/.test(b.id)){
   const actions=locationActions(b.text||'');
   if(actions){
    const nearbyLabel=locale==='en'?'Nearby dining':locale==='ja'?'周辺の飲食店':
     locale==='zh-CN'?'附近餐厅':'근처 맛집';
    const nearbyHref='/map?hl='+encodeURIComponent(locale)+'&q='+encodeURIComponent(localNearbyQuery(b.id));
    return <section key={b.id} className={styles.placeActionsPanel}>
      <p style={style}><InlineBlogText value={actions.body}/></p>
      <nav aria-label={locale==='ko'?'장소 지도와 맛집 링크':'Place navigation links'}
       className={styles.placeActions}>
       <a href={actions.google.url} target="_blank" rel="noopener noreferrer nofollow"
        className={styles.placeGoogle} aria-label={actions.google.label}>
        <span aria-hidden="true" className={styles.placeIcon}>📍</span>
        <span>{actions.google.label}</span><span aria-hidden="true">↗</span>
       </a>
       <a href={actions.naver.url} target="_blank" rel="noopener noreferrer nofollow"
        className={styles.placeNaver} aria-label={actions.naver.label}>
        <span aria-hidden="true" className={styles.placeIcon}>N</span>
        <span>{actions.naver.label}</span><span aria-hidden="true">↗</span>
       </a>
       <a href={nearbyHref} className={styles.placeNearby}>
        <span aria-hidden="true" className={styles.placeIcon}>🍴</span>
        <span>{nearbyLabel}</span><span aria-hidden="true">→</span>
       </a>
      </nav>
      <div className={styles.placeAttribution}><a href={actions.source.url} target="_blank"
       rel="noopener noreferrer nofollow">{actions.source.label} ↗</a></div>
     </section>;
   }
  }
  if(b.type==='paragraph')return <p key={b.id} style={style}><InlineBlogText value={b.text||''}/></p>;
  if(b.type==='quote')return <blockquote key={b.id} style={style}><InlineBlogText value={b.text||''}/></blockquote>;
  if(b.type==='list')return <ul key={b.id} style={style}>{(b.items||[]).map((s,i)=>
   <li key={i}><InlineBlogText value={s}/></li>)}</ul>;
  if(b.type==='table')return <div className={styles.tableScroll} key={b.id} style={style}>
   <table style={{borderCollapse:'collapse',tableLayout:b.table_col_widths?.length?'fixed':undefined,width:b.table_col_widths?.length?'max-content':undefined}}>{b.table_col_widths&&<colgroup>{b.table_col_widths.map((w,i)=><col key={i} style={{width:w+'px'}}/>)}</colgroup>}<thead><tr>{(b.rows?.[0]||[]).map((s,i)=>
     <th scope="col" key={i} style={{border:(b.table_border_width??1)+'px '+(b.table_border_style||'solid')+' '+(b.table_border_color||'#dae6df'),height:b.table_row_heights?.[0]+'px'}}><InlineBlogText value={s}/></th>)}</tr></thead>
   <tbody>{(b.rows||[]).slice(1).map((r,i)=><tr key={i} style={{height:b.table_row_heights?.[i+1]+'px'}}>
     {r.map((s,j)=><td key={j} style={{border:(b.table_border_width??1)+'px '+(b.table_border_style||'solid')+' '+(b.table_border_color||'#dae6df')}}><InlineBlogText value={s}/></td>)}
   </tr>)}</tbody></table></div>;
  if(b.type==='image'&&b.image_id){
   const placePhoto=/-actual-place-[0-3]-img-[ab]$/.test(b.id);
   return <figure key={b.id}
    className={placePhoto?styles.placeInlinePhoto:styles.inlineFigure}
    style={placePhoto?undefined:{...style,width:(b.image_width||100)+'%',maxWidth:'100%',marginLeft:b.align==='right'?'auto':b.align==='center'?'auto':0,marginRight:b.align==='left'?0:'auto'}}>
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={(preview?'/api/v1/owner/blog/images/':'/api/blog/images/')+b.image_id}
    alt={b.caption||'Editorial restaurant illustration'} loading="lazy"/>
   {b.caption&&<figcaption>{b.caption}</figcaption>}
  </figure>;
  }
  return <hr key={b.id}/>;
 });
 return <div className={styles.articleBody}>{nodes}</div>;
}
