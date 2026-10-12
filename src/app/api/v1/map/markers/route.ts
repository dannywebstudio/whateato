import {NextRequest,NextResponse} from 'next/server';
import {getGeoCatalog,GeoInputError} from '@/lib/geo-catalog';
import {CatalogDatabaseUnavailable} from '@/lib/restaurant-catalog';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};

export async function GET(request:NextRequest){
  const p=request.nextUrl.searchParams;
  try{
    const result=await getGeoCatalog({
      mode:'viewport',bbox:p.get('bbox'),locale:p.get('hl'),q:p.get('q'),filters:p.get('f'),
      limit:p.has('limit')?Number(p.get('limit')):100
    });
    return NextResponse.json(result,{headers});
  }catch(e){
    const invalid=e instanceof GeoInputError;
    return NextResponse.json({error:invalid?e.message:e instanceof CatalogDatabaseUnavailable?
      'database_not_configured':'map_markers_unavailable'},{
      status:invalid?400:503,headers
    });
  }
}
