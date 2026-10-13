#!/usr/bin/env node
// Preview-only Chromium QA. GET only; uses public permit records and no user accounts.
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.env.WHATEATO_STAGING_BASE_URL||'';
const origin=new URL(base).origin;
assert.equal(origin,'https://whateato.onrender.com','Visual QA is staging-only');
assert.equal(process.env.WHATEATO_STAGING_ACK,'PREVIEW_ONLY');
const out='render-staging-visual-qa';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const checks=[];
try{
  for(const [name,width,height] of [
    ['desktop',1440,900],['mobile',390,844],['small-mobile',360,740]
  ]){
    const context=await browser.newContext({
      viewport:{width,height},deviceScaleFactor:1
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message.slice(0,140)));
    async function open(path){
      const response=await page.goto(origin+path,{waitUntil:'domcontentloaded',timeout:60000});
      assert.equal(response?.status(),200,name+' '+path+' returns HTTP 200');
    }
    async function noHorizontalOverflow(stage){
      const m=await page.evaluate(()=>({
        viewport:document.documentElement.clientWidth,
        contentWidth:document.documentElement.scrollWidth
      }));
      assert.ok(m.contentWidth<=m.viewport+2,name+' '+stage+' horizontal overflow: '+JSON.stringify(m));
      checks.push({device:name,stage,overflow:false});
    }
    await open('/');
    assert.equal(await page.locator('.hero h1').count(),1,'locked WhatEatO hero');
    await noHorizontalOverflow('home');
    await page.screenshot({path:out+'/'+name+'-home.png',fullPage:true});

    await open('/search?q='+encodeURIComponent('종로구')+'&hl=ko');
    await page.locator('.results a.result').first().waitFor({timeout:15000});
    const category=page.locator('.results a.result').first();
    assert.match((await category.textContent())||'',/인허가 업종|서울특별시/,'public permit provenance');
    await noHorizontalOverflow('search');
    await page.screenshot({path:out+'/'+name+'-search.png',fullPage:true});
    await category.click();
    await page.waitForURL(/\/restaurant\/[a-f0-9-]{36}/,{timeout:15000});
    assert.equal(await page.locator('main h1').count(),1,'restaurant detail');
    await noHorizontalOverflow('detail');
    await page.screenshot({path:out+'/'+name+'-detail.png',fullPage:true});

    const styleRequests=[];
    page.on('requestfailed',req=>{
      if(req.url().includes('openfreemap.org'))styleRequests.push('FAILED '+req.url().slice(0,170)+' '+req.failure()?.errorText);
    });
    page.on('response',response=>{
      if(response.url().includes('openfreemap.org')&&response.status()>=400)
        styleRequests.push('HTTP '+response.status()+' '+response.url().slice(0,170));
    });
    await open('/map?q='+encodeURIComponent('종로구')+'&hl=ko');
    await page.waitForTimeout(6000);
    const mapDiagnostics=await page.evaluate(()=>{
      const host=document.querySelector('[aria-label="Interactive restaurant map"]');
      const canvas=host?.querySelector('canvas');
      const s=document.querySelector('[role="status"]');
      return {container:!!host,containerRect:host?.getBoundingClientRect().toJSON(),
        hasCanvas:!!canvas,canvasWidth:canvas?.width,canvasHeight:canvas?.height,
        status:s?.textContent?.trim(),mapLibreLoaded:!!document.querySelector('.maplibregl-map'),
        errorDisplay:!!document.querySelector('[aria-label="Basemap unavailable"]')};
    });
    console.log('MAP DISPLAY DIAGNOSTICS '+JSON.stringify({device:name,networkErrors:styleRequests.slice(0,12),...mapDiagnostics}));
    // Keyless setup must provide a factual directory, NOT unauthorized tiles.
    const noProvider=await page.locator('[aria-label="Map provider not configured"]').count();
    if(noProvider){
      await page.locator('[aria-label="Map provider not configured"] + p').waitFor({timeout:15000});
      await page.locator('.results .result a[href^="/restaurant/"]').first().waitFor({timeout:20000});
    }else{
      assert.equal(await page.locator('[aria-label="Interactive restaurant map"]').count(),1);
    }
    await noHorizontalOverflow('map');
    await page.screenshot({path:out+'/'+name+'-map.png',fullPage:true});
    assert.deepEqual(errors,[],name+' browser exceptions');
    await context.close();
  }
  console.log(JSON.stringify({result:'PASS',origin,checks,notes:'Public staging site; desktop/mobile; no mutations'},null,2));
}finally{await browser.close()}
