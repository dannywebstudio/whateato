import type {Day} from './types';
export const weekdays=['일','월','화','수','목','금','토'];
export const emptyDays=():Day[]=>weekdays.map((_,weekday)=>({weekday,closed:true,open:'11:00',close:'21:00',breakStart:'',breakEnd:''}));
export const tags=['date_night','bar','lunch','dinner','solo_dining','family_dining','cafe','dessert',
 'budget_friendly','good_atmosphere','local_pick','traveler_friendly','english_menu',
 'vegetarian_options','reservation_available','near_subway'];
export const locales=['en','ja','zh-CN','ko'] as const;
export const timeToMin=(s:string)=>{const m=/^([01]\d|2[0-3]):([0-5]\d)$/.exec(s);
 if(!m)throw Error('시간은 HH:MM 형식이어야 해.');return Number(m[1])*60+Number(m[2])};
export const minToTime=(v:number)=>String(Math.floor(v/60)).padStart(2,'0')+':'+String(v%60).padStart(2,'0');

export const blankMenu=()=>({key:'',name:'',price:'',description:'',evidence:'',featured:false});
