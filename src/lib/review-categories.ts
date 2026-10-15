// Legacy one-number reviews remain valid; new reviews average answered categories.
export const reviewScoreSql = `COALESCE(
  (s.taste::numeric + coalesce(s.service,0)+coalesce(s.tourist_friendliness,0)
     +coalesce(s.value_for_money,0)+coalesce(s.cleanliness,0))
  / (1+(s.service IS NOT NULL)::int+(s.tourist_friendliness IS NOT NULL)::int
       +(s.value_for_money IS NOT NULL)::int+(s.cleanliness IS NOT NULL)::int),
  r.rating::numeric)`;

export type CategoryScores={
  taste:number;service:number|null; tourist_friendliness:number|null;
  value_for_money:number|null;cleanliness:number|null;
};
export function categoryInput(v:unknown):{scores:CategoryScores;average:number;legacyRating:number}|null{
  if(!v||Array.isArray(v)||typeof v!=='object')return null;
  const obj=v as Record<string,unknown>;
  const allowed=['taste','service','tourist_friendliness','value_for_money','cleanliness'];
  if(Object.keys(obj).some(k=>!allowed.includes(k)))return null;
  if(!Number.isInteger(obj.taste)||Number(obj.taste)<1||Number(obj.taste)>5)return null;
  const scores={} as CategoryScores;
  for(const key of allowed as (keyof CategoryScores)[]){
    const n=obj[key];
    if(n===null&&key!=='taste'){scores[key]=null as never;continue}
    if(!Number.isInteger(n)||Number(n)<1||Number(n)>5)return null;
    scores[key]=n as never;
  }
  const values=Object.values(scores).filter((n):n is number=>typeof n==='number');
  const average=values.reduce((a,b)=>a+b,0)/values.length;
  return {scores,average:Math.round(average*10)/10,legacyRating:Math.round(average)};
}
