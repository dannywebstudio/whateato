import type {Pool} from 'pg';
export type OpeningHours={state:'open'|'closed'|'unknown';weekly:{weekday:number;start:string;end:string}[];verified_at:string|null};
type R={restaurant_id:string;weekday:number|null;start_minute:number|null;end_minute:number|null;verified_at:string;exception_closed:boolean|null};
const hhmm=(n:number)=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
function koreaNow(now:Date){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
 const v=(k:string)=>parts.find(x=>x.type===k)?.value||'';
 const day=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(v('weekday'));
 return {day,minute:Number(v('hour'))*60+Number(v('minute')),date:v('year')+'-'+v('month')+'-'+v('day')};
}
export async function getOpeningHours(pool:Pool,ids:string[],now=new Date()):Promise<Record<string,OpeningHours>>{
 if(!ids.length)return {};
 const k=koreaNow(now);
 const response=await pool.query<R>(`
 SELECT h.restaurant_id::text,h.verified_at,i.weekday,i.start_minute,i.end_minute,
 e.is_closed AS exception_closed
 FROM restaurant_opening_hours h
 LEFT JOIN restaurant_opening_intervals i ON i.restaurant_id=h.restaurant_id
 LEFT JOIN restaurant_opening_exceptions e ON e.restaurant_id=h.restaurant_id AND e.local_date=$2::date
 WHERE h.restaurant_id=ANY($1::uuid[]) AND h.publication_state='published'
 AND h.verified_at IS NOT NULL
 ORDER BY h.restaurant_id,i.weekday,i.start_minute`,[ids,k.date]);
 const result:Record<string,OpeningHours>={};
 for(const r of response.rows){
  const o=result[r.restaurant_id] ||= {state:'closed',weekly:[],verified_at:r.verified_at};
  if(r.weekday!==null&&r.start_minute!==null&&r.end_minute!==null){
   o.weekly.push({weekday:r.weekday,start:hhmm(r.start_minute),end:hhmm(r.end_minute)});
   if(r.weekday===k.day && k.minute>=r.start_minute&&k.minute<r.end_minute)o.state='open';
  }
  if(r.exception_closed)o.state='closed';
 }
 // A published empty weekly schedule represents a verified closure; unknown restaurants remain absent.
 return result;
}
