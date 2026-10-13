#!/usr/bin/env node
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base='https://whateato.onrender.com';
await mkdir('ui-system-qa',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const [device,w,h] of [['desktop',1440,900],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width:w,height:h}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const [path,stage] of [
   ['/search?q='+encodeURIComponent('우래옥')+'&hl=ko','search'],
   ['/restaurant/2daa58f1-6360-4ddb-a27f-6e6d1437a122?hl=ko','detail'],
   ['/map?hl=ko','map']
  ]){
   const res=await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(res?.status(),200,device+' '+stage);
   if(stage==='search'){
    await page.locator('.restaurant-card').first().waitFor({timeout:15000});
    assert.equal(await page.locator('.we-card-head').count()>0,true,'rich card');
   }
   if(stage==='detail'){
    assert.equal(await page.locator('.restaurant-hero').count(),1,'hero');
    assert.equal(await page.locator('.hours-panel .hour-line').count()>0,true,'grouped hours');
    const lines=await page.locator('.hours-panel .hour-line').allTextContents();
    assert.ok(lines.some(x=>x.includes('화~일')),'Tue-Sun hours grouped: '+JSON.stringify(lines));
    assert.equal(await page.locator('.menu-item').count(),2,'menu grid');
   }
   if(stage==='map'){
    await page.locator('.map-explore-layout').waitFor({timeout:30000});
    assert.equal(await page.locator('.map-explore-pagination button').count(),2,'pagination buttons');
    assert.ok((await page.locator('.map-explore-cards .we-card').count())<=4,'max four visible');
    assert.equal(await page.locator('.related-local-posts').count(),0,'hide blog section with no query');
    await page.locator('.map-restaurant-card').first().waitFor({timeout:30000});
    assert.ok(await page.locator('.map-card-locate').count()>0,'map selection preserved');
    const style=await page.locator('.map-explore-cards .we-card').first().evaluate(el=>{
      const card=getComputedStyle(el);const title=getComputedStyle(el.querySelector('.we-card-head h3'));
      return {borderLeftWidth:card.borderLeftWidth,borderLeftColor:card.borderLeftColor,height:el.getBoundingClientRect().height,titleFontSize:title.fontSize};
    });
    console.log(JSON.stringify({device,mapCardComputed:style}));
    assert.equal(style.borderLeftWidth,'5px','cuisine category left border must be visible');
    assert.ok(Number.parseFloat(style.titleFontSize)>=16,'readable title size');
    assert.ok(style.height>=125,'expanded map card height');
    if(device==='desktop')assert.ok(style.height>=140 && style.height<=195,'four slots must fit the map height');
    assert.ok(await page.locator('.map-explore-cards .we-cuisine-tag').count()>0,'cuisine tags must be visible');
    const label=await page.locator('.map-explore-list-head h2').innerText();
    assert.ok(!label.includes(String.fromCharCode(36)),'no dollar in counter');
    assert.ok(await page.locator('.map-explore-cards .we-card-visit').first().isVisible(),'detail button visible');
   }
   const d=await page.evaluate(()=>({view:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
   assert.ok(d.content<=d.view+2,device+' '+stage+' overflow '+JSON.stringify(d));
   await page.screenshot({path:'ui-system-qa/'+device+'-'+stage+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[],device+' errors');
  await page.close();
 }
 console.log('PASS: rich search cards, grouped restaurant hours, map selection and mobile responsiveness');
}finally{await browser.close()}
),'no stray dollar signs in restaurant count');
    assert.ok(await page.locator('.map-explore-cards .we-card-visit').first().isVisible(),'detail button visible');
   }
   const d=await page.evaluate(()=>({view:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
   assert.ok(d.content<=d.view+2,device+' '+stage+' overflow '+JSON.stringify(d));
   await page.screenshot({path:'ui-system-qa/'+device+'-'+stage+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[],device+' errors');
  await page.close();
 }
 console.log('PASS: rich search cards, grouped restaurant hours, map selection and mobile responsiveness');
}finally{await browser.close()}
