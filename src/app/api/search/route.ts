import {NextRequest,NextResponse} from 'next/server';
import {findRestaurants} from '@/lib/search';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams.get('q')||'';
  const f=request.nextUrl.searchParams.get('f')||'';
  const result=await findRestaurants(q,f);
  const status=result.ready?200:503;
  return NextResponse.json({query:q.slice(0,150),filters:result.filters,databaseReady:result.ready,restaurants:result.items,error:result.error||null},{
    status,headers:{'Cache-Control':'no-store'}
  });
}
