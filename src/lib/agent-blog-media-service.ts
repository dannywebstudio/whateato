import {randomUUID} from 'node:crypto';
import sharp from 'sharp';
import {NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {savePhoto,deletePhoto,photoExists,objectStorageReady} from '@/lib/cms-object-storage';
import {ownerHeaders} from '@/lib/owner-cms-auth';
import {validBlogSlug,BLOG_REQUIRED_LOCALES,type BlogDraft} from '@/lib/blog-model';
import {isUuid} from '@/lib/platform-v1';

const respond=(v:unknown,status=200)=>NextResponse.json(v,{status,headers:ownerHeaders});
type SourceKind='ai_generated'|'owner_original'|'licensed';
type Role='cover'|'inline';
export type AgentMediaUpload={
 slug:string;media_role:Role;mime_type:'image/jpeg'|'image/png'|'image/webp';
 image_base64:string;alt_text:string;source_kind:SourceKind;
 source_url:string;rights_reference:string;provenance_note:string;
 rights_confirmed:boolean
};

const secureHttpsUrl=(value:string)=> {
 if(!value)return false;
 try{
  const url=new URL(value);
  return url.protocol==='https:'&&!url.username&&!url.password&&
    !url.hash&&value.length<=700;
 }catch{return false}
};
const allowedImageMimes=new Set(['image/jpeg','image/png','image/webp']);
export async function agentUploadBlogImage(input:AgentMediaUpload,ownerId:string){
 if(!isUuid(ownerId)||!validBlogSlug(input.slug))return respond({error:'invalid_request'},400);
 if(!objectStorageReady())return respond({error:'image_storage_unavailable'},503);
 if(!['cover','inline'].includes(input.media_role)||!allowedImageMimes.has(input.mime_type)||
  !['ai_generated','owner_original','licensed'].includes(input.source_kind)||
  input.rights_confirmed!==true||
  input.alt_text.trim().length<3||input.alt_text.length>180||
  input.provenance_note.trim().length<12||input.provenance_note.length>600||
  input.source_url.length>700||input.rights_reference.length>700||
  (input.source_url!==''&&!secureHttpsUrl(input.source_url))||
  (input.rights_reference!==''&&!secureHttpsUrl(input.rights_reference))||
  (input.source_kind==='licensed'&&
   (!secureHttpsUrl(input.source_url)||!secureHttpsUrl(input.rights_reference))))
  return respond({error:'invalid_image_or_rights_metadata'},400);
 // MCP inputs are text. For larger images, use the existing multipart owner CMS.
 if(input.image_base64.length<344||input.image_base64.length>8_400_000||
   !/^[A-Za-z0-9+/]+={0,2}$/.test(input.image_base64))
  return respond({error:'image_base64_invalid_or_too_large_use_cms'},413);
 let data:Buffer,width=0,height=0;
 try{
  const decoded=Buffer.from(input.image_base64,'base64');
  if(decoded.length<256||decoded.length>6*1024*1024||
     decoded.toString('base64')!==input.image_base64)return respond({error:'invalid_base64'},400);
  const meta=await sharp(decoded,{limitInputPixels:32_000_000,failOn:'error'}).metadata();
  if(!meta.width||!meta.height||meta.width<320||meta.height<240)
   return respond({error:'image_minimum_320x240'},400);
  if(!['jpeg','png','webp'].includes(String(meta.format))||
    input.mime_type!==('image/'+meta.format))
   return respond({error:'image_mime_mismatch'},400);
  const output=await sharp(decoded,{limitInputPixels:32_000_000,failOn:'error'})
   .rotate().resize({width:input.media_role==='cover'?1200:1400,
    height:input.media_role==='cover'?810:1100,
    fit:input.media_role==='cover'?'cover':'inside',
    withoutEnlargement:true})
   .webp({quality:78,effort:5}).toBuffer({resolveWithObject:true});
  data=output.data;width=output.info.width;height=output.info.height;
  if(data.length>8*1024*1024)return respond({error:'optimized_image_too_large'},413);
 }catch{return respond({error:'image_decode_failed'},400)}
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const id=randomUUID(),key='media/blog/'+id+'.webp';
 const client=await pool.connect();let stored=false;
 try{
  await client.query('BEGIN');
  const post=await client.query<{id:string}>(
   'SELECT id::text FROM whateato_blog_posts WHERE slug=$1 FOR UPDATE',[input.slug]);
  if(!post.rowCount){await client.query('ROLLBACK');return respond({error:'save_blog_draft_first'},409)}
  const postId=post.rows[0].id;
  const count=await client.query<{n:number}>(
   'SELECT count(*)::int AS n FROM whateato_blog_media WHERE post_id=$1',[postId]);
  if(count.rows[0].n>=30){await client.query('ROLLBACK');return respond({error:'max_30_blog_images'},409)}
  await savePhoto(key,data);stored=true;
  await client.query(
   'INSERT INTO whateato_blog_media (id,post_id,storage_key,media_role,alt_text,source_url,rights_reference,provenance_kind,provenance_note,file_bytes,width,height,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)',[
   id,postId,key,input.media_role,input.alt_text.trim(),
   input.source_url,input.rights_reference,input.source_kind,
   input.provenance_note.trim(),data.length,width,height,ownerId]);
  await client.query(
   'INSERT INTO whateato_blog_audit(post_id,actor_id,action) VALUES($1,$2,$3)',
   [postId,ownerId,'image_uploaded']);
  await client.query('COMMIT');
  return respond({success:true,slug:input.slug,image_id:id,media_role:input.media_role,
   rights_status:'pending',width,height,
   preview_url:'/api/v1/owner/blog/images/'+id,
   next_step:'Owner must explicitly approve the image rights before it can be published.'},201);
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  if(stored)await deletePhoto(key).catch(()=>{});
  return respond({error:'blog_image_upload_unavailable'},503);
 }finally{client.release()}
}

export async function agentReviewBlogImage(input:{
 slug:string;image_id:string;decision:'approve'|'reject';
 owner_rights_attested:boolean
},ownerId:string){
 if(!isUuid(ownerId)||!validBlogSlug(input.slug)||!isUuid(input.image_id)||
   (input.decision==='approve'&&input.owner_rights_attested!==true))
  return respond({error:'explicit_owner_rights_attestation_required'},400);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const row=await client.query<{post_id:string;storage_key:string;rights_status:string;
    provenance_kind:SourceKind|'legacy';source_url:string;rights_reference:string;
    provenance_note:string}>(
   'SELECT m.post_id::text,m.storage_key,m.rights_status,m.provenance_kind,m.source_url,m.rights_reference,m.provenance_note FROM whateato_blog_media m JOIN whateato_blog_posts p ON p.id=m.post_id WHERE p.slug=$1 AND m.id=$2 FOR UPDATE',
   [input.slug,input.image_id]);
  if(!row.rowCount){await client.query('ROLLBACK');return respond({error:'image_not_found'},404)}
  const photo=row.rows[0];
  if(photo.rights_status!=='pending'){await client.query('ROLLBACK');
   return respond({error:'image_not_pending'},409)}
  if(input.decision==='approve'){
   if(photo.provenance_kind==='licensed'&&
     (!secureHttpsUrl(photo.source_url)||!secureHttpsUrl(photo.rights_reference))){
    await client.query('ROLLBACK');return respond({error:'licensed_image_requires_rights_evidence'},409);
   }
   if(photo.provenance_kind!=='legacy'&&photo.provenance_note.trim().length<12){
    await client.query('ROLLBACK');return respond({error:'provenance_note_required'},409);
   }
   await photoExists(photo.storage_key);
  }
  const approved=input.decision==='approve';
  await client.query(
   'UPDATE whateato_blog_media SET rights_status=$2,approved_at=CASE WHEN $2=$4 THEN now() ELSE NULL END,approved_by=CASE WHEN $2=$4 THEN $3::uuid ELSE NULL END WHERE id=$1',
   [input.image_id,approved?'approved':'rejected',ownerId,'approved']);
  await client.query(
   'INSERT INTO whateato_blog_audit(post_id,actor_id,action) VALUES($1,$2,$3)',
   [photo.post_id,ownerId,approved?'image_approved':'image_rejected']);
  await client.query('COMMIT');
  return respond({success:true,slug:input.slug,image_id:input.image_id,
   rights_status:approved?'approved':'rejected'});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:'blog_image_approval_unavailable'},503);
 }finally{client.release()}
}

