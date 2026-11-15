import {redirect} from 'next/navigation';
import {signIn,authReady} from '@/auth';
import {currentStaff} from '@/lib/owner-cms-auth';
import {oauthOrigin,parseAuthorize,getClient,createConsentTicket,verifyConsentTicket,createAuthorizationCode} from '@/lib/agent-blog-oauth';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const metadata={title:'WhatEatO · ChatGPT authorization',robots:{index:false,follow:false}};
type Props={searchParams:Promise<Record<string,string|string[]|undefined>>};
const single=(v:string|string[]|undefined)=>typeof v==='string'?v:undefined;
export default async function BlogAgentAuthorize({searchParams}:Props){
 const raw=await searchParams;
 const params=new URLSearchParams();
 for(const [k,v] of Object.entries(raw)){const value=single(v);if(value)params.set(k,value)}
 const input=parseAuthorize(params),origin=oauthOrigin();
 if(!input||!origin)return <main style={{maxWidth:550,margin:'10vh auto',padding:24}}><h1>연결 요청이 올바르지 않아</h1><p>WhatEatO로 돌아가 연결을 다시 요청해 줘.</p></main>;
 const staff=await currentStaff();
 const continueUrl='/agent/authorize?'+params.toString();
 if(!staff){
   return <main style={{maxWidth:560,margin:'10vh auto',padding:24,fontFamily:'sans-serif'}}>
     <h1>WhatEatO 관리자 인증</h1>
     <p>ChatGPT와 WhatEatO를 연결하려면 소유자 Google 계정으로 로그인해야 해.</p>
     {authReady()?<form action={async()=>{'use server';await signIn('google',{redirectTo:continueUrl})}}>
       <button type="submit" style={{padding:'12px 18px'}}>Google 관리자로 로그인</button>
     </form>:<p>로그인이 설정되지 않았어. 서버의 AUTH 설정을 확인해 줘.</p>}
   </main>;
 }
 if(staff.role!=='owner')return <main style={{maxWidth:550,margin:'10vh auto',padding:24}}><h1>Owner 전용</h1></main>;
 const client=getClient(input.clientId);
 const ticket=createConsentTicket(input,staff.accountId);
 async function approve(form:FormData){
   'use server';
   const acting=await currentStaff();
   if(!acting||acting.role!=='owner'||!input||!origin||
      !verifyConsentTicket(String(form.get('ticket')||''),input,acting.accountId))
     throw Error('unauthorized_oauth_consent');
   const code=await createAuthorizationCode(input,acting.accountId);
   const destination=new URL(input.redirectUri);
   destination.searchParams.set('code',code);
   destination.searchParams.set('state',input.state);
   destination.searchParams.set('iss',origin);
   redirect(destination.toString());
 }
 return <main style={{maxWidth:590,margin:'9vh auto',padding:28,fontFamily:'sans-serif',lineHeight:1.6}}>
   <h1>ChatGPT에 WhatEatO 블로그 관리 권한을 줄까?</h1>
   <p><strong>연결 앱:</strong> {client?.name||'ChatGPT'}</p>
   <p>현재 로그인한 WhatEatO Owner 계정으로 다음 권한을 승인하는 거야.</p>
   <ul>
     <li>게시글 제목·상태 확인</li>
     <li>한국어·영어·일본어·중국어 초안 작성 및 수정</li>
     {input.scope.includes('blog:write')&&<li>4개 언어 게시물 발행</li>}
   </ul>
   <p style={{color:'#8a3c1b'}}>게시한 콘텐츠가 공개될 수 있어. 신뢰하는 연결에만 권한을 허용해 줘.</p>
   <form action={approve}><input type="hidden" name="ticket" value={ticket}/>
     <button type="submit" style={{padding:'12px 18px',borderRadius:8,background:'#126b48',color:'white',border:0,cursor:'pointer'}}>WhatEatO 연결 승인</button>
   </form>
 </main>;
}
