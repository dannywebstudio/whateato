#!/usr/bin/env node
// Local synthetic PostgreSQL + real Next HTTP only. Never write to Neon staging/production.
import assert from 'node:assert/strict';
import {encode} from 'next-auth/jwt';
import pg from 'pg';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const url=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
const base='http://127.0.0.1:3000';
async function signed(sub){
 const t=await encode({token:{sub},secret:process.env.AUTH_SECRET,
   salt:'authjs.session-token',maxAge:3600});
 return {'Cookie':'authjs.session-token='+t,'Origin':base,'Content-Type':'application/json'};
}
const owner=await signed('cccccccc-cccc-4ccc-8ccc-ccccccccccc3');
const editor=await signed('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2');
const moderator=await signed('dddddddd-dddd-4ddd-8ddd-ddddddddddd4');
async function request(path,{method='GET',headers=owner,body}={}){
 const r=await fetch(base+path,{method,headers,redirect:'manual',
   ...(body===undefined?{}:{body:JSON.stringify(body)})});
 const json=await r.json().catch(()=>({}));
 return {status:r.status,body:json};
}
assert.equal((await request('/api/v1/owner/blog',{headers:{}})).status,403);
assert.equal((await request('/api/v1/owner/blog',{headers:moderator})).status,403);
const publicCategories=await request('/api/blog/categories',{headers:{}});
assert.equal(publicCategories.status,200);
assert.deepEqual(publicCategories.body.items.filter(x=>!x.parent_slug).map(x=>x.slug),
 ['restaurants','travel','k-beauty']);
const children=publicCategories.body.items.filter(x=>x.parent_slug==='travel');
assert.deepEqual(children.map(x=>x.slug),
 ['transportation','festivals','shopping-picks','local-attractions']);
assert.deepEqual(publicCategories.body.items.filter(x=>x.parent_slug==='k-beauty').map(x=>x.slug),
 ['olive-young','daiso','plastic-surgery-reviews','perfume']);
assert.equal((await request('/api/v1/owner/blog/categories',{headers:{}})).status,403);
assert.equal((await request('/api/v1/owner/blog/categories',{headers:moderator})).status,403);
const newCat={slug:'korean-snacks',parent_slug:'restaurants',
 names:{en:'Korean Snacks',ko:'한국 과자',ja:'韓国お菓子'},position:50};
assert.equal((await request('/api/v1/owner/blog/categories',{
 method:'POST',headers:editor,body:newCat})).status,403);
assert.equal((await request('/api/v1/owner/blog/categories',{
 method:'POST',headers:{...owner,Origin:'https://evil.invalid'},body:newCat})).status,403);
const createdCategory=await request('/api/v1/owner/blog/categories',{method:'POST',body:newCat});
assert.equal(createdCategory.status,201,JSON.stringify(createdCategory.body));
assert.equal((await request('/api/v1/owner/blog/categories',{method:'POST',body:newCat})).status,409);
const changedCategory=await request('/api/v1/owner/blog/categories/korean-snacks',{
 method:'PATCH',body:{names:{en:'Korean Snack Guide',ko:'한국 간식'},position:15}});
assert.equal(changedCategory.status,200,JSON.stringify(changedCategory.body));
const inactive=await request('/api/v1/owner/blog/categories/korean-snacks',{
 method:'PATCH',body:{is_active:false}});
assert.equal(inactive.status,200);
const absentPublic=await request('/api/blog/categories',{headers:{}});
assert.equal(absentPublic.body.items.some(x=>x.slug==='korean-snacks'),false);
const cannotNestThird=await request('/api/v1/owner/blog/categories',{
 method:'POST',body:{slug:'third-level',parent_slug:'transportation',
 names:{en:'Third Level',ko:'3단계'},position:11}});
assert.equal(cannotNestThird.status,409,'Only root and one nested level are supported');
const temporary=await request('/api/v1/owner/blog',{method:'POST',
 body:{slug:'hidden-category-should-fail'}});
assert.equal(temporary.status,201);
const invalidSelection=await request('/api/v1/owner/blog/'+temporary.body.id,{
 method:'PUT',body:{expected_revision:1,draft:{
  category:'korean-snacks',tags:[],related_restaurant_ids:[],
  translations:{en:{title:'',excerpt:'',seo_title:'',seo_description:'',blocks:[]}}
 }}});
