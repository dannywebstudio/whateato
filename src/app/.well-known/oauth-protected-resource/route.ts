import {NextResponse} from 'next/server';
import {oauthEnabled,oauthOrigin} from '@/lib/agent-blog-oauth';
export const dynamic='force-dynamic';
export function GET(){
 const origin=oauthOrigin();
 if(!origin||!oauthEnabled())return NextResponse.json({error:'not_enabled'},{status:404});
 return NextResponse.json({
   resource:origin+'/mcp',
   authorization_servers:[origin],
   scopes_supported:['blog:read','blog:write'],
   bearer_methods_supported:['header']
 },{headers:{'Cache-Control':'public, max-age=300','Access-Control-Allow-Origin':'*'}});
}
export function OPTIONS(){
 return new Response(null,{status:204,headers:{
   'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS',
   'Access-Control-Allow-Headers':'Content-Type, Authorization'
 }});
}
