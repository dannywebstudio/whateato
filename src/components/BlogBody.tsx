import type {ReactNode} from 'react';
import type {BlogBlock} from '@/lib/blog-model';
import styles from '@/app/blog/blog.module.css';
/** Inline formatting parser for editorial plain text. HTML is never interpreted. */
export function InlineBlogText({value}:{value:string}){
 const pattern=/(\*\*[^*\n]{1,500}\*\*|\*[^*\n]{1,500}\*|\[[^\]\n]{1,120}\]\(https:\/\/[^\s)<>]{5,500}\))/g;
 const chunks=value.split(pattern);
 return <>{chunks.map((part,index)=>{
  if(part.startsWith('**')&&part.endsWith('**'))
   return <strong key={index}>{part.slice(2,-2)}</strong>;
  if(part.startsWith('*')&&part.endsWith('*'))
   return <em key={index}>{part.slice(1,-1)}</em>;
  const link=/^\[([^\]]+)\]\((https:\/\/[^\s)<>]+)\)$/.exec(part);
  if(link)return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer nofollow">
   {link[1]} <span aria-hidden="true">↗</span></a>;
  return <span key={index}>{part}</span>;
 })}</>;
}
export function BlogBody({blocks,preview=false}:{blocks:BlogBlock[];preview?:boolean}){
 const nodes:ReactNode[]=blocks.map(b=>{
  if(b.type==='heading'){
   return b.level===3?<h3 key={b.id}><InlineBlogText value={b.text||''}/></h3>:
    <h2 key={b.id}><InlineBlogText value={b.text||''}/></h2>;
  }
  if(b.type==='paragraph')return <p key={b.id}><InlineBlogText value={b.text||''}/></p>;
  if(b.type==='quote')return <blockquote key={b.id}><InlineBlogText value={b.text||''}/></blockquote>;
  if(b.type==='list')return <ul key={b.id}>{(b.items||[]).map((s,i)=>
   <li key={i}><InlineBlogText value={s}/></li>)}</ul>;
  if(b.type==='table')return <div className={styles.tableScroll} key={b.id}>
   <table><thead><tr>{(b.rows?.[0]||[]).map((s,i)=>
     <th scope="col" key={i}><InlineBlogText value={s}/></th>)}</tr></thead>
   <tbody>{(b.rows||[]).slice(1).map((r,i)=><tr key={i}>
     {r.map((s,j)=><td key={j}><InlineBlogText value={s}/></td>)}
   </tr>)}</tbody></table></div>;
  if(b.type==='image'&&b.image_id)return <figure key={b.id} className={styles.inlineFigure}>
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={(preview?'/api/v1/owner/blog/images/':'/api/blog/images/')+b.image_id}
    alt={b.caption||'Editorial restaurant photograph'} loading="lazy"/>
   {b.caption&&<figcaption>{b.caption}</figcaption>}
  </figure>;
  return <hr key={b.id}/>;
 });
 return <div className={styles.articleBody}>{nodes}</div>;
}
