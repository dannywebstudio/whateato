import {timingSafeEqual} from 'node:crypto';
import type {NextRequest} from 'next/server';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';

export const bulkPrivateHeaders={
  'Cache-Control':'private, no-store','Vary':'Authorization',
  'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'
} as const;
export type BulkKind='localization'|'localization_unpublish'|'menu'|'menu_unpublish'|'tag'|'hours'|'visibility_hide'|'visibility_restore'|'address'|'restaurant_publish';
export type BulkInput={
  source_key:string; restaurant_id:string; kind:BulkKind; payload:Record<string,unknown>;
};
type Validation={ok:true;value:BulkInput}|{ok:false;error:string};
const kinds=new Set<BulkKind>(['localization','localization_unpublish','menu','menu_unpublish','tag','hours','visibility_hide','visibility_restore','address','restaurant_publish']);
const locales=new Set(['en','ja','zh-CN','ko']);
const isObj=(v:unknown):v is Record<string,unknown>=>Boolean(v)&&typeof v==='object'&&!Array.isArray(v);
const exact=(o:Record<string,unknown>,keys:string[])=>Object.keys(o).every(k=>keys.includes(k));
const str=(v:unknown,max:number,min=1)=>typeof v==='string'&&v.trim().length>=min&&
  [...v.trim()].length<=max&&!/[\u0000-\u001f\u007f]/.test(v);
const sourceUrl=(v:unknown)=>str(v,700,10)&&/^https:\/\/[^\s/@:]+[^\s]*$/i.test(v as string);
const menuKey=(v:unknown)=>typeof v==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(v);
const within=(v:unknown,min:number,max:number)=>typeof v==='number'&&Number.isInteger(v)&&v>=min&&v<=max;

export function bulkAdminAccess(req:NextRequest):{ok:true}|{ok:false;status:401|503;error:string}{
  const secret=process.env.WHATEATO_BULK_ADMIN_TOKEN||'';
  if(process.env.WHATEATO_BULK_ADMIN_ENABLED!=='true'||secret.length<32)
    return {ok:false,status:503,error:'bulk_admin_disabled'};
  const origin=req.headers.get('origin');
  if(origin){try{if(new URL(origin).origin!==req.nextUrl.origin)
    return {ok:false,status:401,error:'unauthorized'}}catch{
      return {ok:false,status:401,error:'unauthorized'}
    }}
  const bearer=req.headers.get('authorization')||'';
  if(!bearer.startsWith('Bearer '))return {ok:false,status:401,error:'unauthorized'};
  const a=Buffer.from(bearer.slice(7),'utf8'),b=Buffer.from(secret,'utf8');
  if(a.length!==b.length||!timingSafeEqual(a,b))
    return {ok:false,status:401,error:'unauthorized'};
  return {ok:true};
}
export function bulkPool(){return getPool()}
export async function boundedJson(req:NextRequest,maxBytes=524288):Promise<
  {ok:true;value:unknown}|{ok:false;status:400|413|415;error:string}
