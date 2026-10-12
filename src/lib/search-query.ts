/** User input normalization and verified category filter groups for WhatEatO. */
export const FILTER_GROUPS:Record<string,string>={
 date_night:'situation',solo_dining:'situation',family_dining:'situation',
 bar:'venue',cafe:'venue',dessert:'venue',
 lunch:'time',dinner:'time',
 budget_friendly:'attribute',good_atmosphere:'attribute',traveler_friendly:'attribute',
 local_pick:'curation'
};
export type SearchOptions={query:string;filters:string[]};
export function parseFilters(input:string|undefined|null):string[]{
  const unique=new Set<string>();
  for(const raw of (input||'').split(',').slice(0,20)){
    const token=raw.trim();
    if(Object.hasOwn(FILTER_GROUPS,token))unique.add(token);
  }
  return [...unique];
}
export function normalizedTokens(input:string):string[]{
  return (input||'').normalize('NFKC').replace(/[\u0000-\u001f]/g,' ').trim().slice(0,150)
   .split(/\s+/).filter(Boolean).slice(0,6);
}
export function makeRestaurantSearchSql({query,filters}:SearchOptions):{sql:string;params:unknown[]}|null{
  const tokens=normalizedTokens(query);
  const allowed=filters.filter(f=>Object.hasOwn(FILTER_GROUPS,f));
  if(tokens.length===0&&allowed.length===0)return null;
  const params:unknown[]=[];
  const clauses=["r.publication_status='published'","r.business_status <> 'closed'"];
  for(const token of tokens){
    const pattern='%'+token.replace(/[\\%_]/g,'\\$&')+'%';
    params.push(pattern);
    const n=params.length;
    clauses.push(`(r.name_ko ILIKE $${n} OR r.road_address_ko ILIKE $${n} OR
     r.lot_address_ko ILIKE $${n} OR r.region_sido ILIKE $${n} OR
     r.region_sigungu ILIKE $${n} OR r.region_dong ILIKE $${n} OR
     EXISTS (SELECT 1 FROM restaurant_search_aliases a WHERE a.restaurant_id=r.id
       AND a.review_status='verified' AND a.alias ILIKE $${n}))`);
  }
  const groups=new Map<string,string[]>();
  for(const tag of allowed){
    const group=FILTER_GROUPS[tag];
    groups.set(group,[...(groups.get(group)||[]),tag]);
  }
  for(const [,tags] of groups){
    params.push([...new Set(tags)]);
    clauses.push(`EXISTS (SELECT 1 FROM restaurant_verified_tags t WHERE t.restaurant_id=r.id
      AND t.review_status='verified' AND t.tag_id=ANY($${params.length}::text[]))`);
  }
  const sql=`SELECT r.id,r.name_ko,r.road_address_ko,r.lot_address_ko,
   r.region_sido,r.region_sigungu,r.category_code,r.business_status
   FROM restaurants r
   WHERE ${clauses.join(' AND ')}
   ORDER BY r.name_ko,r.id LIMIT 24`;
  return {sql,params};
}
