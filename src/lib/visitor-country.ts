import {isIP} from 'node:net';

export type SiteLanguage='ko'|'en'|'ja'|'zh-CN';
export function languageForCountry(country:string):SiteLanguage{
 const code=country.trim().toUpperCase();
 if(code==='KR')return 'ko';
 if(code==='JP')return 'ja';
 if(code==='CN')return 'zh-CN';
 return 'en';
}
export function validCountryCode(raw:unknown):raw is string{
 return typeof raw==='string'&&/^[A-Z]{2}$/.test(raw)&&raw!=='ZZ'&&raw!=='XX';
}
export function countryFromGeoHeaders(headers:Headers):string|null{
 for(const name of ['cf-ipcountry','x-vercel-ip-country','cloudfront-viewer-country']){
  const code=headers.get(name)?.trim().toUpperCase();
  if(validCountryCode(code))return code;
 }
 return null;
}
export function publicVisitorIp(headers:Headers):string|null{
 // Render app edge forwards the true visiting IP. Never trust IP strings in
 // URLs or persist them; only send a syntactically valid public address.
 const candidate=(headers.get('cf-connecting-ip')||
   headers.get('x-forwarded-for')?.split(',')[0]||'').trim();
 if(!candidate||!isIP(candidate))return null;
 if(candidate==='::1'||candidate==='0.0.0.0')return null;
 if(candidate.includes(':')) {
  if(/^(?:fc|fd|fe80|::ffff:127\.)/i.test(candidate))return null;
  return candidate;
 }
 const v=candidate.split('.').map(Number);
 if(v[0]===0||v[0]===10||v[0]===127||v[0]>=224||
  (v[0]===100&&v[1]>=64&&v[1]<=127)||
  (v[0]===169&&v[1]===254)||
  (v[0]===172&&v[1]>=16&&v[1]<=31)||
  (v[0]===192&&v[1]===168)||
  (v[0]===192&&v[1]===0)||
  (v[0]===198&&(v[1]===18||v[1]===19))||
  (v[0]===203&&v[1]===0&&v[2]===113)||
  (v[0]===192&&v[1]===0&&v[2]===2)||
  (v[0]===198&&v[1]===51&&v[2]===100))return null;
 return candidate;
}
