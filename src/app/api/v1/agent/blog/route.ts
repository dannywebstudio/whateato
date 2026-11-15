import {NextRequest,NextResponse} from 'next/server';
import {authorizedBlogAgent} from '@/lib/agent-blog-auth';
import {boundedJson} from '@/lib/bulk-content-admin';
import {agentBlogStatus,saveAgentBlog} from '@/lib/agent-blog-service';
import {ownerHeaders} from '@/lib/owner-cms-auth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(req:NextRequest){
 if(!await authorizedBlogAgent(req))return NextResponse.json({error:'unauthorized'},{status:401,headers:ownerHeaders});
 return agentBlogStatus(req.nextUrl.searchParams.get('slug')||'');
}
export async function POST(req:NextRequest){
 const ownerId=await authorizedBlogAgent(req);
 if(!ownerId)return NextResponse.json({error:'unauthorized'},{status:401,headers:ownerHeaders});
 const body=await boundedJson(req,180000);
 if(!body.ok)return NextResponse.json({error:body.error},{status:body.status,headers:ownerHeaders});
 return saveAgentBlog(body.value,ownerId);
}
