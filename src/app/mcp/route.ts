import {createMcpHandler,withMcpAuth} from 'mcp-handler';
import type {AuthInfo} from '@modelcontextprotocol/server';
import {z} from 'zod';
import {validateAgentAccess} from '@/lib/agent-blog-oauth';
import {agentBlogStatus,agentBlogDraft,saveAgentBlog} from '@/lib/agent-blog-service';
import {agentBlogMediaStatus,agentUploadBlogImage,agentReviewBlogImage} from '@/lib/agent-blog-media-service';

export const runtime='nodejs';
export const dynamic='force-dynamic';

const validSlug=z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(90);
const draft=z.object({
 category:z.string(),tags:z.array(z.string()),
 related_restaurant_ids:z.array(z.string()),
 translations:z.record(z.string(),z.unknown())
});
const resultText=async(response:Response)=>{
 const value=await response.json();
 return {content:[{type:'text' as const,text:JSON.stringify(value)}],
   isError:response.status>=400};
};
const handler=createMcpHandler(server=>{
 server.registerTool('whateato_blog_status',{
  title:'Check WhatEatO blog publication status',
  description:'Read persisted article revision, visibility, publication time and language URLs by slug. Use before updating an existing article.',
  inputSchema:z.object({slug:validSlug}),
  annotations:{readOnlyHint:true}
 },async({slug})=>resultText(await agentBlogStatus(slug)));

 server.registerTool('whateato_read_blog_draft',{
  title:'Read WhatEatO four-language blog draft',
  description:'Read existing editorial draft and revision. Requires authenticated owner. Use for editing articles without overwriting newer changes.',
  inputSchema:z.object({slug:validSlug}),
  annotations:{readOnlyHint:true}
 },async({slug})=>resultText(await agentBlogDraft(slug)));

 server.registerTool('whateato_save_blog_draft',{
  title:'Save a WhatEatO blog draft (not publicly published)',
  description:'Create or edit a WhatEatO blog draft. For existing slugs expected_revision from status/draft read is required. Does not publish and preserves existing public snapshot.',
  inputSchema:z.object({slug:validSlug,draft,expected_revision:z.number().int().positive().optional()}),
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false}
 },async({slug,draft,expected_revision},ctx)=>{
  const info=ctx.http?.authInfo;
  const ownerId=(info?.extra as {ownerId?:string}|undefined)?.ownerId;
  if(!ownerId||!info?.scopes?.includes('blog:write'))
    return {isError:true,content:[{type:'text' as const,text:'Draft editing requires blog:write owner grant'}]};
  const input={slug,draft,mode:'draft',...(expected_revision?{expected_revision}:{})};
  if(Buffer.byteLength(JSON.stringify(input))>180000)
   return {isError:true,content:[{type:'text' as const,text:'Draft exceeds 180KB upload limit'}]};
  return resultText(await saveAgentBlog(input,ownerId));
 });

 server.registerTool('whateato_publish_blog',{
  title:'Publish a WhatEatO blog to the public website',
  description:'Publicly publishes a complete approved four-language article to WhatEatO. Call ONLY when the user explicitly requests publication; confirm exact title and destination. Validates localization, media rights, and editor revision. For existing slugs expected_revision is required.',
  inputSchema:z.object({slug:validSlug,draft,expected_revision:z.number().int().positive().optional()}),
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false,openWorldHint:true}
 },async({slug,draft,expected_revision},ctx)=>{
  const info=ctx.http?.authInfo;
  const ownerId=(info?.extra as {ownerId?:string}|undefined)?.ownerId;
  if(!ownerId||!info?.scopes?.includes('blog:write'))
   return {isError:true,content:[{type:'text' as const,text:'Publishing requires blog:write owner grant'}]};
  const input={slug,draft,mode:'publish',...(expected_revision?{expected_revision}:{})};
  if(Buffer.byteLength(JSON.stringify(input))>180000)
   return {isError:true,content:[{type:'text' as const,text:'Draft exceeds 180KB upload limit'}]};
  return resultText(await saveAgentBlog(input,ownerId));
 });

 server.registerTool('whateato_blog_media_status',{
  title:'Check blog image rights and minimum three-photo readiness',
  description:'Read the existing article media library by slug, including approved/pending rights, image UUIDs and each language version readiness. Use before editing image blocks or publishing.',
  inputSchema:z.object({slug:validSlug}),
  annotations:{readOnlyHint:true}
 },async({slug})=>resultText(await agentBlogMediaStatus(slug)));

 server.registerTool('whateato_upload_blog_image',{
  title:'Upload an original or licensed image to a saved WhatEatO article',
  description:'Upload a base64 JPEG/PNG/WebP (up to 6MB) to an existing article, with ownership/license provenance and explicit rights acknowledgement. Uses the existing private S3 photo storage. New photos are PENDING, not automatically approved. For larger files use owner CMS. Do not upload arbitrary Google Images without commercial-use license evidence. Do not fabricate source URLs, ownership or rights references.',
  inputSchema:z.object({
   slug:validSlug,
   media_role:z.enum(['cover','inline']),
   mime_type:z.enum(['image/jpeg','image/png','image/webp']),
   image_base64:z.string().min(344).max(8400000),
   alt_text:z.string().min(3).max(180),
   source_kind:z.enum(['ai_generated','owner_original','licensed']),
   source_url:z.string().max(700).default(''),
   rights_reference:z.string().max(700).default(''),
   provenance_note:z.string().min(12).max(600),
   rights_confirmed:z.boolean()
  }),
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false}
 },async(input,ctx)=>{
  const info=ctx.http?.authInfo;
  const ownerId=(info?.extra as {ownerId?:string}|undefined)?.ownerId;
  if(!ownerId||!info?.scopes?.includes('blog:write'))
   return {isError:true,content:[{type:'text' as const,text:'Image upload requires blog:write owner grant'}]};
  return resultText(await agentUploadBlogImage(input,ownerId));
 });

 server.registerTool('whateato_review_blog_image_rights',{
  title:'Owner approval or rejection of a pending blog image',
  description:'Change a pending image to approved/rejected only after the OWNER explicitly confirms the specific image rights and accurate provenance. Approval unlocks use in public articles but does not publish the article. Do not approve images automatically or based only on finding them through Google.',
  inputSchema:z.object({
   slug:validSlug,image_id:z.string().uuid(),
   decision:z.enum(['approve','reject']),
   owner_rights_attested:z.boolean()
  }),
  annotations:{readOnlyHint:false,destructiveHint:false,idempotentHint:false}
 },async(input,ctx)=>{
  const info=ctx.http?.authInfo;
  const ownerId=(info?.extra as {ownerId?:string}|undefined)?.ownerId;
  if(!ownerId||!info?.scopes?.includes('blog:write'))
   return {isError:true,content:[{type:'text' as const,text:'Image review requires blog:write owner grant'}]};
  return resultText(await agentReviewBlogImage(input,ownerId));
 });
},{serverInfo:{name:'whateato-blog-publisher',version:'1.1.0'}});

const verify=async(_req:Request,bearer?:string):Promise<AuthInfo|undefined>=>{
 if(!bearer)return undefined;
 const grant=await validateAgentAccess(bearer);
 if(!grant)return undefined;
 return {token:bearer,clientId:grant.clientId,scopes:grant.scopes,
   expiresAt:grant.exp,extra:{ownerId:grant.ownerId}};
};
const protectedHandler=withMcpAuth(handler,verify,{
 required:true,requiredScopes:['blog:read'],
 resourceMetadataPath:'/.well-known/oauth-protected-resource'
});
export {protectedHandler as GET,protectedHandler as POST};
