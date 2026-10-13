// Deliberately uses only same-origin, server rights-gated media URLs.
// Never renders third-party hotlinks or unreviewed source photographs.
// Layout is confined to search/detail cards; DESIGN LOCK homepage stays intact.
type Photo={id:string;alt_ko:string|null;url:string};
const SAFE_MEDIA_URL=/^\/api\/v1\/images\/[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
export default function VerifiedRestaurantPhoto({
  image,restaurantName,variant='card',priority=false
}:{
  image:Photo|null|undefined;restaurantName:string;variant?:'card'|'detail';priority?:boolean
}){
  if(!image || !SAFE_MEDIA_URL.test(image.url))return null;
  const isDetail=variant==='detail';
  return <img
    src={image.url}
    alt={image.alt_ko?.trim()||restaurantName}
    width={isDetail?620:160}
    height={isDetail?360:108}
    loading={priority?"eager":"lazy"}
    fetchPriority={priority?"high":"auto"}
    decoding="async"
    style={{
      display:'block',
      width:isDetail?'100%':'160px',
      maxWidth:'100%',
      height:isDetail?'auto':'108px',
      maxHeight:isDetail?'360px':undefined,
      objectFit:'cover',
      borderRadius:'10px'
    }}
  />;
}
