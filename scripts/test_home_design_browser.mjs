#!/usr/bin/env node
// WhatEatO owner-approved Header/Search visual design regression.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const db=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(db.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
const root='http://127.0.0.1:3000', out='home-design-browser-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const vp of [{name:'desktop',width:1440,height:900},
  {name:'mobile',width:390,height:844},
  {name:'small-mobile',width:360,height:740}]){
  const context=await browser.newContext({
   viewport:{width:vp.width,height:vp.height},
   locale:'en-US',reducedMotion:'no-preference'
  });
  await context.addInitScript(()=>{
   localStorage.setItem('we_country','KR');
   localStorage.setItem('we_language','en');
  });
  const page=await context.newPage();
  await page.goto(root+'/',{waitUntil:'networkidle'});
  await page.locator('header .brand-logo').waitFor();
  assert.equal((await page.locator('header .brand-logo').textContent())?.trim(),'WhatEatO');
  assert.equal(await page.locator('#country').inputValue(),'KR');
  assert.equal(await page.locator('#language').inputValue(),'en');
  assert.deepEqual(await page.locator('#language option').evaluateAll(xs=>xs.map(x=>x.value)),
   ['ko','en','ja','zh-CN']);
  assert.equal(await page.locator('.country-flag img').getAttribute('src'),
   'https://flagcdn.com/w40/kr.png');
  assert.equal(await page.locator('header .country-flag').count(),1);
  assert.equal(await page.locator('main .searchfield svg.search-icon').count(),1);
  assert.equal(await page.locator('main .chip').count(),12);
  const overflow=await page.evaluate(()=>({
   width:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth
  }));
  assert.ok(overflow.scrollWidth<=overflow.width+2,
   'No horizontal viewport overflow '+vp.name+JSON.stringify(overflow));
  await page.screenshot({path:out+'/'+vp.name+'-home.png',fullPage:true});
  if(vp.name==='desktop'){
   const chip=page.locator('main .chip').first();
   assert.equal(await chip.getAttribute('aria-pressed'),'false');
   const before=await chip.evaluate(el=>({
    shadow:getComputedStyle(el).boxShadow,color:getComputedStyle(el).color,
    bg:getComputedStyle(el).backgroundColor
   }));
   await chip.hover();
   await page.waitForTimeout(300);
   const after=await chip.evaluate(el=>({
    shadow:getComputedStyle(el).boxShadow,color:getComputedStyle(el).color,
    bg:getComputedStyle(el).backgroundColor,
    transform:getComputedStyle(el).transform
   }));
   assert.notEqual(after.bg,before.bg,'Hover must visibly change chip background');
   assert.notEqual(after.shadow,before.shadow,'Hover must raise chip shadow');
   assert.notEqual(after.transform,'none','Hover must animate chip lift');
   await page.screenshot({path:out+'/desktop-filter-hover.png',fullPage:true});
   await chip.click();
   assert.equal(await chip.getAttribute('aria-pressed'),'true');
   assert.match(await chip.getAttribute('class')||'',/active/);
   await page.screenshot({path:out+'/desktop-filter-active.png',fullPage:true});
   await chip.click();
   assert.equal(await chip.getAttribute('aria-pressed'),'false');
   await page.locator('#country').selectOption('JP');
   assert.equal(await page.locator('.country-flag img').getAttribute('src'),
     'https://flagcdn.com/w40/jp.png');
   await page.locator('#language').selectOption('ja');
   await page.getByRole('button',{name:'デート'}).waitFor({state:'visible'});
   await page.locator('#language').selectOption('zh-CN');
   await page.getByRole('button',{name:'约会'}).waitFor({state:'visible'});
   await page.locator('#language').selectOption('ko');
   await page.getByRole('button',{name:'데이트'}).waitFor({state:'visible'});
   await page.locator('.searchfield input').fill('홍대');
   await page.locator('.searchfield button').click();
   await page.waitForURL(u=>u.pathname==='/search'&&u.searchParams.get('q')==='홍대'&&
     u.searchParams.get('hl')==='ko');
   assert.equal(await page.locator('#language').inputValue(),'ko',
     'Chosen language persists on navigation');
  }
  await context.close();
 }
 const reduced=await browser.newContext({reducedMotion:'reduce'});
 const reducedPage=await reduced.newPage();
 await reducedPage.goto(root+'/',{waitUntil:'domcontentloaded'});
 const transitions=await reducedPage.locator('.chip').first()
  .evaluate(el=>getComputedStyle(el).transitionDuration);
 assert.ok(transitions.split(',').every(x=>x.trim()==='0s'),
  'Reduced-motion setting suppresses chip hover transitions');
 await reduced.close();
 console.log('PASS: WhatEatO wordmark, 4 languages, country flags, country preference, multilingual chips, search navigation, hover/active and reduced motion at 1440/390/360');
}finally{await browser.close()}
