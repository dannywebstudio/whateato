import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';

export type OAuthClient={name:string;redirectUris:string[]};
export type BlogGrant={ownerId:string;scopes:string[];clientId:string;exp:number};
type Signed<T>={kind:string;payload:T};
const encoder=(data:unknown)=>Buffer.from(JSON.stringify(data),'utf8').toString('base64url');
const secureEq=(a:string,b:string)=>{
 const x=Buffer.from(a),y=Buffer.from(b);
 return x.length===y.length&&timingSafeEqual(x,y);
};
export const digest=(text:string)=>createHash('sha256').update(text).digest('hex');
export function oauthOrigin(){
 const url=process.env.WHATEATO_OWNER_CANONICAL_ORIGIN||process.env.NEXT_PUBLIC_SITE_URL||'';
 try{
  const parsed=new URL(url);
  if(parsed.protocol!=='https:'||parsed.pathname!=='/'||parsed.search||parsed.hash)return null;
  return parsed.origin;
 }catch{return null}
}
function secret(){
 const key=process.env.WHATEATO_BLOG_OAUTH_SECRET||'';
 return key.length>=40?key:null;
}
export function oauthEnabled(){
 return Boolean(process.env.WHATEATO_BLOG_AGENT_ENABLED==='true'&&oauthOrigin()&&secret());
}
function sign<T>(kind:string,payload:T){
 const key=secret();
 if(!key)throw Error('oauth_unconfigured');
 const body=encoder({kind,payload});
 const signature=createHmac('sha256',key).update(body).digest('base64url');
 return body+'.'+signature;
}
function verify<T>(value:string,kind:string):T|null{
 const key=secret();
 if(!key||value.length>6000||!value.includes('.'))return null;
 const parts=value.split('.');
 if(parts.length!==2)return null;
 const signature=createHmac('sha256',key).update(parts[0]).digest('base64url');
 if(!secureEq(signature,parts[1]))return null;
 try{
  const parsed=JSON.parse(Buffer.from(parts[0],'base64url').toString('utf8')) as Signed<T>;
  return parsed.kind===kind?parsed.payload:null;
 }catch{return null}
}
/** Only explicitly known ChatGPT OAuth callback endpoints may be registered. */
export function allowedRedirect(url:string){
 try{
  const r=new URL(url);
  if(r.protocol!=='https:'||r.username||r.password||r.hash)return false;
  if(r.hostname!=='chatgpt.com'&&r.hostname!=='chat.openai.com')return false;
  return /^\/connector\/oauth\/[A-Za-z0-9_-]{1,160}$/.test(r.pathname)||
    (r.pathname==='/connector_platform_oauth_redirect');
 }catch{return false}
}
export function registerClient(client:OAuthClient){
 if(!oauthEnabled())throw Error('oauth_unconfigured');
 if(client.redirectUris.length<1||client.redirectUris.length>4||
   client.redirectUris.some(uri=>!allowedRedirect(uri))||
   client.name.length>90)return null;
 return 'wto_'+sign('client',client);
}
export function getClient(clientId:string):OAuthClient|null{
 if(!clientId.startsWith('wto_'))return null;
 const p=verify<OAuthClient>(clientId.slice(4),'client');
 if(!p||!Array.isArray(p.redirectUris)||p.redirectUris.some(uri=>!allowedRedirect(uri))||
   typeof p.name!=='string')return null;
 return p;
}
export type AuthorizeInput={
 clientId:string;redirectUri:string;state:string;
 codeChallenge:string;scope:string;resource:string
};
export function parseAuthorize(query:URLSearchParams):AuthorizeInput|null{
 const origin=oauthOrigin();if(!origin||!oauthEnabled())return null;
 const clientId=query.get('client_id')||'',client=getClient(clientId);
 const redirectUri=query.get('redirect_uri')||'';
 const codeChallenge=query.get('code_challenge')||'';
 const state=query.get('state')||'';
 const scope=query.get('scope')||'blog:read blog:write';
 const resource=query.get('resource')||origin+'/mcp';
 if(query.get('response_type')!=='code'||query.get('code_challenge_method')!=='S256'||
   !client||!client.redirectUris.includes(redirectUri)||
   !/^[A-Za-z0-9_-]{43,128}$/.test(codeChallenge)||
   state.length<8||state.length>1024||
   resource!==origin+'/mcp'||
   !['blog:read','blog:read blog:write'].includes(scope))return null;
 return {clientId,redirectUri,state,codeChallenge,scope,resource};
}
export async function createAuthorizationCode(data:AuthorizeInput,ownerId:string){
 if(!isUuid(ownerId))throw Error('owner_required');
 const pool=getPool();if(!pool)throw Error('database_unavailable');
 const code=randomBytes(32).toString('base64url');
 await pool.query(`
   INSERT INTO whateato_blog_agent_oauth_codes
      (code_hash,client_id,redirect_uri,code_challenge,owner_account_id,scope,expires_at)
   VALUES($1,$2,$3,$4,$5,$6,now()+interval '10 minutes')`,
   [digest(code),data.clientId,data.redirectUri,data.codeChallenge,ownerId,data.scope]);
 return code;
}
export async function exchangeCode(code:string,clientId:string,redirectUri:string,verifier:string){
 if(!oauthEnabled()||code.length>200||!getClient(clientId)?.redirectUris.includes(redirectUri)||
   !/^[A-Za-z0-9._~-]{43,128}$/.test(verifier))return null;
 const pool=getPool();if(!pool)return null;
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const rows=await client.query<{code_challenge:string;owner_account_id:string;scope:string}>(`
    SELECT code_challenge,owner_account_id::text,scope
    FROM whateato_blog_agent_oauth_codes
    WHERE code_hash=$1 AND client_id=$2 AND redirect_uri=$3 AND used_at IS NULL
      AND expires_at>now() FOR UPDATE`,[digest(code),clientId,redirectUri]);
  if(!rows.rowCount){await client.query('ROLLBACK');return null}
  const row=rows.rows[0];
  const challenge=createHash('sha256').update(verifier).digest('base64url');
  if(!secureEq(challenge,row.code_challenge)){
    await client.query('ROLLBACK');return null;
  }
  const authorized=await client.query(`
    SELECT 1 FROM whateato_admin_accounts
    WHERE account_id=$1 AND role='owner' AND enabled=true LIMIT 1`,[row.owner_account_id]);
  if(!authorized.rowCount){await client.query('ROLLBACK');return null}
  await client.query(`
    UPDATE whateato_blog_agent_oauth_codes SET used_at=now() WHERE code_hash=$1`,[digest(code)]);
  await client.query('COMMIT');
  const now=Math.floor(Date.now()/1000),lifetime=60*60*24*7;
  const grant:BlogGrant={ownerId:row.owner_account_id,
    clientId,scopes:row.scope.split(' '),exp:now+lifetime};
  const access_token='wtoat_'+sign('access',grant);
  return {access_token,token_type:'Bearer',expires_in:lifetime,scope:row.scope};
 }catch{await client.query('ROLLBACK').catch(()=>{});return null}
 finally{client.release()}
}
export async function validateAgentAccess(token:string):Promise<BlogGrant|null>{
 if(!oauthEnabled()||!token.startsWith('wtoat_'))return null;
 const parsed=verify<BlogGrant>(token.slice(6),'access');
 const origin=oauthOrigin();
 if(!origin||!parsed||!isUuid(parsed.ownerId)||
   typeof parsed.clientId!=='string'||!getClient(parsed.clientId)||
   !Array.isArray(parsed.scopes)||!parsed.scopes.includes('blog:read')||
   !Number.isInteger(parsed.exp)||parsed.exp<Math.floor(Date.now()/1000))return null;
 const pool=getPool();if(!pool)return null;
 try{
  const r=await pool.query(`
    SELECT 1 FROM whateato_admin_accounts
    WHERE account_id=$1 AND role='owner' AND enabled=true LIMIT 1`,[parsed.ownerId]);
  return r.rowCount?parsed:null;
 }catch{return null}
}
