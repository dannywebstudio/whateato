import {getPool} from '@/lib/db';

/**
 * Server-only, fail-closed cap for newly authored Google DB-enrichment APIs.
 * Both day and month are guarded transactionally in Neon; do not expose this
 * function to a public HTTP route or client component.
 *
 * These caps are INTERNAL, not Google billing data. Other apps/projects using
 * the same billing account may consume the actual Google free allowance.
 * Set Google Cloud quotas and restrict API keys separately before enabling.
 */
export type GoogleBillableSku='places_text_search_pro'|'translation_nmt_chars';
type SkuLimit={month:number;day:number};
export const GOOGLE_SAFE_LIMITS:Record<GoogleBillableSku,SkuLimit>={
 places_text_search_pro:{month:300,day:20},
 translation_nmt_chars:{month:100000,day:10000},
};
export type GoogleBudgetResult={month:string;day:string;remainingMonth:number;remainingDay:number};

export class GoogleBudgetBlocked extends Error{
 constructor(public readonly reason:
 'disabled'|'no_database'|'invalid_work_item'|'duplicate_work_item'|'daily_cap'|'monthly_cap'|'invalid_units'){
  super('google_api_blocked:'+reason);this.name='GoogleBudgetBlocked';
 }
}

const DAY_SECONDS=24*60*60;
export function googleBudgetEnabled():boolean{
 return process.env.WHATEATO_GOOGLE_ENRICHMENT_ENABLED==='true';
}
export function getGoogleBudgetPeriod(date:Date){
 if(!Number.isFinite(date.getTime()))throw new GoogleBudgetBlocked('invalid_work_item');
 const iso=date.toISOString();
 return {month:iso.slice(0,7),day:iso.slice(0,10)};
}
export function validateBudgetRequest(sku:GoogleBillableSku,workKey:string,units:number):void{
 if(!Object.hasOwn(GOOGLE_SAFE_LIMITS,sku))throw new GoogleBudgetBlocked('invalid_work_item');
 if(!/^[a-zA-Z0-9][a-zA-Z0-9:._/-]{7,189}$/.test(workKey))
  throw new GoogleBudgetBlocked('invalid_work_item');
 if(!Number.isSafeInteger(units)||units<1||units>GOOGLE_SAFE_LIMITS[sku].day)
  throw new GoogleBudgetBlocked('invalid_units');
}
export async function reserveGoogleBudget(
 sku:GoogleBillableSku,workKey:string,units:number,
 now:Date=new Date()
):Promise<GoogleBudgetResult>{
 if(!googleBudgetEnabled())throw new GoogleBudgetBlocked('disabled');
 validateBudgetRequest(sku,workKey,units);
 const pool=getPool();
 if(!pool)throw new GoogleBudgetBlocked('no_database');
 const {month,day}=getGoogleBudgetPeriod(now);
 const {month:monthlyLimit,day:dailyLimit}=GOOGLE_SAFE_LIMITS[sku];
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  // Reservation key intentionally blocks automatic retries that might bill
  // again after an unknown network failure.
  const inserted=await client.query(
   `INSERT INTO whateato_google_budget_requests_v1(month_key,sku,request_key,charged_units)
      VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING RETURNING request_key`,
   [month,sku,workKey,units]);
  if(inserted.rowCount!==1)throw new GoogleBudgetBlocked('duplicate_work_item');
  // Fixed lock order prevents deadlocks across concurrent jobs.
  for(const key of [month,day]){
   await client.query(
    `INSERT INTO whateato_google_budget_usage_v1(period_key,sku,used_units)
       VALUES($1,$2,0) ON CONFLICT DO NOTHING`,[key,sku]);
  }
  const locks=await client.query<{period_key:string;used_units:string}>(
   `SELECT period_key,used_units::text FROM whateato_google_budget_usage_v1
    WHERE sku=$1 AND period_key IN($2,$3) ORDER BY period_key FOR UPDATE`,[sku,month,day]);
  if(locks.rowCount!==2)throw new GoogleBudgetBlocked('no_database');
  const spent=new Map(locks.rows.map(x=>[x.period_key,Number(x.used_units)]));
  if((spent.get(month)||0)+units>monthlyLimit)throw new GoogleBudgetBlocked('monthly_cap');
  if((spent.get(day)||0)+units>dailyLimit)throw new GoogleBudgetBlocked('daily_cap');
  const usage=await client.query(
   `UPDATE whateato_google_budget_usage_v1
    SET used_units=used_units+$3,updated_at=now()
    WHERE sku=$1 AND period_key IN($2,$4)`,
   [sku,month,units,day]);
  if(usage.rowCount!==2)throw new GoogleBudgetBlocked('no_database');
  await client.query('COMMIT');
  return {
   month,day,
   remainingMonth:monthlyLimit-(spent.get(month)||0)-units,
   remainingDay:dailyLimit-(spent.get(day)||0)-units
  };
 }catch(error){
  await client.query('ROLLBACK');
  throw error;
 }finally{client.release();}
}

