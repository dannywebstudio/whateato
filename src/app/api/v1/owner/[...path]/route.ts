import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {isUuid} from '@/lib/platform-v1';
import {GET as batchesGET,POST as batchesPOST} from '@/app/api/v1/admin/bulk/batches/route';
import {GET as batchGET} from '@/app/api/v1/admin/bulk/batches/[id]/route';
import {POST as itemsPOST} from '@/app/api/v1/admin/bulk/batches/[id]/items/route';
import {POST as actionsPOST} from '@/app/api/v1/admin/bulk/batches/[id]/actions/route';
import {GET as reviewsGET} from '@/app/api/v1/admin/reviews/route';
import {PATCH as reviewsPATCH} from '@/app/api/v1/admin/reviews/[id]/route';

// This is a SAME-ORIGIN BFF, never a transparent upstream proxy.
// Server-only bearer secrets remain on the server; browser sees only Auth.js cookies.
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{path:string[]}>};
const deny=(error:string,status:number)=>NextResponse.json({error},{status,headers:ownerHeaders});
async function dispatch(req:NextRequest,ctx:Ctx,method:'GET'|'POST'|'PATCH'){
  const staff=await currentStaff();
  if(!staff)return deny('admin_login_or_grant_required',403);
  if(method!=='GET'&&!safeSameOrigin(req))return deny('cross_site_request',403);
  const p=(await ctx.params).path;
  if(!Array.isArray(p)||p.length>4)return deny('route_not_found',404);
  const review=p[0]==='reviews';
  if(review&&!hasPermission(staff,'moderate'))return deny('insufficient_role',403);
  if(!review&&!hasPermission(staff,'edit'))return deny('insufficient_role',403);
  if(p[0]!=='bulk'&&!review)return deny('route_not_found',404);
  const isCollection=p[0]==='bulk'&&p[1]==='batches'&&p.length===2;
  const id=p[0]==='bulk'&&p[1]==='batches'&&p.length>=3?p[2]:null;
  const isSingle=id!==null&&isUuid(id)&&p.length===3;
  const isItems=id!==null&&isUuid(id)&&p[3]==='items'&&p.length===4;
  const isActions=id!==null&&isUuid(id)&&p[3]==='actions'&&p.length===4;
  const isReviewQueue=review&&p.length===1;
  const reviewId=review&&p.length===2&&isUuid(p[1])?p[1]:null;
  if(!isCollection&&!isSingle&&!isItems&&!isActions&&!isReviewQueue&&!reviewId)
    return deny('route_not_found',404);
  let body:string|undefined;
  if(method!=='GET'){
    const max=isItems?524288:4096;
    if(Number(req.headers.get('content-length')||0)>max)return deny('payload_too_large',413);
    body=await req.text();
    if(Buffer.byteLength(body,'utf8')>max)return deny('payload_too_large',413);
    if(isActions){
      let action:unknown;
      try{action=(JSON.parse(body) as {action?:unknown}).action}catch{return deny('invalid_json',400)}
      if((action==='approve'||action==='apply'||action==='reject')&&!hasPermission(staff,'publish'))
        return deny('owner_approval_required',403);
    }
  }
  const token=review?process.env.WHATEATO_REVIEW_ADMIN_TOKEN:process.env.WHATEATO_BULK_ADMIN_TOKEN;
  if(!token||token.length<32)return deny('admin_backend_disabled',503);
  const upstream=new URL(review?'/api/v1/admin/reviews':'/api/v1/admin/bulk/batches',req.url);
  if(id)upstream.pathname+='/'+id+(isItems?'/items':isActions?'/actions':'');
  if(reviewId)upstream.pathname+='/'+reviewId;
  upstream.search=req.nextUrl.search;
  const internal=new NextRequest(upstream,{
    method,headers:{Authorization:'Bearer '+token,...(body?{'Content-Type':'application/json'}:{})},
    ...(body!==undefined?{body}: {})
  });
  const params={params:Promise.resolve({id:reviewId||id||''})};
  let out:NextResponse;
  if(isCollection&&method==='GET')out=await batchesGET(internal);
  else if(isCollection&&method==='POST')out=await batchesPOST(internal);
  else if(isSingle&&method==='GET')out=await batchGET(internal,params);
  else if(isItems&&method==='POST')out=await itemsPOST(internal,params);
  else if(isActions&&method==='POST')out=await actionsPOST(internal,params);
  else if(isReviewQueue&&method==='GET')out=await reviewsGET(internal);
  else if(reviewId&&method==='PATCH')out=await reviewsPATCH(internal,params);
  else return deny('method_not_allowed',405);
  return new NextResponse(out.body,{status:out.status,headers:{...ownerHeaders,'Content-Type':'application/json'}});
}
export async function GET(req:NextRequest,ctx:Ctx){return dispatch(req,ctx,'GET')}
export async function POST(req:NextRequest,ctx:Ctx){return dispatch(req,ctx,'POST')}
export async function PATCH(req:NextRequest,ctx:Ctx){return dispatch(req,ctx,'PATCH')}
