import {getPool} from './db';
import {makeRestaurantSearchSql,parseFilters} from './search-query';
export type RestaurantResult={
  id:string;name_ko:string;road_address_ko:string|null;lot_address_ko:string|null;
  region_sido:string|null;region_sigungu:string|null;category_code:string|null;
  business_status:'active'|'unknown'
};
export async function findRestaurants(query:string,filterInput:string=''):Promise<{ready:boolean;items:RestaurantResult[];filters:string[];error?:string}>{
  const filters=parseFilters(filterInput);
  const db=getPool();
  if(!db)return {ready:false,items:[],filters,error:'database_not_configured'};
  const prepared=makeRestaurantSearchSql({query,filters});
  if(!prepared)return {ready:true,items:[],filters};
  try{
    const res=await db.query<RestaurantResult>(prepared.sql,prepared.params);
    return {ready:true,items:res.rows,filters};
  }catch(error){
    // No internal DB messages exposed to users. Use platform logs for detailed diagnostics.
    console.error('WhatEatO search query failed',error instanceof Error?error.name:'unknown');
    return {ready:false,items:[],filters,error:'database_unavailable'};
  }
}
