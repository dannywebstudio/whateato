import {NextRequest,NextResponse} from 'next/server';
import {getRestaurantCatalogDetail,CatalogDatabaseUnavailable} from '@/lib/restaurant-catalog';
import {getGeoCatalog,type GeoMarker} from '@/lib/geo-catalog';
import {isUuid} from '@/lib/platform-v1';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store'};

// Exact restaurant UUID -> that approved venue followed by up to three
// truly nearby public restaurants, ordered by distance (never by name).
export async function GET(req:NextRequest){
 const id=req.nextUrl.searchParams.get('id')||'';
 if(!isUuid(id))return NextResponse.json({error:'invalid_restaurant_id'},{status:400,headers});
 try{
  const detail=await getRestaurantCatalogDetail(id,req.nextUrl.searchParams.get('hl'));
  if(!detail)return NextResponse.json({error:'restaurant_not_found'},{status:404,headers});
  const venue=detail.restaurant,lat=Number(venue.latitude),lon=Number(venue.longitude);
  if(venue.latitude===null||venue.longitude===null||!Number.isFinite(lat)||!Number.isFinite(lon)||
     lat<33||lat>39.5||lon<124||lon>132)
   return NextResponse.json({error:'restaurant_coordinates_unavailable'},{status:422,headers});
  let nearby:GeoMarker[]=[];
  for(const radius of [1,3,8,20]){
   const response=await getGeoCatalog({mode:'nearby',lat:String(lat),lon:String(lon),
    radius:String(radius),locale:req.nextUrl.searchParams.get('hl'),limit:60});
   nearby=response.items.filter(item=>item.id!==id);
   if(nearby.length>=3)break;
  }
  const selected:GeoMarker={
   id,name:venue.name,name_ko:venue.name_ko,address:venue.address,
   address_ko:venue.road_address_ko||venue.lot_address_ko,
   short_description:venue.short_description,main_menu:detail.menus[0]?.name||null,
   latitude:lat,longitude:lon,distance_km:0,category_code:venue.category_code,
   region_sigungu:venue.region_sigungu,card_accent_color:venue.card_accent_color||null,editorial_score:venue.editorial_score,visitor_score:venue.ratings.whateato?.rating??null,
   featured_image_url:detail.images[0]?.url??null,
   tags:detail.tags,opening_hours:venue.opening_hours
  };
  return NextResponse.json({focus_id:id,center:[lon,lat],
   items:[selected,...nearby.slice(0,3)],limit:4},{headers});
 }catch(e){
  return NextResponse.json({error:e instanceof CatalogDatabaseUnavailable?
   'database_not_configured':'nearby_restaurants_unavailable'},{status:503,headers});
 }
}
