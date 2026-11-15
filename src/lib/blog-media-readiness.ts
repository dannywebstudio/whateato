import type {PoolClient} from 'pg';
import type {BlogDraft} from '@/lib/blog-model';
import {BLOG_REQUIRED_LOCALES} from '@/lib/blog-model';

/**
 * New publications require one approved cover and two different approved
 * inline photos in every language. The same approved inline photos may be
 * shared across all four language versions, avoiding duplicate uploads.
 * Existing published articles are left intact for backward compatibility.
 */
export async function validateFirstPublicationPhotos(
 client:PoolClient,postId:string,draft:BlogDraft
):Promise<string|null>{
 const existing=await client.query(
  'SELECT 1 FROM whateato_blog_publications WHERE post_id=$1 LIMIT 1',[postId]);
 if(existing.rowCount)return null;
 const images=await client.query<{id:string;media_role:string}>(
  "SELECT id::text,media_role FROM whateato_blog_media WHERE post_id=$1 AND rights_status='approved'",
  [postId]);
 const hasCover=images.rows.some(i=>i.media_role==='cover');
 if(!hasCover)return 'approved_cover_image_required';
 const inline=new Set(images.rows.filter(i=>i.media_role==='inline').map(i=>i.id));
 for(const locale of BLOG_REQUIRED_LOCALES){
  const referenced=new Set((draft.translations[locale]?.blocks||[])
   .filter(b=>b.type==='image'&&b.image_id&&inline.has(b.image_id))
   .map(b=>b.image_id));
  if(referenced.size<2)return locale.replace('-','_')+'_two_approved_inline_images_required';
 }
 return null;
}
