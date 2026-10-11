import {getPool} from './db';
export type RestaurantResult={id:string;name_ko:string;road_address_ko:string|null};
export async function findRestaurants(query:string):Promise<{ready:boolean;items:RestaurantResult[]}>{
  const db=getPool();if(!db)return {ready:false,items:[]};
  const q=query.trim().slice(0,150);if(!q)return {ready:true,items:[]};
  try{
    const res=await db.query<RestaurantResult>(
      "SELECT id,name_ko,road_address_ko FROM restaurants WHERE publication_status='published' AND business_status <> 'closed' AND (name_ko ILIKE $1 OR road_address_ko ILIKE $1 OR region_sigungu ILIKE $1 OR region_dong ILIKE $1) ORDER BY name_ko LIMIT 30",
      ['%'+q.replace(/[\\%_]/g,'\\$&')+'%']
    );return {ready:true,items:res.rows};
  }catch{return {ready:false,items:[]}}
}
