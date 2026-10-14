import {NextResponse} from 'next/server';
import {getBlogCategories} from '@/lib/blog-categories';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(){
 try{return NextResponse.json({items:await getBlogCategories()},{
  headers:{'Cache-Control':'public, max-age=60, s-maxage=120'}})}
 catch{return NextResponse.json({error:'categories_unavailable'},{status:503,
  headers:{'Cache-Control':'no-store'}})}
}