assert.equal(invalidSelection.status,409,'Archived category cannot be assigned to a new draft');
const restored=await request('/api/v1/owner/blog/categories/korean-snacks',{
 method:'PATCH',body:{is_active:true}});
assert.equal(restored.status,200);
const extension=await request('/api/v1/owner/blog/categories',{method:'POST',body:{
 slug:'wellness',parent_slug:null,
 names:{en:'Wellness',ko:'웰니스'},position:80
}});
assert.equal(extension.status,201);
const extensionChild=await request('/api/v1/owner/blog/categories',{method:'POST',body:{
 slug:'wellness-travel',parent_slug:'wellness',
 names:{en:'Wellness Travel',ko:'웰니스 여행'},position:10
}});
assert.equal(extensionChild.status,201);
assert.equal((await request('/api/v1/owner/blog/categories/wellness',{
 method:'PATCH',body:{is_active:false}})).status,409,
 'Parent with active children must not be disabled');
assert.equal((await request('/api/v1/owner/blog/categories/wellness',{
 method:'PATCH',body:{parent_slug:'travel'}})).status,409,
 'Root with children must not become a child');

assert.equal((await request('/api/v1/owner/blog',{method:'POST',
 headers:{...owner,Origin:'https://evil.invalid'},body:{slug:'new-restaurant-guide'}})).status,403);
const created=await request('/api/v1/owner/blog',{method:'POST',headers:editor,
 body:{slug:'what-to-eat-in-seoul-ci'}});
assert.equal(created.status,201,JSON.stringify(created.body));
const id=created.body.id;
const dupe=await request('/api/v1/owner/blog',{method:'POST',body:{slug:'what-to-eat-in-seoul-ci'}});
assert.equal(dupe.status,409);
const prefix='/api/v1/owner/blog/'+id;
const detail=await request(prefix);
assert.equal(detail.status,200,JSON.stringify(detail.body));
assert.equal(detail.body.article.revision,1);
const notYetPublic=await fetch(base+'/blog/what-to-eat-in-seoul-ci?hl=en',{redirect:'manual'});
assert.equal(notYetPublic.status,404,'Draft articles must not leak');
const blocks=[
 {id:'introduction',type:'heading',level:2,text:'Best authentic dining experiences in Seoul'},
 {id:'text',type:'paragraph',text:'Explore unique Korean dining spots with verified street addresses, real local cooking and seasonal menus. '.repeat(5)},
 {id:'places',type:'list',items:['Research each restaurant','Check the real opening hours','Enjoy responsibly']},
 {id:'comparison',type:'table',rows:[['Situation','Recommendation'],['Solo meal','Look for local cafes']]}
];
const draft={category:'transportation',tags:['korean-food','seoul'],
 related_restaurant_ids:['11111111-1111-4111-8111-111111111111'],
 translations:{en:{title:'Where should you eat when visiting Seoul?',
   excerpt:'A thoughtful guide to discovering Korean food and local restaurants in the neighborhoods of Seoul.',
   seo_title:'Where to Eat in Seoul — WhatEatO',seo_description:'A practical dining guide for Seoul travelers.',
   blocks}}};
assert.equal((await request(prefix,{method:'PUT',headers:moderator,
 body:{draft,expected_revision:1}})).status,403);
assert.equal((await request(prefix,{method:'PUT',
 body:{draft,expected_revision:123}})).status,409);
const saved=await request(prefix,{method:'PUT',headers:editor,
 body:{draft,expected_revision:1}});
assert.equal(saved.status,200,JSON.stringify(saved.body));
assert.equal(saved.body.revision,2);
const forbiddenPublish=await request(prefix+'/actions',{method:'POST',headers:editor,
 body:{action:'publish',expected_revision:2}});
assert.equal(forbiddenPublish.status,403);
const beforeSubmit=await request(prefix+'/actions',{method:'POST',
 body:{action:'publish',expected_revision:2}});
assert.equal(beforeSubmit.status,409);
const submitted=await request(prefix+'/actions',{method:'POST',headers:editor,
 body:{action:'submit',expected_revision:2}});
