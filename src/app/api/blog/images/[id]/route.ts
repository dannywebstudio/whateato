import {NextRequest} from 'next/server';
import {serveBlogImage} from '@/lib/blog-image-delivery';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
export async function GET(_req:NextRequest,{params}:Ctx){
 const {id}=await params;return serveBlogImage(id,false);
}