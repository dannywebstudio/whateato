import {NextRequest,NextResponse} from 'next/server';
import {CatalogDatabaseUnavailable,searchRestaurantCatalog} from '@/lib/restaurant-catalog';
import {normalizeText} from '@/lib/platform-v1';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};

export async function GET(request:NextRequest){
  const p=request.nextUrl.searchParams;
  try {
    const result=await searchRestaurantCatalog({
      locale:p.get('hl'),q:p.get('q'),region:p.get('region'),filters:p.get('f'),
      limit:Number.parseInt(normalizeText(p.get('limit'),10),10),
      offset:Number.parseInt(normalizeText(p.get('offset'),10),10)
    });
    return NextResponse.json(result,{headers});
  }catch(error){
    return NextResponse.json({
      error:error instanceof CatalogDatabaseUnavailable?'database_not_configured':'restaurant_search_unavailable'
    },{status:503,headers});
  }
}