>{
  if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))
    return {ok:false,status:415,error:'json_required'};
  if(Number(req.headers.get('content-length')||0)>maxBytes)
    return {ok:false,status:413,error:'payload_too_large'};
  if(!req.body)return {ok:false,status:400,error:'empty_body'};
  const reader=req.body.getReader();
  let size=0;const chunks:Uint8Array[]=[];
  try{
    while(true){
      const next=await reader.read();if(next.done)break;
      size+=next.value.byteLength;
      if(size>maxBytes){void reader.cancel();return {ok:false,status:413,error:'payload_too_large'}}
      chunks.push(next.value);
    }
    const joined=Buffer.concat(chunks);
    return {ok:true,value:JSON.parse(joined.toString('utf8')) as unknown};
  }catch{return {ok:false,status:400,error:'invalid_json'}}
}
export function validateBulkItem(raw:unknown):Validation{
  if(!isObj(raw)||!exact(raw,['source_key','restaurant_id','kind','payload'])||
    !str(raw.source_key,128)||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(raw.source_key as string)||
    !isUuid(raw.restaurant_id)||!kinds.has(raw.kind as BulkKind)||!isObj(raw.payload))
    return {ok:false,error:'invalid_item'};
  const kind=raw.kind as BulkKind,p=raw.payload;
  let ok=false;
  if(kind==='localization')
    ok=exact(p,['locale','display_name','short_description','full_description','source_notes'])&&
      locales.has(p.locale as string)&&str(p.display_name,45)&&str(p.short_description,150,15)&&
      (p.full_description===undefined||p.full_description===null||str(p.full_description,1200))&&
      str(p.source_notes,700,10);
  if(kind==='localization_unpublish')
    ok=exact(p,['locale'])&&locales.has(p.locale as string);
  if(kind==='menu')
    ok=exact(p,['key','locale','name','description','price_krw','position','evidence_ref'])&&
      menuKey(p.key)&&locales.has(p.locale as string)&&str(p.name,24)&&
      (p.description===undefined||p.description===null||str(p.description,140))&&
      (p.price_krw===undefined||p.price_krw===null||within(p.price_krw,0,100000000))&&
      (p.position===undefined||within(p.position,0,50))&&sourceUrl(p.evidence_ref);
  if(kind==='menu_unpublish')
    ok=exact(p,['key'])&&menuKey(p.key);
  if(kind==='tag')
    ok=exact(p,['code','enabled','evidence_ref'])&&
      typeof p.code==='string'&&/^[a-z][a-z0-9_]{1,63}$/.test(p.code)&&
      typeof p.enabled==='boolean'&&(!p.enabled||sourceUrl(p.evidence_ref));
  if(kind==='hours'){
    if(exact(p,['source_url','days'])&&sourceUrl(p.source_url)&&Array.isArray(p.days)&&p.days.length===7){
      const days=p.days as unknown[];
      ok=days.every((day,i)=>{
        if(!isObj(day)||!exact(day,['weekday','intervals'])||day.weekday!==i||
          !Array.isArray(day.intervals)||day.intervals.length>3)return false;
        let previous=-1;
        return day.intervals.every(interval=>{
          if(!Array.isArray(interval)||interval.length!==2||
            !within(interval[0],0,1439)||!within(interval[1],1,1440)||
            (interval[0] as number)>= (interval[1] as number)||
            (interval[0] as number)<previous)return false;
          previous=interval[1] as number;return true;
        });
      });
    }
  }
  if(kind==='address'){
    const numberOrNull=(n:unknown,min:number,max:number)=>
      n===null||(typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max);
    ok=exact(p,['road_address_ko','lot_address_ko','region_sido','region_sigungu',
      'region_dong','latitude','longitude','evidence_url'])&&
      str(p.road_address_ko,250,5)&&
      (p.lot_address_ko===null||str(p.lot_address_ko,250))&&
      str(p.region_sido,80)&&str(p.region_sigungu,90)&&
      (p.region_dong===null||str(p.region_dong,90))&&
      sourceUrl(p.evidence_url)&&
      numberOrNull(p.latitude,33,39.5)&&numberOrNull(p.longitude,124,132)&&
      ((p.latitude===null&&p.longitude===null)||
        (typeof p.latitude==='number'&&typeof p.longitude==='number'));
  }
  if(kind==='restaurant_publish')
    ok=exact(p,['evidence_url','confirm_live'])&&
      sourceUrl(p.evidence_url)&&p.confirm_live===true;
  if(kind==='visibility_hide')
    ok=exact(p,['evidence_ref','evidence_summary','confirm_hide'])&&
      sourceUrl(p.evidence_ref)&&str(p.evidence_summary,500,20)&&p.confirm_hide===true;
  if(kind==='visibility_restore')ok=Object.keys(p).length===0;
  if(!ok)return {ok:false,error:'invalid_'+kind+'_payload'};
  return {ok:true,value:raw as BulkInput};
}