assert.equal(submitted.status,200,JSON.stringify(submitted.body));
const published=await request(prefix+'/actions',{method:'POST',
 body:{action:'publish',expected_revision:2}});
assert.equal(published.status,200,JSON.stringify(published.body));
const page=await fetch(base+'/blog/what-to-eat-in-seoul-ci?hl=en');
assert.equal(page.status,200);
const html=await page.text();
assert.ok(html.includes('Where should you eat when visiting Seoul?'));
assert.ok(html.includes('Research each restaurant'));
assert.ok(html.includes('WhatEatO'));
const results=await fetch(base+'/blog?q=neighborhoods');
assert.equal(results.status,200);
assert.ok((await results.text()).includes('Where should you eat when visiting Seoul?'));
const travelRoot=await fetch(base+'/blog?category=travel');
assert.equal(travelRoot.status,200);
assert.ok((await travelRoot.text()).includes('Where should you eat when visiting Seoul?'));
const transportChild=await fetch(base+'/blog?category=transportation');
assert.ok((await transportChild.text()).includes('Where should you eat when visiting Seoul?'));
const beautyRoot=await fetch(base+'/blog?category=k-beauty');
assert.ok(!(await beautyRoot.text()).includes('Where should you eat when visiting Seoul?'));
const koreanTravelView=await fetch(base+'/blog?hl=ko&category=travel');
const koreanTravelPage=await koreanTravelView.text();
assert.ok(koreanTravelPage.includes('교통 정보')&&koreanTravelPage.includes('축제 정보'),
  'Travel-only left sidebar renders localized travel subcategories');
const koreanBeautyView=await fetch(base+'/blog?hl=ko&category=k-beauty');
assert.ok((await koreanBeautyView.text()).includes('성형외과 후기'),
  'K-Beauty-only left sidebar renders localized beauty subcategories');

await mkdir('blog-browser-qa',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const vp of [{name:'desktop',width:1440,height:900},
   {name:'mobile',width:390,height:844},{name:'small-mobile',width:360,height:740}]){
  const ctx=await browser.newContext({viewport:{width:vp.width,height:vp.height}});
  const page=await ctx.newPage();
  await page.goto(base+'/blog?hl=en',{waitUntil:'domcontentloaded'});
  assert.equal(await page.getByText('Where should you eat when visiting Seoul?',{exact:true}).count(),1);
  assert.equal(await page.locator('main > header').count(),0,'Blog Hero must be absent');
  const search=page.locator('main form.search-form .searchfield');
  assert.equal(await search.count(),1,'Blog must reuse Map search-field markup');
  assert.equal(await search.locator('button').textContent(),'→');
  const rootNav=page.getByRole('navigation',{name:'Blog main categories'});
  const names=await rootNav.locator('a').allTextContents();
  assert.deepEqual(names.slice(0,4),['All Stories','Restaurants','Travel','K-Beauty Items']);
  const tabY=await rootNav.locator('a').evaluateAll(links=>
    links.slice(0,4).map(a=>Math.round(a.getBoundingClientRect().top)));
  assert.ok(tabY.every(y=>y===tabY[0]),'All root tabs must be on a single row');
  await page.screenshot({path:'blog-browser-qa/'+vp.name+'-index.png',fullPage:true});
  await rootNav.getByRole('link',{name:'Travel',exact:true}).click();
  const sidebar=page.getByRole('complementary');
  const travelNav=sidebar.getByRole('navigation',{name:'Travel subcategories'});
  await travelNav.waitFor({state:'visible'});
  const items=travelNav.locator('a');
  assert.deepEqual(await items.allTextContents(),
    ['All Travel','Transportation','Festivals & Events','Shopping Recommendations','Local Attractions']);
  const sidebarPositions=await items.evaluateAll(links=>
    links.map(a=>({x:Math.round(a.getBoundingClientRect().left),
      y:Math.round(a.getBoundingClientRect().top)})));
  assert.ok(sidebarPositions.every((b,i)=>i===0||
    (b.x===sidebarPositions[0].x && b.y>sidebarPositions[i-1].y)),
    'Subcategories must form a vertical left-hand column');
  const box=await sidebar.boundingBox();
  const contentBox=await page.getByRole('heading',{name:'Travel',exact:true}).last().boundingBox();
  assert.ok(box&&contentBox&&box.x+box.width<=contentBox.x+5,
    'Vertical subcategories must be to the left of story content');
  await page.screenshot({path:'blog-browser-qa/'+vp.name+'-travel-sidebar.png',fullPage:true});
  await sidebar.getByRole('link',{name:'Transportation',exact:true}).click();
  await page.getByRole('navigation',{name:'Transportation subcategories'}).waitFor({state:'hidden'}).catch(()=>{});
  await page.getByRole('complementary').locator('a[data-active=true]').waitFor({state:'visible'});
  assert.equal(await page.getByRole('complementary').locator('a[data-active=true]').textContent(),
    'Transportation');
  await page.getByRole('navigation',{name:'Blog main categories'})
    .getByRole('link',{name:'K-Beauty Items'}).click();
  const beautyNav=page.getByRole('navigation',{name:'K-Beauty Items subcategories'});
  await beautyNav.waitFor({state:'visible'});
  assert.equal(await beautyNav.locator('a').count(),5);
  await page.screenshot({path:'blog-browser-qa/'+vp.name+'-beauty-sidebar.png',fullPage:true});

  await page.goto(base+'/blog/what-to-eat-in-seoul-ci?hl=en',{waitUntil:'domcontentloaded'});
  assert.ok((await page.locator('main h1').textContent()).includes('Where should you eat'));
  assert.equal(await page.locator('main table').count(),1);
  const dims=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,
    content:document.documentElement.scrollWidth}));
  assert.ok(dims.content<=dims.viewport+2,
    vp.name+' blog has horizontal overflow '+JSON.stringify(dims));
  await page.screenshot({path:'blog-browser-qa/'+vp.name+'-article.png',fullPage:true});
  await ctx.close();
 }
}finally{await browser.close()}
const newer={...draft,translations:{en:{...draft.translations.en,
 title:'A completely different unpublished revision'}}};
