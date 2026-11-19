#!/usr/bin/env node
// Offline SEO publication contract: no database, website or Search Console needed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';

function load(path,modules={}){
 const content=readFileSync(path,'utf8');
 const compiled=ts.transpileModule(content,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
 }}).outputText;
 const m={exports:{}};
 new Function('require','module','exports','process',compiled)(
  name=>{if(!(name in modules))throw Error('Unmocked import: '+name);return modules[name]},
  m,m.exports,process);
 return m.exports;
}

const old={seo:process.env.WHATEATO_SEO_PUBLIC_ENABLED,
 origin:process.env.NEXT_PUBLIC_SITE_URL,launch:process.env.NEXT_PUBLIC_LAUNCH_READY};
const ids=[
 '16918f58-4e63-4e49-a013-aad17e499ad4',
 '6cc37914-1bb8-406e-a365-34c897b4f26f',
 '2daa58f1-6360-4ddb-a27f-6e6d1437a122',
 '11111111-1111-4111-8111-111111111111'
];
const unapprovedId='22222222-2222-4222-8222-222222222222';
const timestamp=new Date('2026-11-16T00:00:00.000Z');
const verifiedLocalizations=ids.flatMap((id,i)=>[
 {restaurant_id:id,locale:'ko',updated_at:timestamp},
 {restaurant_id:id,locale:'en',updated_at:timestamp},
 ...(i===0?[
  {restaurant_id:id,locale:'ja',updated_at:timestamp},
  {restaurant_id:id,locale:'zh-CN',updated_at:timestamp}
 ]:[])
]);
const publishedBlog=[
 {slug:'approved-food-guide',published_at:timestamp,
  has_en:true,has_ko:true,has_ja:true,has_zh_cn:true},
 {slug:'en-only-guide',published_at:timestamp,
  has_en:true,has_ko:false,has_ja:false,has_zh_cn:false}
];
let publishedQuery='';
const pool={query:async (sql,params)=>{
 if(sql.includes('SELECT a.restaurant_id::text AS id')){
  assert.match(sql,/whateato_restaurant_public_approvals_v1/);
  assert.match(sql,/a.is_visible=true/);
  return {rows:ids.map(id=>({id}))};
 }
 if(sql.includes('l.restaurant_id::text AS restaurant_id')){
  assert.match(sql,/a.is_visible=true/);
  assert.match(sql,/l.verified_at IS NOT NULL/);
  assert.match(sql,/l.publication_state='published'/);
  assert.ok(params?.[0]?.every(id=>ids.includes(id)));
  return {rows:verifiedLocalizations.filter(row=>params[0].includes(row.restaurant_id))};
 }
 if(sql.includes('has_zh_cn')){
  publishedQuery=sql;
  return {rows:publishedBlog};
 }
 throw Error('Unexpected SEO SQL: '+sql.slice(0,120));
}};
const poolModule={getPool:()=>pool};
try{
 const seo=load('src/lib/public-seo.ts',{'@/lib/db':poolModule});
 const locales=load('src/lib/seo-locales.ts',{'@/lib/public-seo':seo});
 const redirects=load('src/middleware.ts',{'next/server':{
  NextResponse:{
   next:()=>({type:'next'}),
   redirect:(url,status)=>({type:'redirect',url:url.toString(),status})
  }
 }});
 const fakeRequest=(host,path)=>({headers:{get:key=>key==='host'?host:null},
  nextUrl:{hostname:host.split(':')[0],clone:()=>new URL('https://'+host+path)}});
 const original=redirects.middleware(fakeRequest('whateato.com','/blog/test?hl=ko'));
 assert.equal(original.type,'next','canonical non-www host must not redirect');
 const www=redirects.middleware(fakeRequest('www.whateato.com','/blog/test?hl=ja'));
 assert.deepEqual(www,{type:'redirect',url:'https://whateato.com/blog/test?hl=ja',status:308});
 assert.equal(redirects.middleware(fakeRequest('localhost:3000','/')).type,'next');

 const approved=load('src/lib/seo-restaurant-locales.ts',{
  '@/lib/db':poolModule,
  '@/lib/platform-v1':{isUuid:v=>typeof v==='string'&&/^[0-9a-f-]{36}$/.test(v)}
 });
 const robots=load('src/app/robots.ts',{'@/lib/public-seo':seo});
 const sitemap=load('src/app/sitemap.ts',{
  '@/lib/public-seo':seo,
  '@/lib/seo-locales':locales,
  '@/lib/seo-restaurant-locales':approved,
  '@/lib/restaurant-catalog':{getRestaurantCatalogDetail:async id=>{
   assert.ok(ids.includes(id),'unapproved restaurant must not enter sitemap');
   return {restaurant:{short_description:'Verified public restaurant description of sufficient length.'}};
  }},
  '@/lib/db':poolModule
 });
 const triage=load('src/lib/triage-ab-gate.ts');

 process.env.NEXT_PUBLIC_LAUNCH_READY='true';
 process.env.WHATEATO_SEO_PUBLIC_ENABLED='false';
 process.env.NEXT_PUBLIC_SITE_URL='https://whateato.com';
 assert.equal(seo.seoPublicEnabled(),false,'launch flag must not control SEO');
 assert.deepEqual((await robots.default()).rules,[{userAgent:'*',disallow:'/'}]);
 assert.deepEqual(await sitemap.default(),[]);
 process.env.WHATEATO_SEO_PUBLIC_ENABLED='true';
 process.env.NEXT_PUBLIC_SITE_URL='https://example.com';
 assert.equal(seo.seoPublicEnabled(),false,'noncanonical host must stay blocked');
 process.env.NEXT_PUBLIC_SITE_URL='https://whateato.com';
 assert.equal(seo.seoPublicEnabled(),true);

 const rules=await robots.default();
 assert.ok(rules.rules[0].disallow.includes('/restaurant/'));
 assert.ok(ids.every(id=>rules.rules[0].allow.includes('/restaurant/'+id)));
 assert.ok(!rules.rules[0].allow.includes('/restaurant/'+unapprovedId));
 assert.equal(rules.sitemap,'https://whateato.com/sitemap.xml');

 assert.equal(locales.blogArticlePath('guide','en'),'/blog/guide');
 assert.equal(locales.blogArticlePath('guide','ja'),'/ja/blog/guide');
 assert.equal(locales.blogArticlePath('guide','ko'),'/blog/guide?hl=ko');
 assert.equal(locales.blogArticlePath('guide','zh-CN'),'/blog/guide?hl=zh-CN');
 assert.equal(locales.restaurantPath(ids[0],'ko'),'/restaurant/'+ids[0]);
 assert.equal(locales.restaurantPath(ids[0],'ja'),'/restaurant/'+ids[0]+'?hl=ja');

 const pages=await sitemap.default();
 const urls=pages.map(p=>p.url);
 assert.equal(urls.length,20,'home + 10 approved restaurant locale URLs + 5 article locale URLs + 4 blog index locales');
 assert.equal(new Set(urls).size,urls.length,'sitemap must have no duplicate URLs');
 assert.ok(urls.includes('https://whateato.com/'));
 assert.ok(urls.includes('https://whateato.com/blog/approved-food-guide'));
 assert.ok(urls.includes('https://whateato.com/ja/blog/approved-food-guide'));
 assert.ok(urls.includes('https://whateato.com/blog/approved-food-guide?hl=ko'));
 assert.ok(urls.includes('https://whateato.com/blog/approved-food-guide?hl=zh-CN'));
 assert.ok(urls.includes('https://whateato.com/blog/en-only-guide'));
 assert.ok(!urls.includes('https://whateato.com/ja/blog/en-only-guide'));
 assert.ok(!urls.includes('https://whateato.com/blog/en-only-guide?hl=ko'));
 assert.ok(!urls.includes('https://whateato.com/restaurant/'+unapprovedId));
 assert.ok(ids.every(id=>urls.includes('https://whateato.com/restaurant/'+id)));
 assert.ok(!urls.includes('https://whateato.com/restaurant/'+ids[1]+'?hl=ja'));
 assert.match(publishedQuery,/u\.is_visible=true/);

 const articleVariants=pages.filter(p=>/approved-food-guide/.test(p.url));
 assert.equal(articleVariants.length,4);
 const languages=articleVariants[0].alternates.languages;
 assert.deepEqual(Object.keys(languages).sort(),['en','ja','ko','x-default','zh-CN'].sort());
 assert.equal(languages.ja,'https://whateato.com/ja/blog/approved-food-guide');
 assert.equal(languages['x-default'],'https://whateato.com/blog/approved-food-guide');
 for(const entry of articleVariants)assert.deepEqual(entry.alternates.languages,languages,'hreflang must be reciprocal');
 const englishOnly=pages.find(p=>p.url.endsWith('/blog/en-only-guide'));
 assert.deepEqual(Object.keys(englishOnly.alternates.languages).sort(),['en','x-default'].sort());
 const restaurantVariants=pages.filter(p=>p.url.includes('/restaurant/'+ids[0]));
 assert.equal(restaurantVariants.length,4);
 for(const entry of restaurantVariants)
  assert.deepEqual(entry.alternates.languages,restaurantVariants[0].alternates.languages);

 const sql=triage.triageABPublicWhere();
 assert.match(sql,/whateato_restaurant_public_approvals_v1/);
 assert.match(sql,/approval.is_visible=true/);
 assert.match(sql,/triage.grade='C'/);
 assert.match(sql,/dq.review_state='confirmed_hold'/);
 assert.match(sql,/hours.verified_at IS NOT NULL/);
 assert.ok(!sql.includes(ids[0]),'no fixed IDs in public query');
 const migration=readFileSync('db/migrations/021_owner_approved_public_restaurants.sql','utf8');
 assert.match(migration,/ON CONFLICT \(restaurant_id\) DO NOTHING/);
 assert.equal((migration.match(/'16918f58-|\'6cc37914-|\'2daa58f1-/g)||[]).length,3);
 const layout=readFileSync('src/app/layout.tsx','utf8');
 assert.match(layout,/const ready=false;/);
 const header=readFileSync('src/components/Header.tsx','utf8');
 assert.match(header,/navigateLanguage\(preferred,false\)/,
  'automatic geo detection must not force a canonical language route change');
 assert.doesNotMatch(header,/navigateLanguage\(preferred,true\)/,
  'geo detection must not rewrite public SEO URLs');
 assert.match(header,/if\(!manual\)return;/,
  'canonical content routes may only change language following user choice');
 assert.match(header,/\/ja\/blog\//,
  'manual Japanese article navigation must use the canonical /ja/blog route');
 const blog=readFileSync('src/app/blog/[slug]/page.tsx','utf8');
 assert.match(blog,/findPublishedBlog/);
 assert.match(blog,/localizedAlternates/);
 console.log('PASS: 4-language sitemap, verified locale gating, self canonical mapping, reciprocal hreflang, and owner approvals');
}finally{
 const restore=(name,value)=>value===undefined?delete process.env[name]:process.env[name]=value;
 restore('WHATEATO_SEO_PUBLIC_ENABLED',old.seo);
 restore('NEXT_PUBLIC_SITE_URL',old.origin);
 restore('NEXT_PUBLIC_LAUNCH_READY',old.launch);
}
