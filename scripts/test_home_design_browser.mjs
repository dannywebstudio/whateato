#!/usr/bin/env node
// Owner-approved WhatEatO geo locale and branded search UX regression.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const db=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(db.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
const root='http://127.0.0.1:3000',out='home-design-browser-qa';
await mkdir(out,{recursive:true});
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
   assert.equal(await page.locator('[data-card-layout="map"]').count(),1);
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
