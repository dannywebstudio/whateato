import type {Batch,Detail,Place,Review,Item} from './types';
import {json,post} from './client';

/** Owner CMS endpoint adapter. Authorization remains on the server. */
export type CatalogPage={items:Place[];next_cursor:string|null};
export const ownerApi={
 searchRestaurants(query:string,after?:string):Promise<CatalogPage>{
  const params=new URLSearchParams({q:query});
  if(after)params.set('after',after);
  return json('/api/v1/owner/catalog?'+params);
 },
 getRestaurant(id:string):Promise<Detail>{
  return json('/api/v1/owner/catalog/'+encodeURIComponent(id));
 },
 listBatches():Promise<{items:Batch[]}>{
  return json('/api/v1/owner/bulk/batches?limit=30');
 },
 getBatch(id:string):Promise<any>{
  return json('/api/v1/owner/bulk/batches/'+encodeURIComponent(id));
 },
 listReviews(status:'pending'|'published'|'rejected'):Promise<{items:Review[]}>{
  return json('/api/v1/owner/reviews?limit=50&status='+encodeURIComponent(status));
 },
 readiness():Promise<Record<string,string|boolean>>{
  return json('/api/v1/owner/readiness');
 }
};
