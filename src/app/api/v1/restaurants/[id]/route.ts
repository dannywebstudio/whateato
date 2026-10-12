import {NextRequest,NextResponse} from 'next/server';
import {CatalogDatabaseUnavailable,getRestaurantCatalogDetail} from '@/lib/restaurant-catalog';
import {isUuid} from '@/lib/platform-v1';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
type Context={params:Promise<{id:string}>};

export async function GET(request:NextRequest,{params}:Context){
  const {id}=await params;
  if(!isUuid(id))return NextResponse.json({error:'invalid_restaurant_id'},{status:400,headers});
  try{
    const result=await getRestaurantCatalogDetail(id,request.nextUrl.searchParams.get('hl'));
    if(!result)return NextResponse.json({error:'restaurant_not_found'},{status:404,headers});
    return NextResponse.json(result,{headers});
  }catch(error){
    return NextResponse.json({
      error:error instanceof CatalogDatabaseUnavailable?'database_not_configured':'restaurant_details_unavailable'
    },{status:503,headers});
  }
}
