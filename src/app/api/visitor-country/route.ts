import {createHash} from 'node:crypto';
import {NextRequest,NextResponse} from 'next/server';
import {countryFromGeoHeaders,publicVisitorIp,validCountryCode}
 from '@/lib/visitor-country';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type CacheEntry={country:string|null;expires:number};
const cache=new Map<string,CacheEntry>();
let usageDay='',usageCount=0;
// No visitor IP, location or query history is stored in the database or logs.
// Free HTTPS provider is only used if our hosting/CDN didn't supply a region.
function json(country:string|null,source:'edge'|'ip'|'unavailable'){
 return NextResponse.json({country,source},{
  headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}});
}
export async function GET(req:NextRequest){
 const edge=countryFromGeoHeaders(req.headers);
 if(edge)return json(edge,'edge');
 const ip=publicVisitorIp(req.headers);
 if(!ip||process.env.WHATEATO_GEOIP_LOOKUP_ENABLED==='false')
  return json(null,'unavailable');
 const key=createHash('sha256').update('whateato-geo-v1:'+ip).digest('hex');
 const now=Date.now(),stored=cache.get(key);
 if(stored&&stored.expires>now)return json(stored.country,stored.country?'ip':'unavailable');
 const day=new Date(now).toISOString().slice(0,10);
 if(day!==usageDay){usageDay=day;usageCount=0;}
 // Stay below the provider's free daily budget. Fail back to device hints.
 if(usageCount>=700)return json(null,'unavailable');
 usageCount++;
 let country:string|null=null;
 try{
  const response=await fetch('https://ipwho.is/'+encodeURIComponent(ip),{
   method:'GET',cache:'no-store',signal:AbortSignal.timeout(2000),
   headers:{Accept:'application/json'}});
  if(response.ok){
   const result=await response.json() as {success?:boolean;country_code?:unknown};
   const raw=typeof result.country_code==='string'?
    result.country_code.toUpperCase():null;
   if(result.success!==false&&validCountryCode(raw))country=raw;
  }
 }catch{/* Offline, rate-limited or slow geolocation must never block navigation. */}
 if(cache.size>=600)cache.delete(cache.keys().next().value!);
 cache.set(key,{country,expires:now+(country?12*3600000:15*60000)});
 return json(country,country?'ip':'unavailable');
}