const changed=await request(prefix,{method:'PUT',
 body:{draft:newer,expected_revision:2}});
assert.equal(changed.status,200);
assert.equal(changed.body.revision,3);
const stillPublic=await (await fetch(base+'/blog/what-to-eat-in-seoul-ci')).text();
assert.ok(stillPublic.includes('Where should you eat when visiting Seoul?'));
assert.ok(!stillPublic.includes('A completely different unpublished revision'));
const submittedAgain=await request(prefix+'/actions',{method:'POST',
 body:{action:'submit',expected_revision:3}});
assert.equal(submittedAgain.status,200);
const republish=await request(prefix+'/actions',{method:'POST',
 body:{action:'publish',expected_revision:3}});
assert.equal(republish.status,200);
const changedPublic=await (await fetch(base+'/blog/what-to-eat-in-seoul-ci')).text();
assert.ok(changedPublic.includes('A completely different unpublished revision'));
const unpub=await request(prefix+'/actions',{method:'POST',
 body:{action:'unpublish',expected_revision:3}});
assert.equal(unpub.status,200);
assert.equal((await fetch(base+'/blog/what-to-eat-in-seoul-ci')).status,404);
assert.equal((await request('/api/blog/images/22222222-2222-4222-8222-222222222222',
 {headers:{}})).status,404);
const db=new pg.Client({connectionString:process.env.DATABASE_URL});
await db.connect();
try{
 const audit=await db.query('SELECT action FROM whateato_blog_audit WHERE post_id=$1 ORDER BY id',[id]);
 assert.ok(audit.rows.some(x=>x.action==='published'));
 assert.ok(audit.rows.some(x=>x.action==='unpublished'));
 const publication=await db.query('SELECT is_visible,revision FROM whateato_blog_publications WHERE post_id=$1',[id]);
 assert.equal(publication.rows[0].is_visible,false);
 assert.equal(publication.rows[0].revision,3);
}finally{await db.end()}
console.log('PASS: blog Chromium 1440/390/360 responsive listings and article QA');
console.log('PASS: blog RBAC, no draft leak, review/publish, SEO page, full-text search, immutable public snapshot, republish and unpublish');
