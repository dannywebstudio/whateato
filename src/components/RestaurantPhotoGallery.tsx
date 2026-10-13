'use client';
import {useState} from 'react';
import VerifiedRestaurantPhoto from '@/components/VerifiedRestaurantPhoto';
import s from './RestaurantPhotoGallery.module.css';
type Photo={id:string;alt_ko:string|null;url:string};
const copy={
 ko:{title:'식당 사진',prev:'이전 사진',next:'다음 사진'},
 en:{title:'Restaurant photos',prev:'Previous photos',next:'Next photos'},
 ja:{title:'店舗の写真',prev:'前の写真',next:'次の写真'},
 'zh-CN':{title:'餐厅照片',prev:'上一组',next:'下一组'}
} as const;
export default function RestaurantPhotoGallery({images,name,locale}:{images:Photo[];name:string;locale:string}){
 const [start,setStart]=useState(0);
 if(!images.length)return null;
 const t=copy[locale as keyof typeof copy]||copy.en;
 const carousel=images.length>3;
 const max=Math.max(0,images.length-1);
 return <section className={s.gallery} aria-label={t.title}>
   <div className={s.heading}><strong>{t.title}</strong>
     {carousel&&<div className={s.controls}>
       <button type="button" aria-label={t.prev} disabled={start===0}
         onClick={()=>setStart(x=>Math.max(0,x-1))}>‹</button>
       <span aria-live="polite">{start+1} / {images.length}</span>
       <button type="button" aria-label={t.next} disabled={start>=max}
         onClick={()=>setStart(x=>Math.min(max,x+1))}>›</button>
     </div>}
   </div>
   <div className={s.viewport}>
     <div className={s.track} style={{transform:`translateX(calc(-${start} * (100% / var(--gallery-count))))`,
       ['--gallery-count' as string]:images.length}}>
       {images.map((photo,i)=><div className={s.slide} key={photo.id}>
         <VerifiedRestaurantPhoto image={photo} restaurantName={name} variant="detail" priority={i===0}/>
       </div>)}
     </div>
   </div>
 </section>;
}
