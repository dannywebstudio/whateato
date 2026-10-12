import {NextResponse} from 'next/server';
import {getRestaurantDetail} from '@/lib/restaurant';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
  if(!process.env.DATABASE_URL)return NextResponse.json({error:'database_not_configured'},{status:503,headers:{'Cache-Control':'no-store'}});
  try{
    const {id}=await params;
    const restaurant=await getRestaurantDetail(id);
    return NextResponse.json(restaurant||{error:'not_found'},{status:restaurant?200:404,headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'database_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
