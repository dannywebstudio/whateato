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
const knownExcluded='9aaa857f-e20a-4be0-94b5-82c82a63b573'; // 한일식당, not approved for public visibility
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
assert.deepEqual([...urls].sort(),[
 base+'/',...allow.map(([id])=>base+'/restaurant/'+id)
].sort(),'exactly homepage + 3 approved locations until blog is published');
console.log('PASS sitemap: exact 4 URLs and no unpublished articles');

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
const listing=await get('/api/v1/restaurants?hl=ko&limit=30');
assert.equal(listing.status,200,'public restaurant list');
const parsed=JSON.parse(listing.body);
const ids=(parsed.items||[]).map(x=>x.id);
assert.deepEqual(ids.sort(),allow.map(([id])=>id).sort(),'public API may return ONLY 3 restaurants');
console.log('PASS privacy/publication: public API exactly 3 venues, excluded venue hidden');

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
console.log('PASS: All canonical public SEO tests');
