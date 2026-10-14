#!/usr/bin/env node
// Browser-level UI regression against an ephemeral local fixture only.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {encode} from 'next-auth/jwt';
const db=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(db.hostname));
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
const base='http://127.0.0.1:3000';
const sub='cccccccc-cccc-4ccc-8ccc-ccccccccccc3';
const jwt=await encode({token:{sub},secret:process.env.AUTH_SECRET,
 salt:'authjs.session-token',maxAge:3600});
const browser=await chromium.launch({headless:true});
const out='review-form-browser-qa';
await mkdir(out,{recursive:true});
const review='A genuine synthetic visit summary for a browser-only review submission and refresh regression test.';
try{
 for(const viewport of [
  {name:'desktop',width:1440,height:900},
  {name:'mobile',width:390,height:844},
  {name:'small-mobile',width:360,height:740}
 ]){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
  await context.addCookies([{name:'authjs.session-token',value:jwt,url:base}]);
  const page=await context.newPage();
  const url=base+'/qa/review-form';
  await page.goto(url,{waitUntil:'networkidle'});
  if(viewport.name==='desktop'){
   // Prior API suite deletes its test review; initial editor must be empty.
   await page.getByText('Write a visitor review',{exact:true}).waitFor();
   assert.equal(await page.locator('textarea').inputValue(),'');
   assert.equal(await page.locator('[aria-pressed="true"]').count(),0);
   await page.getByRole('button',{name:'Food & taste 5 stars'}).click();
   await page.getByRole('button',{name:'Service 4 stars'}).click();
   await page.locator('textarea').fill(review);
   const send=page.getByRole('button',{name:/Submit my review/});
   await send.click();
   await page.getByText('Review submitted!',{exact:true}).waitFor();
   assert.equal(await page.locator('textarea').count(),0,'Form replaced by confirmation after submission');
   await page.screenshot({path:out+'/desktop-submitted.png',fullPage:true});
   await page.reload({waitUntil:'networkidle'});
  }
  await page.getByText('Thanks for sharing your visit',{exact:true}).waitFor();
  assert.equal(await page.locator('textarea').count(),0,'Reload must not reopen editor');
  assert.equal(await page.locator('[aria-pressed="true"]').count(),0,'Saved ratings must not auto-select editable stars');
  assert.equal(await page.getByText(review,{exact:true}).count(),0,'Saved narrative not rendered before request');
  await page.screenshot({path:out+'/'+viewport.name+'-saved.png',fullPage:true});
  await page.getByText('Read saved review',{exact:true}).click();
  await page.getByText(review,{exact:true}).waitFor({state:'visible'});
  await page.getByText('Read saved review',{exact:true}).click();
  await page.getByText(review,{exact:true}).waitFor({state:'detached'});
  const width=await page.evaluate(()=>({
   clientWidth:document.documentElement.clientWidth,
   scrollWidth:document.documentElement.scrollWidth
  }));
  assert.ok(width.scrollWidth<=width.clientWidth+2,'No horizontal overflow '+viewport.name+JSON.stringify(width));
  await page.getByRole('button',{name:/Edit my review/}).click();
  assert.equal(await page.locator('textarea').inputValue(),review,'Explicit Edit restores saved text');
  assert.equal(await page.locator('button[aria-pressed="true"]').count(),2,'Explicit Edit restores selected category ratings');
  await page.getByRole('button',{name:'Cancel editing'}).click();
  assert.equal(await page.locator('textarea').count(),0,'Cancel exits edit mode');
  await context.close();
 }
 console.log('PASS: Chromium submit confirmation, reload without prefill, explicit editing, cancellation, 1440/390/360px responsive');
}finally{await browser.close()}