// No client-side API key, no wildcard field mask, and no direct Google
// outbound calls outside the explicitly budgeted wrappers below.
export async function googlePlacesTextSearchForReview(input:{
 name:string;address:string;workKey:string
}):Promise<Array<{id:string;name:string;address:string}>>{
 const name=input.name.trim(),address=input.address.trim();
 if(name.length<2||name.length>140||address.length<5||address.length>260)
  throw new GoogleBudgetBlocked('invalid_work_item');
 const key=process.env.WHATEATO_GOOGLE_PLACES_API_KEY?.trim();
 if(!key||!googleBudgetEnabled())throw new GoogleBudgetBlocked('disabled');
 await reserveGoogleBudget('places_text_search_pro',input.workKey,1);
 const response=await fetch('https://places.googleapis.com/v1/places:searchText',{
  method:'POST',headers:{
   'Content-Type':'application/json','X-Goog-Api-Key':key,
   // Text Search Pro: never request ratings/reviews/photos/opening hours.
   'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress'
  },
  body:JSON.stringify({
   textQuery:name+' '+address,languageCode:'ko',regionCode:'KR',pageSize:3
  }),
  signal:AbortSignal.timeout(8000),cache:'no-store'
 });
 if(!response.ok)throw new Error('google_places_request_failed:'+response.status);
 const json=await response.json() as {places?:Array<{
   id?:unknown;displayName?:{text?:unknown};formattedAddress?:unknown
 }>};
 // Short-lived hints for a human reviewer, NOT reusable / permanently
 // saved Google-derived business data. Place IDs themselves may be stored.
 return (Array.isArray(json.places)?json.places:[])
  .filter(x=>typeof x.id==='string')
  .slice(0,3).map(x=>({
    id:String(x.id),
    name:typeof x.displayName?.text==='string'?x.displayName.text:'',
    address:typeof x.formattedAddress==='string'?x.formattedAddress:''
  }));
}

export async function googleTranslateForEditorialReview(input:{
 text:string;to:'en'|'ja'|'zh-CN';workKey:string
}):Promise<string>{
 const source=input.text.trim();
 if(!source||source.length>3000)throw new GoogleBudgetBlocked('invalid_units');
 const key=process.env.WHATEATO_GOOGLE_TRANSLATE_API_KEY?.trim();
 if(!key||!googleBudgetEnabled())throw new GoogleBudgetBlocked('disabled');
 // JS UTF-16 length is a conservative upper bound on Unicode codepoints
 // (Google bills submitted characters in the request).
 await reserveGoogleBudget('translation_nmt_chars',input.workKey,source.length);
 const response=await fetch(
   'https://translation.googleapis.com/language/translate/v2?key='+encodeURIComponent(key),{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({q:source,source:'ko',target:input.to,format:'text'}),
    signal:AbortSignal.timeout(8000),cache:'no-store'
   });
 if(!response.ok)throw new Error('google_translation_request_failed:'+response.status);
 const payload=await response.json() as {
  data?:{translations?:Array<{translatedText?:unknown}>}
 };
 const result=payload.data?.translations?.[0]?.translatedText;
 if(typeof result!=='string'||!result.trim())throw new Error('google_translation_empty_response');
 // ALWAYS editorial-review-only; never auto publish a machine translation.
 return result;
}
