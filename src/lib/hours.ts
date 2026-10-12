/** Restaurant schedules are estimates, NEVER a live door-open signal. */
export type HourInterval = {weekday:number; opens_minute:number; closes_minute:number};
export type HourOverride = {service_date:string; is_closed:boolean; intervals:Array<{opens_minute:number; closes_minute:number}>};
export type ScheduleStatus = {state:'unknown'|'estimated_open'|'estimated_closed';label:string;closesAt?:string};
const ZONE='Asia/Seoul';
const MAX_AGE_DAYS=180;
const minuteLabel=(minute:number)=>`${String(Math.floor((minute%1440)/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}`;
export function getScheduleStatus(now:Date, verifiedAt:string|null, weekly:HourInterval[], exceptions:HourOverride[]):ScheduleStatus {
  const unknown={state:'unknown',label:'영업시간 미확인'} as const;
  if(!verifiedAt||(!weekly.length&&!exceptions.length)||Number.isNaN(now.getTime()))return unknown;
  const verifiedTime=new Date(verifiedAt).getTime();
  if(!Number.isFinite(verifiedTime)||verifiedTime>now.getTime()||now.getTime()-verifiedTime>MAX_AGE_DAYS*86400000)return unknown;
  const parts=new Intl.DateTimeFormat('en-GB',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(now);
  const part=(key:string)=>Number(parts.find(p=>p.type===key)?.value);
  const y=part('year'),m=part('month'),d=part('day'),minute=part('hour')*60+part('minute');
  const today=Date.UTC(y,m-1,d),yesterday=today-86400000;
  const key=(utc:number)=>new Date(utc).toISOString().slice(0,10);
  const intervals=(utc:number):Array<{opens_minute:number;closes_minute:number}>=>{
    const ex=exceptions.find(x=>x.service_date===key(utc));
    if(ex)return ex.is_closed?[]:ex.intervals;
    const dow=new Date(utc).getUTCDay();
    return weekly.filter(x=>x.weekday===dow).map(({opens_minute,closes_minute})=>({opens_minute,closes_minute}));
  };
  const valid=(x:{opens_minute:number;closes_minute:number})=>Number.isInteger(x.opens_minute)&&Number.isInteger(x.closes_minute)&&x.opens_minute>=0&&x.opens_minute<1440&&x.closes_minute>x.opens_minute&&x.closes_minute<=2880;
  const activeToday=intervals(today).find(i=>valid(i)&&minute>=i.opens_minute&&minute<i.closes_minute);
  const activePrev=intervals(yesterday).find(i=>valid(i)&&i.closes_minute>1440&&minute+1440<i.closes_minute);
  const active=activeToday||activePrev;
  if(active)return {state:'estimated_open',label:'영업 중 추정',closesAt:minuteLabel(active.closes_minute)};
  return {state:'estimated_closed',label:'영업 종료 추정'};
}
