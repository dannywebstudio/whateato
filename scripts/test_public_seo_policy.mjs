#!/usr/bin/env node
// Contract QA for live dynamic owner-approved publication; all DB calls mocked.
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
try{
 const seo=load('src/lib/public-seo.ts',{
  '@/lib/db':{getPool:()=>({query:async q=>{
   assert.match(q,/whateato_restaurant_public_approvals_v1/);
   assert.match(q,/a.is_visible=true/);
   return {rows:ids.map(id=>({id}))};
  }})}
 });
 const robots=load('src/app/robots.ts',{'@/lib/public-seo':seo});
 let publishedQuery='';
 const sitemap=load('src/app/sitemap.ts',{
  '@/lib/public-seo':seo,
  '@/lib/restaurant-catalog':{getRestaurantCatalogDetail:async id=>{
   assert.ok(ids.includes(id),'unapproved restaurant must not enter sitemap');
   return {restaurant:{short_description:'Verified public restaurant description of sufficient length.'}};
  }},
  '@/lib/db':{getPool:()=>({query:async q=>{
   publishedQuery=q;
   return {rows:[{slug:'approved-food-guide',published_at:new Date('2026-10-15T00:00:00Z')}]};
  }})}
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
 const pages=await sitemap.default();
 const urls=pages.map(p=>p.url);
 assert.equal(urls.length,7,'home, 4 approved restaurants, blog and one published article');
 assert.ok(urls.includes('https://whateato.com/'));
 assert.ok(urls.includes('https://whateato.com/blog/approved-food-guide'));
 assert.ok(ids.every(id=>urls.includes('https://whateato.com/restaurant/'+id)));
 assert.ok(!urls.includes('https://whateato.com/restaurant/'+unapprovedId));
 assert.match(publishedQuery,/u\.is_visible=true/);
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
 const blog=readFileSync('src/app/blog/[slug]/page.tsx','utf8');
 assert.match(blog,/findPublishedBlog/);
 console.log('PASS: canonical, owner-driven public approval, revocation/hidden gates and published blog sitemap');
}finally{
 const restore=(name,value)=>value===undefined?delete process.env[name]:process.env[name]=value;
 restore('WHATEATO_SEO_PUBLIC_ENABLED',old.seo);
 restore('NEXT_PUBLIC_SITE_URL',old.origin);
 restore('NEXT_PUBLIC_LAUNCH_READY',old.launch);
}
