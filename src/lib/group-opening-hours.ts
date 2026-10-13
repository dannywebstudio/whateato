export type HourSlot={weekday:number;start:string;end:string};
const dayNames={
 ko:['일','월','화','수','목','금','토'],
 en:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
 ja:['日','月','火','水','木','金','土'],
 'zh-CN':['周日','周一','周二','周三','周四','周五','周六']
} as const;
export function groupedOpeningHours(weekly:HourSlot[],locale='ko'):string[]{
 const names=dayNames[locale as keyof typeof dayNames]||dayNames.ko;
 const perDay=Array.from({length:7},()=>[] as string[]);
 for(const s of weekly){
  if(Number.isInteger(s.weekday)&&s.weekday>=0&&s.weekday<=6&&/^\d{2}:\d{2}$/.test(s.start)&&/^\d{2}:\d{2}$/.test(s.end))
   perDay[s.weekday].push(s.start+'–'+s.end);
 }
 const ordered=[1,2,3,4,5,6,0];
 const groups:{days:number[];hours:string}[]=[];
 for(const day of ordered){
  const hours=perDay[day].sort().join(' / ')||'';
  const last=groups[groups.length-1];
  if(last&&last.hours===hours)last.days.push(day);
  else groups.push({days:[day],hours});
 }
 const week=[...groups];
 // Consolidate Sun and preceding Saturday when schedules match;
 // group across week boundary only if both are adjacent in Mon-first order.
 return week.map(g=>{
  const sequence=g.days.map(n=>names[n]);
  const label=g.days.length===1?sequence[0]:sequence[0]+'~'+sequence[sequence.length-1];
  const closed=locale==='ko'?'휴무':locale==='ja'?'休業':locale==='zh-CN'?'休息':'Closed';
  return label+'  '+(g.hours||closed);
 });
}
