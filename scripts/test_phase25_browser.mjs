#!/usr/bin/env node
// Real Chromium responsive QA against the local synthetic Postgres fixture only.
// Never uses an external website or production database; no screenshots of user data.
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base='http://127.0.0.1:3000';
const out='phase25-browser-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report=[];
async function check(page,label){
  const result=await page.evaluate(()=>{
    const viewport=document.documentElement.clientWidth;
    const scrollWidth=document.documentElement.scrollWidth;
    const main=document.querySelector('main');
    const rect=main?.getBoundingClientRect();
    return {viewport,scrollWidth,mainVisible:!!rect&&rect.width>200,
      horizontalOverflow:scrollWidth>viewport+2};
  });
  assert.ok(result.mainVisible,label+' main is visible');
  assert.equal(result.horizontalOverflow,false,label+' has no horizontal overflow');
  report.push({label,...result});
}
try{
  for(const device of [
    {name:'desktop',width:1440,height:900},
    {name:'mobile',width:390,height:844},
    {name:'small-mobile',width:360,height:740},
  ]){
    const context=await browser.newContext({viewport:{width:device.width,height:device.height},deviceScaleFactor:1});
    const page=await context.newPage();
    await page.goto(base+'/',{waitUntil:'networkidle'});
    await check(page,device.name+' home');
    assert.equal(await page.locator('.hero h1').count(),1,'locked hero exists');
    assert.equal(await page.locator('.search-form .chip').count(),12,'locked 12 home filter chips');
    if(device.name==='desktop')await page.screenshot({path:out+'/desktop-home.png',fullPage:true});

    const externalTiles=[];
    page.on('request',req=>{if(req.url().startsWith('https://api.maptiler.com/'))externalTiles.push(req.url())});
    await page.goto(base+'/map?hl=ko&f=cafe',{waitUntil:'networkidle'});
    await check(page,device.name+' map');
    assert.equal(await page.locator('[aria-label="Map provider not configured"]').count(),1,
      'provider tiles must stay disabled without a licensed key');
    assert.equal(await page.locator('.chips button.chip[aria-pressed="true"]').count(),1,
      'map filter restores selected chip');
    assert.equal(externalTiles.length,0,'unlicensed external tiles must not load');
    await page.screenshot({path:out+'/'+device.name+'-map-keyless.png',fullPage:true});

    const search='/search?q='+encodeURIComponent('테스트')+'&hl=ko';
    await page.goto(base+search,{waitUntil:'networkidle'});
    await check(page,device.name+' search');
    assert.equal(await page.locator('.results a.result').count(),2,'two published restaurants render');
    const cafe=page.locator('.chips button.chip').filter({hasText:'카페'});
    await cafe.click();
    assert.equal(await cafe.getAttribute('aria-pressed'),'true');
    await page.locator('.searchfield button').click();
    await page.waitForURL(url=>url.pathname==='/search'&&url.searchParams.get('f')==='cafe');
    await page.locator('a.result').first().waitFor({state:'visible'});
    assert.equal(await page.locator('.results a.result').count(),1,'verified cafe filter');
    assert.equal(await page.locator('.chips button.chip[aria-pressed="true"]').count(),1,'filter state restored');
    const licensedSearchPhoto=page.locator('.results a.result img[src^="/api/v1/images/"]');
    assert.equal(await licensedSearchPhoto.count(),1,'approved result photo rendered');
    await licensedSearchPhoto.first().waitFor({state:'visible'});
    await check(page,device.name+' filtered search');
    await page.screenshot({path:out+'/'+device.name+'-search.png',fullPage:true});

    await page.locator('.results a.result').first().click();
    await page.waitForURL(url=>url.pathname.startsWith('/restaurant/'));
    await check(page,device.name+' restaurant');
    assert.ok((await page.locator('main h1').textContent())?.includes('테스트카페'));
    assert.equal(await page.locator('main').getByText('커피',{exact:true}).count(),1);
    const licensedDetailPhoto=page.locator('main img[src^="/api/v1/images/"]');
    assert.equal(await licensedDetailPhoto.count(),1,'approved detail photo rendered');
    await licensedDetailPhoto.first().waitFor({state:'visible'});

    await page.screenshot({path:out+'/'+device.name+'-detail.png',fullPage:true});

    await page.locator('main a.simple-link').last().click();
    await page.waitForURL(url=>url.pathname==='/search'&&url.searchParams.get('f')==='cafe');
    assert.equal(await page.locator('.chips button.chip[aria-pressed="true"]').count(),1,'back navigation retains selected chips');
    report.push({device:device.name,scenario:'search->tag-filter->detail->back',passed:true});
    await context.close();
  }
  console.log(JSON.stringify(report,null,2));
  console.log('PASS Phase 2.5 Chromium desktop/mobile responsive and navigation QA');
}finally{await browser.close()}
