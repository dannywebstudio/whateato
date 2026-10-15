#!/usr/bin/env node
// Owner-approved WhatEatO geo locale and branded search UX regression.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
import {chromium} from 'playwright';
const db=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(db.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
const root='http://127.0.0.1:3000',out='home-design-browser-qa';
await mkdir(out,{recursive:true});
// Assert the shared UI wiring even if the ephemeral CI catalog lacks
// legacy enrichment tables and returns the expected unavailable notice.
const searchSource=readFileSync('src/app/search/page.tsx','utf8');
const cardSource=readFileSync('src/components/RestaurantExperienceCard.tsx','utf8');
assert.match(searchSource,/data-card-layout="map"/);
assert.match(searchSource,/variant="map"/);
assert.match(searchSource,/mapHref=\{mapHref\}/);
assert.match(cardSource,/we-card-['"]\+variant/);
assert.match(searchSource,/new URLSearchParams\(\{focus:r.id,hl:locale\}\)/);
assert.match(searchSource,/data-search-pagination/);
assert.doesNotMatch(searchSource,/href=\{'\/map\?'\+toMap/);
const relatedSource=readFileSync('src/components/RelatedSearchPosts.tsx','utf8');
assert.match(relatedSource,/if\(posts.length===0\)return null/);
assert.match(relatedSource,/data-related-blog-grid/);
assert.match(relatedSource,/BlogStoryCard key=\{post.id\}/);
const blogPageSource=readFileSync('src/app/blog/page.tsx','utf8');
assert.match(blogPageSource,/BlogStoryCard key=\{item.id\}/);
const sharedBlogCard=readFileSync('src/components/BlogStoryCard.tsx','utf8');
assert.match(sharedBlogCard,/styles.cardImage/);
assert.match(sharedBlogCard,/styles.cardText/);
assert.match(sharedBlogCard,/styles.date/);
assert.match(sharedBlogCard,/\/api\/blog\/images\//);
assert.match(sharedBlogCard,/cover_image_id/);
const focusApiSource=readFileSync('src/app/api/v1/map/focus/route.ts','utf8');
assert.match(focusApiSource,/items:\[selected,\.\.\.nearby.slice\(0,3\)\]/);
const browser=await chromium.launch({headless:true});
async function mockCountry(page,country){
 await page.route('**/api/visitor-country',route=>route.fulfill({
  status:200,contentType:'application/json',
  headers:{'cache-control':'no-store'},
  body:JSON.stringify({country,source:'edge'})
 }));
}
try{
 // Verify server edge geolocation is preferred and not dependent on browser language.
 const geo=await fetch(root+'/api/visitor-country',{headers:{'cf-ipcountry':'JP'}});
 assert.equal(geo.status,200);
 assert.equal((await geo.json()).country,'JP');
 for(const vp of [
  {name:'desktop',width:1440,height:900},
  {name:'mobile',width:390,height:844},
  {name:'small-mobile',width:360,height:740}]){
  const context=await browser.newContext({
   viewport:{width:vp.width,height:vp.height},
   locale:'en-US',timezoneId:'America/New_York',
   reducedMotion:'no-preference'
  });
  const page=await context.newPage();
  await mockCountry(page,'KR');
  await page.goto(root+'/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'데이트'}).waitFor();
  assert.equal((await page.locator('header .brand-logo').textContent())?.trim(),'WhatEatO');
  assert.equal((await page.locator('main h1').textContent())?.trim(),'WhatEatO');
  assert.equal(await page.locator('.brand-signature .brand-w').first().textContent(),'W');
  assert.equal(await page.locator('#country').inputValue(),'KR');
  assert.equal(await page.locator('#language').inputValue(),'ko');
  assert.equal(await page.locator('html').getAttribute('lang'),'ko');
  assert.equal(await page.locator('main .hero > p').textContent(),
   '한국에서 마음에 드는 맛집을 찾아보세요.');
  const taglineStyle=await page.locator('main .hero > p').evaluate(el=>({
   weight:Number(getComputedStyle(el).fontWeight),
   size:parseFloat(getComputedStyle(el).fontSize),
   color:getComputedStyle(el).color
  }));
  assert.ok(taglineStyle.weight>=700&&taglineStyle.size>=16,
   'Homepage tagline too faint or small: '+JSON.stringify(taglineStyle));
  assert.equal(taglineStyle.color,'rgb(41, 74, 58)');
  assert.equal(await page.locator('.country-flag img').getAttribute('src'),
   'https://flagcdn.com/w40/kr.png');
  assert.deepEqual(await page.locator('#language option').evaluateAll(v=>v.map(x=>x.value)),
   ['ko','en','ja','zh-CN']);
  assert.equal(await page.locator('main .searchfield svg.search-icon').count(),1);
  assert.equal(await page.locator('main .chip').count(),12);
  const width=await page.evaluate(()=>({
   viewport:document.documentElement.clientWidth,
   actual:document.documentElement.scrollWidth}));
  assert.ok(width.actual<=width.viewport+2,
   vp.name+' overflow '+JSON.stringify(width));
  await page.screenshot({path:out+'/'+vp.name+'-ko-home.png',fullPage:true});
  // Owner-approved Header order: Map, Blog, Contact, Login; Contact keeps its original destination.
  const navNames=await page.locator('.navlinks a').allTextContents();
  assert.deepEqual(navNames.map(v=>v.trim()),['지도','블로그','Contact','Login']);
  const positions=await page.locator('.navlinks a').evaluateAll(nodes=>
   nodes.map(el=>{const r=el.getBoundingClientRect();return {center:r.top+r.height/2,height:r.height}}));
  assert.ok(positions.every(p=>Math.abs(p.center-positions[1].center)<=1),
   vp.name+' nav links not vertically aligned: '+JSON.stringify(positions));
  assert.ok(positions.slice(0,3).every(p=>p.height===positions[1].height));
  const contact=await context.newPage();
  await mockCountry(contact,'KR');
  await contact.goto(root+'/contact?hl=ko',{waitUntil:'networkidle'});
  await contact.locator('#country').waitFor();
  assert.equal(await contact.locator('.navlinks a[href^="/contact"]').textContent(),'Contact');
  assert.equal(await contact.locator('.navlinks a[href^="/contact"]').getAttribute('href'),'/contact?hl=ko');
  assert.equal(await contact.locator('main h1').textContent(),'Contact');
  assert.equal(await contact.getByText('이메일 보내기').count(),0);
  assert.equal(await contact.locator('main button').count(),0);
  assert.equal(await contact.locator('main [class*="panel"]').count(),0);
  assert.equal(await contact.locator('main a[href="mailto:pakrsky2@naver.com"]').count(),1);
  assert.ok((await contact.locator('main').innerText()).includes('광고, 장소 등록&수정 요청 :'));
  assert.ok((await contact.locator('main').innerText()).includes('pakrsky2@naver.com'));
  const contactWidth=await contact.evaluate(()=>({
   viewport:document.documentElement.clientWidth,actual:document.documentElement.scrollWidth
  }));
  assert.ok(contactWidth.actual<=contactWidth.viewport+2,
   vp.name+' contact overflow '+JSON.stringify(contactWidth));
  await contact.screenshot({path:out+'/'+vp.name+'-ko-contact.png',fullPage:true});
  if(vp.name==='desktop'){
   await contact.locator('#country').selectOption('JP');
   await contact.waitForURL(u=>u.pathname==='/contact'&&u.searchParams.get('hl')==='ja');
   assert.ok((await contact.locator('main').innerText()).includes('広告、店舗の登録・情報修正'));
   assert.equal(await contact.locator('main a[href="mailto:pakrsky2@naver.com"]').count(),1);
   await contact.locator('#country').selectOption('CN');
   await contact.waitForURL(u=>u.pathname==='/contact'&&u.searchParams.get('hl')==='zh-CN');
   assert.ok((await contact.locator('main').innerText()).includes('广告合作'));
   await contact.locator('#country').selectOption('GB');
   await contact.waitForURL(u=>u.pathname==='/contact'&&u.searchParams.get('hl')==='en');
   assert.ok((await contact.locator('main').innerText()).includes('advertising'));
  }
  await contact.close();
  // Related stories use the canonical same Blog card in all screen sizes.
  const storySearch=await context.newPage();
  await mockCountry(storySearch,'KR');
  await storySearch.goto(root+'/search?q=%EC%84%9C%EC%9A%B8&hl=ko',
    {waitUntil:'domcontentloaded'});
  const storyCards=storySearch.locator('[data-related-blog-grid] > a');
  if(await storyCards.count()){
   assert.equal(await storySearch.locator('[data-search-blog] [data-related-blog-grid]').count(),1);
   assert.equal(await storyCards.first().locator('h3').count(),1);
   assert.equal(await storyCards.first().locator('small').count(),1);
   assert.equal(await storyCards.first().locator('img, span[aria-hidden="true"]').count(),1);
   assert.equal(await storyCards.first().locator('span[class*="date"]').count(),1);
   const storyImageWidth=await storyCards.first().locator('div[class*="cardImage"]')
    .evaluate(el=>getComputedStyle(el).aspectRatio);
   assert.equal(storyImageWidth,'1.55');
  }else{
   assert.equal(await storySearch.locator('[data-search-blog]').count(),0,
    'Do not show Related Blog section without actual matches');
  }
  const storyPageWidth=await storySearch.evaluate(()=>({
    viewport:document.documentElement.clientWidth,
    actual:document.documentElement.scrollWidth
  }));
  assert.ok(storyPageWidth.actual<=storyPageWidth.viewport+2,
   vp.name+' related blog overflow '+JSON.stringify(storyPageWidth));
  await storySearch.screenshot({path:out+'/'+vp.name+'-search-blog-grid.png',fullPage:true});
  await storySearch.close();
  if(vp.name==='desktop'){
   const chip=page.locator('main .chip').first();
   const style=await chip.evaluate(el=>({
    shadow:getComputedStyle(el).boxShadow,bg:getComputedStyle(el).backgroundColor
   }));
   await chip.hover();await page.waitForTimeout(300);
   const elevated=await chip.evaluate(el=>({
    shadow:getComputedStyle(el).boxShadow,
    bg:getComputedStyle(el).backgroundColor,transform:getComputedStyle(el).transform}));
   assert.notEqual(elevated.shadow,style.shadow);
   assert.notEqual(elevated.bg,style.bg);
   assert.notEqual(elevated.transform,'none');
   await page.screenshot({path:out+'/desktop-filter-hover.png',fullPage:true});
   await chip.click();assert.equal(await chip.getAttribute('aria-pressed'),'true');
   await chip.click();assert.equal(await chip.getAttribute('aria-pressed'),'false');
   await page.locator('#country').selectOption('JP');
   await page.getByRole('button',{name:'デート'}).waitFor();
   assert.equal(await page.locator('#language').inputValue(),'ja');
   assert.equal(await page.locator('html').getAttribute('lang'),'ja');
   assert.equal(await page.locator('main .hero > p').textContent(),
    '韓国でお気に入りのグルメスポットを見つけよう。');
   assert.equal(await page.locator('.country-flag img').getAttribute('src'),
    'https://flagcdn.com/w40/jp.png');
   await page.locator('#country').selectOption('CN');
   await page.getByRole('button',{name:'约会'}).waitFor();
   assert.equal(await page.locator('#language').inputValue(),'zh-CN');
   await page.locator('#country').selectOption('GB');
   await page.getByRole('button',{name:'Date night'}).waitFor();
   assert.equal(await page.locator('#language').inputValue(),'en');
   assert.equal(await page.locator('html').getAttribute('lang'),'en-US');
   await page.locator('#country').selectOption('KR');
   await page.getByRole('button',{name:'데이트'}).waitFor();
   assert.equal(await page.locator('#language').inputValue(),'ko');
   // A visitor can explicitly select a different language while remaining in Korea.
   await page.locator('#language').selectOption('en');
   await page.getByRole('button',{name:'Date night'}).waitFor();
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#country').inputValue(),'KR');
   assert.equal(await page.locator('#language').inputValue(),'en');
   // Changing the country resets an older manual language choice.
   await page.locator('#country').selectOption('JP');
   await page.getByRole('button',{name:'デート'}).waitFor();
   await page.reload({waitUntil:'networkidle'});
   assert.equal(await page.locator('#country').inputValue(),'JP');
   assert.equal(await page.locator('#language').inputValue(),'ja');
   await page.locator('#country').selectOption('KR');
   await page.getByRole('button',{name:'데이트'}).waitFor();
   await page.locator('.searchfield input').fill('홍대');
   await page.locator('.searchfield button').click();
   await page.waitForURL(u=>u.pathname==='/search'&&
     u.searchParams.get('q')==='홍대'&&u.searchParams.get('hl')==='ko');
   assert.equal(await page.locator('#country').inputValue(),'KR');
   assert.equal(await page.locator('#language').inputValue(),'ko');
   // Search results and Map MUST use one identical restaurant card component.
   const cardGridCount=await page.locator('[data-card-layout="map"]').count();
   assert.ok(cardGridCount===0||cardGridCount===1);
   if(cardGridCount===0){
    assert.equal(await page.getByText('식당 데이터베이스 연결을 확인하고 있습니다.').count(),1,
     'Map-card grid must render whenever the catalog is available');
   }
   const searchCards=page.locator('[data-card-layout="map"] .we-card.we-card-map');
   assert.equal(await page.locator('.search-results-page .we-card-search').count(),0);
   if(await searchCards.count()){
    assert.equal(await searchCards.count(),await page.locator('[data-card-layout="map"] .we-card-visual').count());
    assert.equal(await searchCards.first().locator('.we-card-head h3 a').count(),1);
    assert.equal(await searchCards.first().locator('.we-card-visit').count(),1);
    assert.equal(await searchCards.first().locator('.we-map-button').count(),1);
    const leftEdge=await searchCards.first().evaluate(el=>getComputedStyle(el).borderLeftWidth);
    assert.equal(leftEdge,'5px');
   }
   const gridWidths=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,actual:document.documentElement.scrollWidth}));
   assert.ok(gridWidths.actual<=gridWidths.viewport+2,'Search map-card overflow '+JSON.stringify(gridWidths));
   await page.screenshot({path:out+'/'+vp.name+'-search-map-cards.png',fullPage:true});
  }
  await context.close();
 }
 // A clicked Search card opens exact-UUID focus with 4 cards, target first.
 const focusId='11111111-1111-4111-8111-111111111111';
 const chosen=[
  {id:focusId,name:'선택된 식당',latitude:37.571,longitude:126.982},
  {id:'22222222-2222-4222-8222-222222222222',name:'근처 식당 A',latitude:37.5711,longitude:126.9822},
  {id:'33333333-3333-4333-8333-333333333333',name:'근처 식당 B',latitude:37.572,longitude:126.981},
  {id:'44444444-4444-4444-8444-444444444444',name:'근처 식당 C',latitude:37.573,longitude:126.98}
 ].map(x=>({...x,name_ko:x.name,address:'서울',address_ko:'서울',short_description:null,
  main_menu:null,editorial_score:null,category_code:'한식',region_sigungu:'중구',tags:[],
  opening_hours:null}));
 const focused=await browser.newContext({locale:'ko-KR',viewport:{width:390,height:844}});
 const focusedPage=await focused.newPage();
 await mockCountry(focusedPage,'KR');
 await focusedPage.route('**/api/v1/map/focus?*',route=>{
  const requested=new URL(route.request().url()).searchParams.get('id');
  assert.equal(requested,focusId);
  return route.fulfill({status:200,contentType:'application/json',
   body:JSON.stringify({focus_id:focusId,center:[126.982,37.571],items:chosen,limit:4})});
 });
 await focusedPage.goto(root+'/map?focus='+focusId+'&hl=ko',{waitUntil:'domcontentloaded'});
 await focusedPage.locator('.map-explore-cards .we-card-map').first().waitFor({timeout:20000});
 assert.equal(await focusedPage.locator('.map-explore-cards .we-card-map').count(),4);
 assert.equal(await focusedPage.locator('.map-explore-cards .we-card-map').first().locator('h3').textContent(),'선택된 식당');
 assert.equal(await focusedPage.locator('.map-explore-pagination span').textContent(),'1 / 1');
 assert.equal(await focusedPage.locator('.map-explore-cards .we-card-map h3').last().textContent(),'근처 식당 C');
 await focusedPage.screenshot({path:out+'/mobile-focused-four-map-cards.png',fullPage:true});
 await focused.close();
 // Locale in a Google/shared direct URL must not be silently overwritten by IP.
 const seo=await browser.newContext({locale:'en-US',timezoneId:'America/New_York'});
 const seoPage=await seo.newPage();await mockCountry(seoPage,'JP');
 await seoPage.goto(root+'/blog?hl=en',{waitUntil:'networkidle'});
 assert.equal(await seoPage.locator('#country').inputValue(),'JP');
 assert.equal(await seoPage.locator('#language').inputValue(),'en');
 assert.ok(seoPage.url().includes('hl=en'));
 // But a manual country change should override a previously shared locale URL.
 await seoPage.locator('#country').selectOption('CN');
 await seoPage.waitForURL(u=>u.pathname==='/blog'&&u.searchParams.get('hl')==='zh-CN');
 assert.equal(await seoPage.locator('#language').inputValue(),'zh-CN');
 await seo.close();
 // Unknown countries still get English and a matching, dynamic country flag.
 const unknown=await browser.newContext({locale:'en-US'});
 const unknownPage=await unknown.newPage();await mockCountry(unknownPage,'NZ');
 await unknownPage.goto(root+'/',{waitUntil:'networkidle'});
 assert.equal(await unknownPage.locator('#country').inputValue(),'NZ');
 assert.equal(await unknownPage.locator('#language').inputValue(),'en');
 assert.equal(await unknownPage.locator('.country-flag img').getAttribute('src'),
  'https://flagcdn.com/w40/nz.png');
 await unknown.close();
 const reduced=await browser.newContext({reducedMotion:'reduce'});
 const reducedPage=await reduced.newPage();await mockCountry(reducedPage,'US');
 await reducedPage.goto(root+'/',{waitUntil:'networkidle'});
 const duration=await reducedPage.locator('.chip').first()
  .evaluate(el=>getComputedStyle(el).transitionDuration);
 assert.ok(duration.split(',').every(v=>v.trim()==='0s'));
 await reduced.close();
 console.log('PASS: edge geo KR/JP/CN/NZ, manual country-language, flags, logos, international English, SEO deep link, search, chips, reduced motion, 1440/390/360');
}finally{await browser.close()}
