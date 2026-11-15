import {NextResponse} from 'next/server';
import {oauthEnabled,oauthOrigin} from '@/lib/agent-blog-oauth';
export const dynamic='force-dynamic';
export function GET(){
 const origin=oauthOrigin();
 if(!origin||!oauthEnabled())return NextResponse.json({error:'not_enabled'},{status:404});
 return NextResponse.json({
   issuer:origin,
   authorization_endpoint:origin+'/api/agent/oauth/authorize',
   token_endpoint:origin+'/api/agent/oauth/token',
   registration_endpoint:origin+'/api/agent/oauth/register',
   response_types_supported:['code'],
   grant_types_supported:['authorization_code'],
   code_challenge_methods_supported:['S256'],
   token_endpoint_auth_methods_supported:['none'],
   scopes_supported:['blog:read','blog:write'],
   authorization_response_iss_parameter_supported:true,
   service_documentation:origin+'/blog'
 },{headers:{'Cache-Control':'public, max-age=300'}});
}
