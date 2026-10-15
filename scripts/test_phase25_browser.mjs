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

    const paidTiles=[];
    const freeTileRequests=[];
    page.on('request',req=>{
      if(req.url().startsWith('https://api.maptiler.com/'))paidTiles.push(req.url());
      if(req.url().startsWith('https://tiles.openfreemap.org/'))freeTileRequests.push(req.url());
    });
    // Third-party vector tiles can continuously stream; networkidle is not a
    // meaningful readiness signal for an interactive map. Await its DOM and
    // the first provider request instead.
    const styleRequested=page.waitForRequest(req=>
      req.url().startsWith('https://tiles.openfreemap.org/styles/liberty'),
      {timeout:20000});
    await page.goto(base+'/map?hl=ko&f=cafe',{waitUntil:'domcontentloaded',timeout:30000});
    await styleRequested;
    await page.waitForFunction(()=>{
      const map=document.querySelector('[aria-label="Interactive restaurant map"]');
      return map?.getAttribute('data-map-status')==='ready' ||
        !!document.querySelector('[aria-label="Basemap unavailable"] iframe[src^="https://www.openstreetmap.org/"]');
    },null,{timeout:22000});
    await page.locator('.map-explore-cards .we-card a[href^="/restaurant/"]').first().waitFor({timeout:12000});
    const fallback=await page.locator('[aria-label="Basemap unavailable"] iframe').count();
    if(!fallback){
      const canvas=page.locator('.maplibregl-canvas');
      await canvas.waitFor({state:'visible'});
    }
    await check(page,device.name+' map');
    assert.equal(await page.locator('[aria-label="Interactive restaurant map"]').count(),1,
      'commercial-use-allowed OpenFreeMap is the default basemap');
    assert.equal(await page.locator('.chips button.chip[aria-pressed="true"]').count(),1,
      'map filter restores selected chip');
    assert.equal(paidTiles.length,0,'unapproved paid MapTiler provider must not load');
    assert.ok(freeTileRequests.length>0,
      'MapLibre should request the public no-key OpenFreeMap style');
    // A clickable directory must focus the actual selected geographic
    // position, not just open a separate restaurant page.
    const showLocation=page.getByRole('button',{name:/지도에서 위치 보기/}).first();
    await showLocation.waitFor({state:'visible',timeout:10000});
    await showLocation.click();
    const chosen=await page.locator('[aria-label="Interactive restaurant map"]')
      .getAttribute('data-selected-map-restaurant');
    assert.match(chosen||'',/^[a-f0-9-]{36}$/i,'restaurant focus must select a real permit UUID');
    await page.screenshot({path:out+'/'+device.name+'-map.png',fullPage:true});

    const search='/search?q='+encodeURIComponent('테스트')+'&hl=ko';
    await page.goto(base+search,{waitUntil:'networkidle'});
    await check(page,device.name+' search');
    assert.equal(await page.locator('.restaurant-card-grid .we-card').count(),2,'two published restaurants render');
    const cafe=page.locator('.chips button.chip').filter({hasText:'카페'});
    await cafe.click();
    assert.equal(await cafe.getAttribute('aria-pressed'),'true');
    await page.locator('.searchfield button').click();
    await page.waitForURL(url=>url.pathname==='/search'&&url.searchParams.get('f')==='cafe');
    await page.locator('.restaurant-card-grid .we-card h3 a').first().waitFor({state:'visible'});
    assert.equal(await page.locator('.restaurant-card-grid .we-card').count(),1,'verified cafe filter');
    assert.equal(await page.locator('.chips button.chip[aria-pressed="true"]').count(),1,'filter state restored');
    const licensedSearchPhoto=page.locator('.restaurant-card-grid .we-card img[src^="/api/v1/images/"]');
    assert.equal(await licensedSearchPhoto.count(),1,'approved result photo rendered');
    await licensedSearchPhoto.first().waitFor({state:'visible'});
    await check(page,device.name+' filtered search');
    await page.screenshot({path:out+'/'+device.name+'-search.png',fullPage:true});

    await page.locator('.restaurant-card-grid .we-card').first().click();
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
