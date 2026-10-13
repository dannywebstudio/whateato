import Link from 'next/link';
/** Render credit immediately adjacent to a Google Places photo.
 * The photo URL must be a same-origin, quota-guarded endpoint.
 * Never store Google photo names, returned media URLs, or raw metadata.
 */
export type PlacesPhotoCredit={
  photographer:string;photographerUrl:string|null;googleMapsUrl:string;
};
const safeHttps=(value:string|null)=>{if(!value)return null;try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}};
export default function GooglePlacesPhotoCredit({credit,locale='ko'}:{credit:PlacesPhotoCredit;locale?:string}){
 const map=safeHttps(credit.googleMapsUrl);
 if(!map)return null;
 const author=safeHttps(credit.photographerUrl);
 const label=locale==='en'?'Photo from Google Maps':locale==='ja'?'Google マップの写真':locale==='zh-CN'?'Google 地图照片':'Google 지도 제공 사진';
 return <div style={{fontSize:12,lineHeight:1.5,marginTop:4,color:'var(--muted,#626c75)'}}>
  <Link href={map} target="_blank" rel="noopener noreferrer">{label} ↗</Link>
  {credit.photographer.trim() ? <> · {author
    ? <Link href={author} target="_blank" rel="noopener noreferrer">{credit.photographer}</Link>
    : <span>{credit.photographer}</span>}</> : null}
 </div>;
}