export async function agentBlogMediaStatus(slug:string){
 if(!validBlogSlug(slug))return respond({error:'invalid_slug'},400);
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 try{
  const row=await pool.query<{id:string;translations:BlogDraft['translations']}>(
   'SELECT p.id::text,d.translations FROM whateato_blog_posts p JOIN whateato_blog_drafts d ON d.post_id=p.id WHERE p.slug=$1',[slug]);
  if(!row.rowCount)return respond({error:'not_found'},404);
  const images=await pool.query<{id:string;media_role:Role;rights_status:string;
   alt_text:string;source_url:string;rights_reference:string;
   provenance_kind:string;provenance_note:string;width:number;height:number}>(
   'SELECT id::text,media_role,rights_status,alt_text,source_url,rights_reference,provenance_kind,provenance_note,width,height FROM whateato_blog_media WHERE post_id=$1 ORDER BY created_at DESC,id',
   [row.rows[0].id]);
  const approved=images.rows.filter(im=>im.rights_status==='approved');
  const approvedInline=new Set(approved.filter(im=>im.media_role==='inline').map(im=>im.id));
  const approvedCovers=approved.filter(im=>im.media_role==='cover');
  const perLocale=Object.fromEntries(BLOG_REQUIRED_LOCALES.map(locale=>{
   const ids=new Set((row.rows[0].translations?.[locale]?.blocks||[])
    .filter(b=>b.type==='image'&&b.image_id&&approvedInline.has(b.image_id))
    .map(b=>b.image_id));
   return [locale,{approved_inline_images:ids.size,minimum_inline_images:2,
    ready:ids.size>=2}];
  }));
  const ready=approvedCovers.length>0&&
    Object.values(perLocale).every(x=>x.ready);
  return respond({slug,ready_for_three_image_publication:ready,
   requirement:'One rights-approved cover image and at least two different rights-approved inline images referenced in each of four language drafts.',
   approved_cover_images:approvedCovers.length,locales:perLocale,
   images:images.rows.map(im=>({...im,
    preview_url:'/api/v1/owner/blog/images/'+im.id}))});
 }catch{return respond({error:'blog_media_status_unavailable'},503)}
}
