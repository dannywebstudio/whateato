import {NextRequest,NextResponse} from 'next/server';
import {boundedJson} from '@/lib/bulk-content-admin';
import {oauthEnabled,registerClient} from '@/lib/agent-blog-oauth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
export async function POST(req:NextRequest){
 if(!oauthEnabled())return NextResponse.json({error:'temporarily_unavailable'},{status:503,headers});
 const body=await boundedJson(req,8000);
 if(!body.ok)return NextResponse.json({error:'invalid_client_metadata'},{status:400,headers});
 const p=body.value;
 if(!p||typeof p!=='object'||Array.isArray(p))return NextResponse.json({error:'invalid_client_metadata'},{status:400,headers});
 const data=p as Record<string,unknown>;
 if(!Array.isArray(data.redirect_uris)||
   data.redirect_uris.some(x=>typeof x!=='string')||
   (data.token_endpoint_auth_method!==undefined&&data.token_endpoint_auth_method!=='none')||
   (data.grant_types!==undefined&&JSON.stringify(data.grant_types)!==JSON.stringify(['authorization_code'])))
   return NextResponse.json({error:'invalid_client_metadata'},{status:400,headers});
 const name=typeof data.client_name==='string'?data.client_name:'ChatGPT WhatEatO Publisher';
 const clientId=registerClient({name,redirectUris:data.redirect_uris});
 if(!clientId)return NextResponse.json({error:'invalid_redirect_uri'},{status:400,headers});
 return NextResponse.json({
   client_id:clientId,client_id_issued_at:Math.floor(Date.now()/1000),
   client_name:name,redirect_uris:data.redirect_uris,
   token_endpoint_auth_method:'none',grant_types:['authorization_code'],
   response_types:['code']
 },{status:201,headers});
}
