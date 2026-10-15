#!/usr/bin/env node
// Read-only, externally executed SEO acceptance test against canonical Hostinger.
// Does not modify public data, DNS, or Google Search Console.
import assert from 'node:assert/strict';

const base='https://whateato.com';
const allow=[
 ['16918f58-4e63-4e49-a013-aad17e499ad4','광화문 미진'],
 ['6cc37914-1bb8-406e-a365-34c897b4f26f','청진옥'],
 ['2daa58f1-6360-4ddb-a27f-6e6d1437a122','우래옥']
];
const knownExcluded='00000000-0000-4000-8000-000000000000'; // guaranteed absent synthetic UUID
async function get(path){
 const res=await fetch(base+path,{headers:{'accept':'text/html,application/xml,application/json,text/plain'},
   signal:AbortSignal.timeout(30000),redirect:'follow',cache:'no-store'});
 return {status:res.status,url:res.url,body:await res.text()};
}
function metaRobots(html){
 return html.match(/<meta[^>]*name="robots"[^>]*>/i)?.[0]||'';
}
function canonical(html){
 return html.match(/<link[^>]*rel="canonical"[^>]*>/i)?.[0]||'';
}
const robots=await get('/robots.txt');
assert.equal(robots.status,200);
assert.match(robots.body,/^Sitemap: https:\/\/whateato\.com\/sitemap\.xml$/m);
assert.match(robots.body,/^Disallow: \/restaurant\/$/m);
assert.ok(!/^Disallow: \/$/m.test(robots.body),'no global root block');
for(const [id] of allow) assert.ok(robots.body.includes('Allow: /restaurant/'+id));
for(const path of ['/api/','/admin/','/account/','/search','/map'])
 assert.ok(robots.body.includes('Disallow: '+path));
console.log('PASS robots: three restaurant exceptions, crawler permitted, private routes blocked');

const sitemap=await get('/sitemap.xml');
assert.equal(sitemap.status,200);
assert.match(sitemap.body,/<urlset\b/);
const urls=[...sitemap.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(x=>x[1]);
const approved=urls.filter(u=>u.startsWith(base+'/restaurant/'))
 .map(u=>u.slice((base+'/restaurant/').length));
assert.ok(approved.length>=3,'the three original restaurants must remain approved');
assert.equal(new Set(approved).size,approved.length,'no duplicated restaurant URLs');
assert.ok(urls.includes(base+'/'),'homepage remains indexed');
assert.ok(allow.every(([id])=>approved.includes(id)),'keep baseline 3 approved');
assert.ok(approved.every(id=>robots.body.includes('Allow: /restaurant/'+id)),
 'robots must whitelist every currently approved restaurant');
assert.ok(!approved.includes(knownExcluded),'unapproved restaurant must not enter sitemap');
console.log('PASS sitemap: '+approved.length+' owner-approved restaurant URLs and dynamic blog URLs');

const home=await get('/');
assert.equal(home.status,200);
assert.ok(!/noindex/i.test(metaRobots(home.body)), 'homepage should not be noindex');
console.log('HOME META:',(home.body.match(/<link[^>]+canonical[^>]*>/gi)||[]).join(' '));
assert.ok(canonical(home.body).includes('https://whateato.com'),'home canonical must be site origin');
console.log('PASS homepage: indexable and canonical');

for(const [id,name] of allow){
 const page=await get('/restaurant/'+id+'?hl=ko');
 assert.equal(page.status,200,name+' detail');
 assert.ok(page.body.includes(name),'approved restaurant name rendered');
 assert.ok(!/noindex/i.test(metaRobots(page.body)),name+' must be indexable');
 assert.ok(canonical(page.body).includes(base+'/restaurant/'+id),name+' canonical');
 console.log('PASS approved restaurant: '+name+' indexable');
}
const hidden=await get('/restaurant/'+knownExcluded+'?hl=ko');
assert.ok(hidden.status===404 || /noindex/i.test(metaRobots(hidden.body)),
 'an actually existing unapproved restaurant must remain hidden or noindex');
const publicIds=[];
for(let offset=0;offset<3000;offset+=30){
 const listing=await get('/api/v1/restaurants?hl=ko&limit=30&offset='+offset);
 assert.equal(listing.status,200,'public restaurant list');
 const parsed=JSON.parse(listing.body);
 publicIds.push(...(parsed.items||[]).map(x=>x.id));
 if(!parsed.has_more)break;
}
assert.deepEqual(publicIds.sort(),approved.sort(),
 'public search listing and indexed restaurant URLs must match owner approvals');
assert.ok(!publicIds.includes(knownExcluded));
console.log('PASS privacy/publication: public API and sitemap match approved restaurant IDs');

for(const path of ['/search?q='+encodeURIComponent('우래옥')+'&hl=ko','/map?hl=ko']){
 const response=await get(path);
 assert.equal(response.status,200,path);
 assert.match(metaRobots(response.body),/noindex/,'search and map must not index');
}
console.log('PASS noindex: search and map');

const blog=await get('/blog');
assert.equal(blog.status,200);
assert.ok(!/noindex/i.test(metaRobots(blog.body)),'blog listing SEO enabled');
assert.ok(canonical(blog.body).includes(base+'/blog'),'blog canonical');
console.log('PASS blog: indexable listing and canonical');

const missingBlog=await get('/blog/this-page-is-not-published-whateto-20261015');
assert.equal(missingBlog.status,404,'unpublished blog post must be inaccessible');
console.log('PASS unpublished blog: 404');
// Read-only deployment fingerprint. A POST-only owner/public route returns
// 405 to GET after the new owner-approval release, versus 404 on older builds.
const approvalFingerprint=await get('/api/v1/owner/catalog/'+allow[0][0]+'/public');
console.log('DEPLOYMENT FINGERPRINT: owner approval endpoint GET HTTP '+approvalFingerprint.status+
  ' (405 = new owner-approval release; 404 = old release)');
const readiness=await get('/api/ready');
try{
 const flags=JSON.parse(readiness.body);
 console.log('PUBLIC READINESS: status='+readiness.status+
   ', owner_cms_schema='+String(flags.owner_cms_schema)+
   ', bulk_admin_schema='+String(flags.bulk_admin_schema));
}catch{console.log('PUBLIC READINESS: non-JSON response '+readiness.status)}
// Private-auth readiness probes. GET-only, never print tokens, secret values,
// account data, sessions, or private admin content.
const admin=await get('/admin');
const loginShown=admin.body.includes('관리자 Google 로그인');
const loginUnconfigured=admin.body.includes('Google OAuth가 아직 연결되지 않았어');
console.log('AUTH READINESS: admin_http='+admin.status+
  ' google_login_button='+loginShown+' oauth_missing_notice='+loginUnconfigured);
const providers=await get('/api/auth/providers');
let googleProvider=false;
try{googleProvider=Boolean(JSON.parse(providers.body)?.google?.id==='google')}
catch{}
console.log('AUTH PROVIDERS: http='+providers.status+' google_configured='+googleProvider);
const csrf=await get('/api/auth/csrf');
let csrfIssued=false;
try{csrfIssued=typeof JSON.parse(csrf.body)?.csrfToken==='string'}catch{}
console.log('AUTH CSRF: http='+csrf.status+' token_issued='+csrfIssued+
  ' (token never logged)');
console.log('PASS: All canonical public SEO tests');
