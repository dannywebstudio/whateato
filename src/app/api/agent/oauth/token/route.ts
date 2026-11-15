import {NextRequest,NextResponse} from 'next/server';
import {exchangeCode,oauthEnabled} from '@/lib/agent-blog-oauth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Pragma':'no-cache'};
export async function POST(req:NextRequest){
 if(!oauthEnabled())return NextResponse.json({error:'server_error'},{status:503,headers});
 if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/x-www-form-urlencoded'))
   return NextResponse.json({error:'invalid_request'},{status:400,headers});
 if(Number(req.headers.get('content-length')||0)>5000)
   return NextResponse.json({error:'invalid_request'},{status:400,headers});
 const body=await req.text();
 if(body.length>5000)return NextResponse.json({error:'invalid_request'},{status:400,headers});
 const form=new URLSearchParams(body);
 if(form.get('grant_type')!=='authorization_code')
   return NextResponse.json({error:'unsupported_grant_type'},{status:400,headers});
 const code=form.get('code')||'',clientId=form.get('client_id')||'',
   redirectUri=form.get('redirect_uri')||'',verifier=form.get('code_verifier')||'';
 const result=await exchangeCode(code,clientId,redirectUri,verifier);
 if(!result)return NextResponse.json({error:'invalid_grant'},{status:400,headers});
 return NextResponse.json(result,{headers});
}
