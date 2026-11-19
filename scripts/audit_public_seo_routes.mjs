#!/usr/bin/env node
/**
 * WhatEatO public SEO URL audit (read-only).
 *
 * Usage:
 *   node scripts/audit_public_seo_routes.mjs [https://whateato.com] [sampleCount]
 *
 * HTTP requests are GET only, follow redirects manually and never authenticate.
 * A URL in the XML sitemap must resolve directly to HTTP 200, be indexable,
 * and have a self-referencing canonical. Dynamic search/map/auth routes must
 * remain noindex. www and http aliases are diagnostic, not assumed configured.
 */
import assert from 'node:assert/strict';

const origin=(process.argv[2]||'https://whateato.com').replace(/\/+$/,'');
const maxSamples=Math.max(4,Math.min(40,Number.parseInt(process.argv[3]||'16',10)||16));
assert.match(origin,/^https:\/\/[a-z0-9.-]+$/i,'Expected HTTPS origin');
const issues=[],warnings=[],observations=[];
const timeoutMs=18000;
const ua='WhatEatO-SEO-URL-Audit/1.0 (+read-only; no private data)';
const originHost=new URL(origin).hostname;
function absolute(input){return new URL(input,origin).href;}
function dexml(value){return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&apos;/g,"'").trim();}
function capture(html,kind){
 const elements=html.match(/<(?:link|meta)\b[^>]*>/gi)||[];
 const tag=elements.find(v=>kind==='canonical'?/\brel=["']canonical["']/i.test(v):/\bname=["']robots["']/i.test(v));
 const m=tag?.match(kind==='canonical'?/\bhref="([^"]+)"/i:/\bcontent="([^"]+)"/i);
 return m?.[1]||'';
}
function sameCanonical(actual,expected){
 try{return new URL(actual,origin).href===new URL(expected,origin).href;}catch{return false;}
}
async function trace(url){
 const chain=[],seen=new Set();
 for(let i=0;i<6;i++){
  if(seen.has(url))return {error:'redirect_loop',chain};
  seen.add(url);
  let res;
  try{res=await fetch(url,{redirect:'manual',cache:'no-store',headers:{
   'User-Agent':ua,'Accept':'text/html,application/xml,text/plain,*/*'
  },signal:AbortSignal.timeout(timeoutMs)});}
  catch(e){return {error:String(e).slice(0,140),chain};}
  const status=res.status,location=res.headers.get('location');
  chain.push({url,status,location:location||undefined});
  if(status>=300&&status<400&&location){
   url=new URL(location,url).href;
   continue;
  }
  let body='';
  try{body=await res.text()}catch(e){return {error:'cannot_read_response',chain}}
  return {url,status,body,chain};
 }
 return {error:'redirect_chain_too_long',chain};
}
function record(label,response,kind='sample'){
 const {status,url,chain,error}=response;
 const hops=chain?.length?chain.length-1:0;
 observations.push({label,kind,status:status||null,hops,url:url||null,error:error||null});
 if(error||!status)return issues.push(label+': '+(error||'missing status'));
 if(kind==='sitemap'&&hops>0)issues.push(label+': XML sitemap contains redirecting URL ('+hops+' hops)');
 if(hops>=3)issues.push(label+': long redirect chain ('+hops+' hops)');
}
const root=await trace(origin+'/');
const robots=await trace(origin+'/robots.txt');
const sm=await trace(origin+'/sitemap.xml');
for(const [name,r] of [['home',root],['robots',robots],['sitemap',sm]])record(name,r);
if(root.status!==200)issues.push('Homepage does not return HTTP 200');
if(robots.status!==200)issues.push('robots.txt does not return HTTP 200');
if(sm.status!==200)issues.push('sitemap.xml does not return HTTP 200');

if(robots.body){
 if(/^Disallow:\s*\/\s*$/mi.test(robots.body))
  issues.push('robots.txt currently disallows all crawling (check production SEO environment gate)');
 if(!robots.body.includes('Sitemap: '+origin+'/sitemap.xml'))
  issues.push('robots.txt missing canonical Sitemap declaration');
}
if(root.body){
 const canonical=capture(root.body,'canonical');
 if(!sameCanonical(canonical,origin+'/'))issues.push('Homepage canonical mismatch: '+(canonical||'(missing)'));
 if(/\bnoindex\b/i.test(capture(root.body,'robots')))
  issues.push('Homepage has noindex');
}
const rawSitemap=sm.body||'';
if(!/<urlset\b/i.test(rawSitemap))issues.push('Sitemap is not a populated XML urlset');
const locs=[...rawSitemap.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)].map(x=>dexml(x[1]));
if(!locs.length)issues.push('Sitemap contains no <loc> pages');
if(locs.length!==new Set(locs).size)issues.push('Duplicate <loc> URLs detected');
for(const url of locs){
 try{
  const p=new URL(url);
  if(p.origin!==origin)issues.push('Off-origin sitemap URL: '+url);
  if(p.hash)issues.push('Sitemap URL contains fragment: '+url);
  if(/\/(api|admin|account|search|map)(\/|\?|$)/.test(p.pathname)||/[?&](?:q|category|page|f|focus)=/.test(url))
   issues.push('Nonindexable parameter route in sitemap: '+url);
 }catch{issues.push('Invalid <loc>: '+url);}
}
const groups={home:locs.filter(u=>u===origin+'/'),
 blog:locs.filter(u=>new URL(u).pathname.startsWith('/blog')),
 ja:locs.filter(u=>new URL(u).pathname.startsWith('/ja/blog')),
 restaurant:locs.filter(u=>new URL(u).pathname.startsWith('/restaurant'))
};
console.log('SITEMAP COUNTS',JSON.stringify(Object.fromEntries(Object.entries(groups).map(([k,v])=>[k,v.length]))));
if(!groups.home.length)issues.push('Homepage not listed in sitemap');
if(!groups.blog.length)issues.push('No blog URLs in sitemap (check CMS/SEO gate)');
if(!groups.restaurant.length)warnings.push('No restaurant detail URLs; check owner approvals and source DB');

const selected=new Set([origin+'/']);
for(const type of ['blog','ja','restaurant']){
 const list=groups[type];
 for(const url of list.slice(0,Math.ceil(maxSamples/3)))selected.add(url);
}
for(const lang of ['en','ja','ko','zh-CN']){
 const item=locs.find(u=>u.includes('/blog/')&&(
  lang==='ja'?u.includes('/ja/blog/'):
  lang==='ko'?u.includes('hl=ko'):
  lang==='zh-CN'?u.includes('hl=zh-CN'):
  !u.includes('/ja/blog/')&&!u.includes('hl=')));
 if(item)selected.add(item);
}
for(const url of [...locs].slice(0,3))selected.add(url);
let checked=0;
for(const url of selected){
 const r=await trace(url);
 record('sitemap:'+url,r,'sitemap');
 if(r.status!==200)issues.push('Sitemap destination not 200: '+url+' -> '+(r.status||r.error));
 if(r.body){
  const canonical=capture(r.body,'canonical');
  if(!sameCanonical(canonical,url))issues.push('Canonical mismatch: '+url+' -> '+(canonical||'(missing)'));
  if(/\bnoindex\b/i.test(capture(r.body,'robots')))issues.push('Sitemap destination is noindex: '+url);
 }
 if(++checked>=maxSamples+4)break;
}
for(const pathname of ['/map','/search','/login','/my-page']){
 const r=await trace(origin+pathname);
 record('private:'+pathname,r);
 if(r.status===200&&r.body&&!/\bnoindex\b/i.test(capture(r.body,'robots'))){
  issues.push(pathname+' must remain noindex');
 }
}
for(const alias of ['http://'+originHost+'/','https://www.'+originHost.replace(/^www\./,'')+'/']){
 if(alias===origin+'/')continue;
 const r=await trace(alias);
 record('alias:'+alias,r);
 if(r.error)warnings.push('Unable to test optional alias '+alias+': '+r.error);
 else if(r.status===200 && r.url!==origin+'/')
  issues.push('Noncanonical alias has a duplicate 200 URL: '+alias+' -> '+r.url);
 else if(r.status!==200)
  warnings.push('Alias did not resolve to a 200 target: '+alias+' -> '+r.status);
 else if(r.chain?.length>3)
  warnings.push('Alias uses '+(r.chain.length-1)+' redirects: '+alias);
}
console.log('URL PROBES');
for(const row of observations)console.log(JSON.stringify(row));
for(const line of warnings)console.log('WARN:',line);
for(const line of issues)console.error('FAIL:',line);
console.log('RESULT:',issues.length?'FAIL':'PASS','checked='+observations.length,
 'sitemapLocs='+locs.length,'issues='+issues.length,'warnings='+warnings.length);
if(issues.length)process.exitCode=1;
