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
// An HTTP 200 homepage does not prove MapLibre v6's worker is deployed.
for(const moduleName of ['maplibre-gl-worker.mjs','maplibre-gl-shared.mjs']){
  const resp=await fetch(origin+'/maplibre/'+moduleName,{cache:'no-store'});
  assert.equal(resp.status,200,'MapLibre same-origin worker dependency: '+moduleName);
  const body=await resp.text();
  assert.ok(body.length>16,'MapLibre module truncated: '+moduleName);
}
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
    page.on('console',msg=>{
      if(msg.text().includes('WHATEATO_MAP_RENDER_ERROR'))
        console.log('MAP_ENGINE_ERROR '+name+' '+msg.text().slice(0,220));
    });
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
    // A mounted div or canvas is NOT evidence of a visible map.
    // Enforce successful marker display OR a real iframe fallback map,
    // with a loaded restaurant directory independently of WebGL.
    await page.waitForFunction(()=>{
      const host=document.querySelector('[aria-label="Interactive restaurant map"]');
      return host?.getAttribute('data-map-status')==='ready' ||
        !!document.querySelector('[aria-label="Basemap unavailable"] iframe[src^="https://www.openstreetmap.org/export/embed.html"]');
    },null,{timeout:22000});
    await page.locator('.results .result a[href^="/restaurant/"]').first().waitFor({timeout:14000});
    const hasFallback=await page.locator('[aria-label="Basemap unavailable"] iframe').count();
    if(name==='desktop')assert.equal(hasFallback,0,
      'Desktop Chromium must render vector basemap and markers using the correctly installed v6 worker');
    if(hasFallback){
      const src=await page.locator('[aria-label="Basemap unavailable"] iframe').getAttribute('src');
      assert.ok(src?.startsWith('https://www.openstreetmap.org/export/embed.html'),
        'WebGL failures show a real external OpenStreetMap fallback, not an empty gray map');
    }else{
      const canvas=page.locator('.maplibregl-canvas');
      await canvas.waitFor({state:'visible',timeout:8000});
      const bounds=await canvas.boundingBox();
      assert.ok(bounds&&bounds.width>200&&bounds.height>250,'rendered map canvas must have dimensions');
      assert.match((await page.locator('[role="status"]').textContent())||'',/지도|식당/,
        'real map data status should be visible');
    }
    console.log('MAP RENDER PASS '+JSON.stringify({device:name,fallback:Boolean(hasFallback)}));
    await noHorizontalOverflow('map');
    await page.screenshot({path:out+'/'+name+'-map.png',fullPage:true});
    assert.deepEqual(errors,[],name+' browser exceptions');
    await context.close();
  }
  console.log(JSON.stringify({result:'PASS',origin,checks,notes:'Public staging site; desktop/mobile; no mutations'},null,2));
}finally{await browser.close()}
