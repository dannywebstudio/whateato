'use client';
import {useEffect,useState} from 'react';
type Photo={url:string;alt:string};
const words={
 ko:{view:'사진 확대보기',close:'닫기',previous:'이전 사진',next:'다음 사진'},
 en:{view:'Enlarge photo',close:'Close',previous:'Previous photo',next:'Next photo'},
 ja:{view:'写真を拡大',close:'閉じる',previous:'前の写真',next:'次の写真'},
 'zh-CN':{view:'放大照片',close:'关闭',previous:'上一张',next:'下一张'}
} as const;
export default function PhotoLightbox({photos,initialIndex=0,locale='en',mode='thumbnail',restaurantId}:{
 photos:Photo[];initialIndex?:number;locale?:string;mode?:'thumbnail'|'gallery';restaurantId?:string
}){
 const t=words[(locale in words?locale:'en') as keyof typeof words];
 const [open,setOpen]=useState(false);
 const [index,setIndex]=useState(initialIndex);
 const [active,setActive]=useState(photos);
 const [loading,setLoading]=useState(false);
 useEffect(()=>{
  if(!open)return;
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')setOpen(false);
   if(event.key==='ArrowLeft')setIndex(i=>(i+active.length-1)%active.length);
   if(event.key==='ArrowRight')setIndex(i=>(i+1)%active.length);};
  window.addEventListener('keydown',escape);
  return ()=>window.removeEventListener('keydown',escape);
 },[open,active.length]);
 if(!photos.length)return null;
 const launch=async()=>{
  setActive(photos);setIndex(initialIndex);setOpen(true);
  if(!restaurantId)return;
  setLoading(true);
  try{
   const response=await fetch('/api/restaurants/'+encodeURIComponent(restaurantId)+'/gallery',{cache:'no-store'});
   if(response.ok){const data=await response.json();const more:Array<Photo>=Array.isArray(data.images)?data.images:[];
    if(more.length){setActive(more);setIndex(Math.min(initialIndex,more.length-1))}}
  }catch{}finally{setLoading(false)}
 };
 // Review photographs open a separate browser page for native enlarged viewing.
 if(mode==='thumbnail')return <a href={photos[initialIndex].url} target="_blank" rel="noopener noreferrer"
  aria-label={t.view} style={{display:'inline-block',cursor:'zoom-in'}}>
  {/* eslint-disable-next-line @next/next/no-img-element */}
  <img src={photos[initialIndex].url} alt={photos[initialIndex].alt} loading="lazy"
   style={{width:94,height:94,objectFit:'cover',borderRadius:6}}/>
 </a>;
 return <>
  <button type="button" onClick={()=>void launch()} aria-label={t.view}
   style={{border:0,padding:0,cursor:'zoom-in',width:'100%',height:'100%',background:'transparent'}}>
   {/* eslint-disable-next-line @next/next/no-img-element */}
   <img src={photos[0].url} alt={photos[0].alt} loading="lazy"
    style={{display:'block',width:'100%',height:'100%',objectFit:'cover'}}/>
  </button>
  {open&&<div role="dialog" aria-modal="true" aria-label={t.view}
    onClick={()=>setOpen(false)} style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(7,14,11,.92)',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
    <button type="button" onClick={()=>setOpen(false)} aria-label={t.close}
     style={{position:'absolute',right:22,top:20,color:'white',background:'transparent',border:0,fontSize:32,cursor:'pointer'}}>×</button>
    {active.length>1&&<button type="button" aria-label={t.previous}
     onClick={event=>{event.stopPropagation();setIndex(i=>(i+active.length-1)%active.length)}}
     style={{position:'absolute',left:15,top:'50%',fontSize:38,color:'white',background:'#0006',border:0,borderRadius:8,cursor:'pointer'}}>‹</button>}
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img src={active[index]?.url} alt={active[index]?.alt||''} onClick={event=>event.stopPropagation()}
      style={{maxWidth:'90vw',maxHeight:'84vh',objectFit:'contain'}}/>
    {active.length>1&&<button type="button" aria-label={t.next}
     onClick={event=>{event.stopPropagation();setIndex(i=>(i+1)%active.length)}}
     style={{position:'absolute',right:15,top:'50%',fontSize:38,color:'white',background:'#0006',border:0,borderRadius:8,cursor:'pointer'}}>›</button>}
    <span style={{position:'absolute',bottom:16,color:'white',fontSize:12}}>{loading?'…':(index+1)+' / '+active.length}</span>
  </div>}
 </>;
}
