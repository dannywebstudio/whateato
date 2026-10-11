import {NextRequest,NextResponse} from 'next/server';
import {findRestaurants} from '@/lib/search';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
  const q=request.nextUrl.searchParams.get('q')||'';
  const result=await findRestaurants(q);
  return NextResponse.json({query:q.slice(0,150),databaseReady:result.ready,restaurants:result.items},{
    headers:{'Cache-Control':'no-store'}
  });
}
