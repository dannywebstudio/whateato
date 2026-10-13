#!/usr/bin/env node
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const base='https://whateato.onrender.com';
await mkdir('render-staging-visual-qa',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
 for(const [device,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  const page=await browser.newPage({viewport:{width,height}});
  const errors=[];
  page.on('pageerror',err=>errors.push(err.message));
  for(const [route,label] of [['/','home'],['/search?hl=ko','search'],['/map?hl=ko','map']]){
   const res=await page.goto(base+route,{waitUntil:'domcontentloaded',timeout:60000});
   assert.equal(res?.status(),200,device+' '+label+' HTTP');
   const widthInfo=await page.evaluate(()=>({view:document.documentElement.clientWidth,content:document.documentElement.scrollWidth}));
   assert.ok(widthInfo.content<=widthInfo.view+2,device+' '+label+' horizontal overflow');
   await page.screenshot({path:'render-staging-visual-qa/'+device+'-'+label+'-preview50.png',fullPage:true});
  }
  const res=await page.goto(base+'/restaurant/16918f58-4e63-4e49-a013-aad17e499ad4',{waitUntil:'domcontentloaded'});
  assert.equal(res?.status(),404,'unfinished detail must remain hidden');
  assert.deepEqual(errors,[],device+' browser errors');
  await page.close();
 }
 console.log('PASS desktop/mobile: preview50 search/map empty state and hidden details');
}finally{await browser.close()}
