import VerifiedRestaurantPhoto from '@/components/VerifiedRestaurantPhoto';
type Photo={id:string;alt_ko:string|null;url:string};
export default function RestaurantPhotoGallery({images,name,locale}:{images:Photo[];name:string;locale:string}){
  if(!images.length)return null;
  const more={ko:'식당 사진',en:'Restaurant photos',ja:'店舗の写真','zh-CN':'餐厅照片'} as const;
  const heading=more[locale as keyof typeof more]||more.ko;
  return <section aria-label={heading} style={{marginBlock:'16px 22px'}}>
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,220px),1fr))',gap:10}}>
      {images.slice(0,6).map((photo,i)=><div key={photo.id} style={{minWidth:0,overflow:'hidden',borderRadius:12}}>
        <VerifiedRestaurantPhoto image={photo} restaurantName={name} variant="detail" priority={i===0}/>
      </div>)}
    </div>
  </section>;
}
