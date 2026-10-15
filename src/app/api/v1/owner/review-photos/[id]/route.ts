import {NextRequest} from 'next/server';
import {serveVisitorPhoto} from '@/lib/visitor-photo-delivery';
export const runtime='nodejs';export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
export async function GET(_req:NextRequest,{params}:Ctx){
 const {id}=await params;return serveVisitorPhoto(id,true);
}