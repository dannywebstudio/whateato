import {NextRequest,NextResponse} from 'next/server';
import {validateAuthorize,oauthOrigin} from '@/lib/agent-blog-oauth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(req:NextRequest){
 const validation=validateAuthorize(req.nextUrl.searchParams);
 if(!validation.input)
   // Deliberately return only a reason category, never client state, PKCE values,
   // redirect URI contents, bearer tokens or identity details.
   return NextResponse.json({error:'invalid_request',reason:validation.reason},
    {status:400,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});
 const target=new URL('/agent/authorize',oauthOrigin()!);
 target.search=req.nextUrl.search;
 return NextResponse.redirect(target,{status:302});
}
