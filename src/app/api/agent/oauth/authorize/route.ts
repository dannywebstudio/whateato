import {NextRequest,NextResponse} from 'next/server';
import {parseAuthorize} from '@/lib/agent-blog-oauth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(req:NextRequest){
 if(!parseAuthorize(req.nextUrl.searchParams))
   return NextResponse.json({error:'invalid_request'},{status:400,headers:{'Cache-Control':'no-store'}});
 const target=new URL('/agent/authorize',req.nextUrl.origin);
 target.search=req.nextUrl.search;
 return NextResponse.redirect(target,{status:302});
}
