'use client';
import {useEffect,useState} from 'react';
import GooglePlacesPhotoCredit from '@/components/GooglePlacesPhotoCredit';
type Author={displayName:string;uri:string|null};
type Preview={name:string;authors:Author[];googleMapsUri:string|null};
/** Opt-in staging-only photo display. Never prefetch beyond the first photo. */
export default function GooglePlacesPhotoPreview({restaurantId,restaurantName,locale='ko'}:{
 restaurantId:string;restaurantName:string;locale?:string
}){
 const [photo,setPhoto]=useState<{uri:string;data:Preview}|null>(null);
 useEffect(()=>{
  const controller=new AbortController();let active=true;
  const url='/api/v1/google-photo-preview/'+encodeURIComponent(restaurantId);
  (async()=>{
   try{
    const a=await fetch(url,{cache:'no-store',signal:controller.signal});
    if(!a.ok)return;
    const first=(await a.json()).photos?.[0] as Preview|undefined;
    if(!first?.name||!first.googleMapsUri)return;
    const b=await fetch(url+'?photo='+encodeURIComponent(first.name),{cache:'no-store',signal:controller.signal});
    if(!b.ok)return;
    const uri=(await b.json()).photoUri;
    if(active&&typeof uri==='string'&&uri.startsWith('https://'))setPhoto({uri,data:first});
   }catch{/* fail quietly; do not display unknown photos */}
  })();
  return ()=>{active=false;controller.abort()};
 },[restaurantId]);
 if(!photo)return null;
 return <figure style={{margin:0}}>
  <img src={photo.uri} alt={restaurantName+' · Google Maps photo'} loading="lazy"
    referrerPolicy="no-referrer" style={{width:'100%',height:'auto',maxHeight:360,objectFit:'cover',borderRadius:10}}/>
  <figcaption>
   <GooglePlacesPhotoCredit credit={{
    photographer:photo.data.authors.map(a=>a.displayName).filter(Boolean).join(', '),
    photographerUrl:photo.data.authors[0]?.uri||null,
    googleMapsUrl:photo.data.googleMapsUri!
   }} locale={locale}/>
  </figcaption>
 </figure>;
}
