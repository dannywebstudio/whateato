import {NextResponse} from 'next/server';
import {getRestaurantCatalogDetail} from '@/lib/restaurant-catalog';
import {getPublicReviews} from '@/lib/reviews';
import {isUuid} from '@/lib/platform-v1';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
// Delivers only published, rights-approved venue media and approved visitor photos.
// Never leaks private review files or moderation-pending attachments.
export async function GET(_req:Request,{params}:Ctx){
 const {id}=await params;
 if(!isUuid(id))return NextResponse.json({error:'invalid_id'},{status:400});
 try{
  const detail=await getRestaurantCatalogDetail(id,'ko');
  if(!detail)return NextResponse.json({error:'not_found'},{status:404});
  const reviews=await getPublicReviews(id);
  const result=[...detail.images.map(p=>({url:p.url,alt:p.alt_ko||detail.restaurant.name})),
   ...reviews.flatMap(r=>r.photos.map(p=>({url:p.url,alt:detail.restaurant.name})))];
  const uniq=Array.from(new Map(result.map(p=>[p.url,p])).values()).slice(0,80);
  return NextResponse.json({images:uniq},{headers:{'Cache-Control':'public, max-age=30, s-maxage=60'}});
 }catch{return NextResponse.json({error:'gallery_unavailable'},{status:503})}
}
