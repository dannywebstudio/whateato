#!/usr/bin/env node
// Contract QA: checks the actual TS robots/sitemap functions with isolated mocks.
// No production DB, live network requests or external publishing.
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
   name=>{
     if(!(name in modules))throw Error('Unmocked import: '+name);
     return modules[name];
   },m,m.exports,process);
 return m.exports;
}
const old={seo:process.env.WHATEATO_SEO_PUBLIC_ENABLED,
  origin:process.env.NEXT_PUBLIC_SITE_URL,launch:process.env.NEXT_PUBLIC_LAUNCH_READY};
try{
 const seo=load('src/lib/public-seo.ts');
 const ids=seo.SEO_RESTAURANT_IDS;
 assert.equal(ids.length,3);
 assert.equal(new Set(ids).size,3);
 const robots=load('src/app/robots.ts',{'@/lib/public-seo':seo});
 let publishedQuery='';
 const sitemap=load('src/app/sitemap.ts',{
  '@/lib/public-seo':seo,
  '@/lib/restaurant-catalog':{getRestaurantCatalogDetail:async id=>{
    assert.ok(ids.includes(id),'unapproved restaurant must not be requested');
    return {restaurant:{short_description:'Verified public restaurant description of sufficient length.'}};
  }},
  '@/lib/db':{getPool:()=>({query:async text=>{
    publishedQuery=text;
    return {rows:[{slug:'verified-editorial-guide',published_at:new Date('2026-10-15T00:00:00Z')}]};
  }})}
 });
 const triage=load('src/lib/triage-ab-gate.ts',{'@/lib/public-seo':seo});
 process.env.NEXT_PUBLIC_LAUNCH_READY='true';
 process.env.WHATEATO_SEO_PUBLIC_ENABLED='false';
 process.env.NEXT_PUBLIC_SITE_URL='https://whateato.com';
 assert.equal(seo.seoPublicEnabled(),false,'launch flag must not control SEO');
 assert.deepEqual(robots.default().rules,[{userAgent:'*',disallow:'/'}]);
 assert.deepEqual(await sitemap.default(),[]);
 process.env.WHATEATO_SEO_PUBLIC_ENABLED='true';
 process.env.NEXT_PUBLIC_SITE_URL='https://example.com';
 assert.equal(seo.seoPublicEnabled(),false,'noncanonical host must stay blocked');
 process.env.NEXT_PUBLIC_SITE_URL='https://whateato.com';
 assert.equal(seo.seoPublicEnabled(),true);
 const rules=robots.default();
 assert.ok(rules.rules[0].disallow.includes('/restaurant/'));
 assert.ok(ids.every(id=>rules.rules[0].allow.includes('/restaurant/'+id)));
 assert.equal(rules.sitemap,'https://whateato.com/sitemap.xml');
 const pages=await sitemap.default();
 const urls=pages.map(p=>p.url);
 assert.equal(urls.length,6,'home, exactly 3 restaurants, blog and approved article');
 assert.ok(urls.includes('https://whateato.com/'));
 assert.ok(urls.includes('https://whateato.com/blog/verified-editorial-guide'));
 assert.ok(ids.every(id=>urls.includes('https://whateato.com/restaurant/'+id)));
 assert.ok(urls.filter(x=>x.includes('/restaurant/')).length===3);
 assert.match(publishedQuery,/u\.is_visible=true/);
 assert.match(publishedQuery,/snapshot->'translations'->'en'/);
 const sql=triage.triageABPublicWhere();
 assert.ok(ids.every(id=>sql.includes(id)),'actual catalog SQL must restrict to 3');
 assert.ok(sql.includes("triage.grade IN ('A','B')"),'original A/B quality gate stays');
 process.env.WHATEATO_SEO_PUBLIC_ENABLED='false';
 assert.ok(ids.every(id=>!triage.triageABPublicWhere().includes(id)));
 const layout=readFileSync('src/app/layout.tsx','utf8');
 assert.match(layout,/const ready=false;/,'all other routes default to noindex');
 const story=readFileSync('src/app/blog/[slug]/page.tsx','utf8');
 assert.match(story,/u\.is_visible|findPublishedBlog/);
 console.log('PASS: canonical SEO indexing, exactly 3 restaurants, approved blog URLs, safe fallback');
}finally{
 const restore=(name,value)=>value===undefined?delete process.env[name]:process.env[name]=value;
 restore('WHATEATO_SEO_PUBLIC_ENABLED',old.seo);
 restore('NEXT_PUBLIC_SITE_URL',old.origin);
 restore('NEXT_PUBLIC_LAUNCH_READY',old.launch);
}
