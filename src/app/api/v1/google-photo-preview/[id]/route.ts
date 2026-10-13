import {NextRequest,NextResponse} from 'next/server';
import {getPool} from '@/lib/db';
import {googlePhotosEnabled,getTransientPhotoReferences,getLivePhotoBytes} from '@/lib/google-place-photos';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const noStore={'Cache-Control':'no-store, private, max-age=0','X-Robots-Tag':'noindex, nofollow'};
type C={params:Promise<{id:string}>};
const uuid=/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i;
async function candidate(id:string){
 if(!uuid.test(id))return null;
 const db=getPool();if(!db)return null;
 const x=await db.query<{google_place_id:string}>(`SELECT c.google_place_id
   FROM restaurant_source_match_checkpoints_v1 c
   JOIN restaurant_enrichment_sample_1000 s ON s.restaurant_id=c.restaurant_id
   JOIN google_place_manual_identity_approvals_v1 a ON a.restaurant_id=c.restaurant_id AND a.google_place_id=c.google_place_id
   WHERE c.restaurant_id=$1 AND s.sample_rank BETWEEN 1 AND 3
   AND a.verified_at IS NOT NULL LIMIT 1`,[id]);
 return x.rows[0]?.google_place_id??null;
}
export async function GET(req:NextRequest,{params}:C){
 if(!googlePhotosEnabled()||process.env.WHATEATO_PREVIEW_50_ONLY!=='true')return new Response(null,{status:404,headers:noStore});
 const {id}=await params;
 try{
  const place=await candidate(id);
  const key=process.env.GOOGLE_PLACES_API_KEY;
  if(!place||!key)return new Response(null,{status:404,headers:noStore});
  const photoName=req.nextUrl.searchParams.get('photo');
  if(photoName){
   if(photoName.length>900||!photoName.startsWith('places/'+place+'/photos/'))
    return new Response(null,{status:400,headers:noStore});
   const google=await getLivePhotoBytes(id,place,photoName,key);
   if(!google.ok)return new Response(null,{status:502,headers:noStore});
   const contentType=google.headers.get('content-type')||'';
   // The Photos endpoint should return JSON when skipHttpRedirect=true.
   // Never proxy unknown bytes or expose a signed Google photo URI in permanent storage.
   if(!contentType.includes('application/json'))return new Response(null,{status:502,headers:noStore});
   const doc=await google.json();
   const url=typeof doc.photoUri==='string'?doc.photoUri:null;
   if(!url||!url.startsWith('https://'))return new Response(null,{status:502,headers:noStore});
   return NextResponse.json({photoUri:url},{headers:noStore});
  }
  const photos=await getTransientPhotoReferences(id,place,key);
  // Transient photo names only; never cache and never persist.
  return NextResponse.json({photos:photos.slice(0,1).map(p=>({
   name:p.photoName,authors:p.authorAttributions.map(a=>({displayName:a.displayName,uri:a.uri})),
   googleMapsUri:p.googleMapsUri
  }))},{headers:noStore});
 }catch{
  return new Response(null,{status:503,headers:noStore});
 }
}
