import {NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {currentStaff,hasPermission} from '@/lib/owner-cms-auth';
import {readPhoto} from '@/lib/cms-object-storage';
const headers={'Cache-Control':'private,no-store','Content-Security-Policy':"default-src 'none'; sandbox",
 'X-Content-Type-Options':'nosniff','Vary':'Cookie'} as const;
const fail=(code:string,status:number)=>NextResponse.json({error:code},{status,headers});
export async function serveBlogImage(id:string,staffPreview=false){
 if(!isUuid(id))return fail('not_found',404);
 if(staffPreview){
  const staff=await currentStaff();
  if(!staff||!hasPermission(staff,'edit'))return fail('forbidden',403);
 }
 const pool=getPool();if(!pool)return fail('database_unavailable',503);
 try{
  const r=await pool.query<{storage_key:string;post_id:string;media_role:string;
   rights_status:string;snapshot:unknown;is_visible:boolean|null}>(`
    SELECT m.storage_key,m.post_id::text,m.media_role,m.rights_status,
      pub.snapshot,pub.is_visible
    FROM whateato_blog_media m
    LEFT JOIN whateato_blog_publications pub ON pub.post_id=m.post_id
    WHERE m.id=$1 LIMIT 1`,[id]);
  if(!r.rowCount)return fail('not_found',404);
  const row=r.rows[0];
  if(!staffPreview){
   if(row.rights_status!=='approved'||!row.is_visible||!row.snapshot)
    return fail('not_found',404);
   const snap=row.snapshot as {cover_image_id?:unknown;
    translations?:Record<string,{blocks?:{type?:string;image_id?:string}[]}>};
   const approved=snap.cover_image_id===id||
     Object.values(snap.translations||{}).some(t=>Array.isArray(t?.blocks)&&
      t.blocks.some(b=>b.type==='image'&&b.image_id===id));
   if(!approved)return fail('not_found',404);
  }
  const bytes=await readPhoto(row.storage_key);
  return new NextResponse(new Uint8Array(bytes),{status:200,headers:{
   ...headers,'Content-Type':'image/webp','Content-Length':String(bytes.length)}});
 }catch{return fail('blog_image_unavailable',503)}
}
