import {NextResponse} from 'next/server';
import {realpath,stat,readFile} from 'node:fs/promises';
import {isAbsolute,relative,resolve,sep} from 'node:path';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const baseHeaders={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'};
const allowedTypes:Record<string,string>={
  jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp'
};
const maxImageSize=8*1024*1024;

// Fail-closed: a license reference is NOT enough; the rights review must
// explicitly approve the image, its restaurant must be public/permit-active,
// and only an internal server-owned media file can be delivered.
export async function GET(_request:Request,{params}:Context){
  const {id}=await params;
  if(!isUuid(id))return NextResponse.json({error:'invalid_image_id'},{status:400,headers:baseHeaders});
  const root=process.env.WHATEATO_MEDIA_ROOT;
  if(!root||!isAbsolute(root))return NextResponse.json({error:'media_storage_not_configured'},
    {status:503,headers:baseHeaders});
  const pool=getPool();
  if(!pool)return NextResponse.json({error:'database_not_configured'},{status:503,headers:baseHeaders});
  try{
    const q=await pool.query<{storage_key:string}>(`
      SELECT im.storage_key FROM restaurant_images im
      JOIN restaurants r ON r.id=im.restaurant_id
      WHERE im.id=$1 AND im.publication_state='published'
        AND im.rights_status='approved' AND im.rights_verified_at IS NOT NULL
        AND NULLIF(BTRIM(im.usage_rights_reference),'') IS NOT NULL
        AND NULLIF(BTRIM(im.source_reference),'') IS NOT NULL
        AND r.business_status='active' AND r.publication_status='published'
      LIMIT 1`,[id]);
    const key=q.rows[0]?.storage_key;
    if(!key)return NextResponse.json({error:'image_not_found'},{status:404,headers:baseHeaders});
    // Avoid remote URLs, absolute paths, traversal, SVG, untrusted file types.
    if(!/^media\/[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(key)){
      return NextResponse.json({error:'image_not_found'},{status:404,headers:baseHeaders});
    }
    const ext=key.split('.').at(-1)?.toLowerCase()||'';
    const type=allowedTypes[ext];
    if(!type)return NextResponse.json({error:'image_not_found'},{status:404,headers:baseHeaders});
    const safeRoot=await realpath(root);
    const file=resolve(safeRoot,key);
    const safeFile=await realpath(file);
    const rel=relative(safeRoot,safeFile);
    if(rel.startsWith('..'+sep)||rel==='..'||isAbsolute(rel))
      return NextResponse.json({error:'image_not_found'},{status:404,headers:baseHeaders});
    const fileStat=await stat(safeFile);
    if(!fileStat.isFile()||fileStat.size<16||fileStat.size>maxImageSize)
      return NextResponse.json({error:'image_not_found'},{status:404,headers:baseHeaders});
    const bytes=await readFile(safeFile);
    // Use small signature checks rather than trust attacker-controlled extension.
    const head=bytes.subarray(0,12);
    const valid=ext==='png'?head.subarray(0,8).equals(Buffer.from('89504e470d0a1a0a','hex'))
      :ext==='jpg'||ext==='jpeg'?head.subarray(0,3).equals(Buffer.from('ffd8ff','hex'))
      :head.subarray(0,4).toString()==='RIFF'&&head.subarray(8,12).toString()==='WEBP';
    if(!valid)return NextResponse.json({error:'image_not_found'},{status:404,headers:baseHeaders});
    return new NextResponse(new Uint8Array(bytes),{
      status:200,headers:{...baseHeaders,'Content-Type':type,'Content-Length':String(bytes.length),
        'Content-Security-Policy':"default-src 'none'; sandbox"}
    });
  }catch{
    // Hide file layout, private paths and database diagnostics from public callers.
    return NextResponse.json({error:'image_unavailable'},{status:503,headers:baseHeaders});
  }
}
