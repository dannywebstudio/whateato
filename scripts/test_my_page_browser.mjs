#!/usr/bin/env node
// Chromium UI + real local Postgres integration. NEVER targets Neon, Google or production.
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
import pg from 'pg';
import {chromium} from 'playwright';
import {encode} from 'next-auth/jwt';
const url=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname),'CI-local database only');
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
const root='http://127.0.0.1:3000';
const uid='12341234-1234-4234-8234-123412341234';
const restaurant='11111111-1111-4111-8111-111111111111';
const original='This synthetic restaurant review was authored solely for a local browser UI test of My Page.';
const updated='I updated this synthetic restaurant review using My Page. It must remain invisible until approved again.';
const connection=new pg.Client({connectionString:process.env.DATABASE_URL});
await connection.connect();
try{
 await connection.query("INSERT INTO whateato_review_accounts(id,google_subject) VALUES($1,'my-page-browser-qa-google-subject')",[uid]);
 await connection.query("INSERT INTO whateato_user_reviews(restaurant_id,account_id,rating,body,moderation_status,reviewed_at) VALUES($1,$2,4,$3,'published',now())",[restaurant,uid,original]);
}finally{await connection.end()}
const jwt=await encode({token:{sub:uid},secret:process.env.AUTH_SECRET,salt:'authjs.session-token',maxAge:3600});
const screenshots='my-page-browser-qa';await mkdir(screenshots,{recursive:true});
const browser=await chromium.launch({headless:true});
function safeWidth(page){return page.evaluate(()=>({
 client:document.documentElement.clientWidth,scroll:document.documentElement.scrollWidth
}));}
try{
 const anonymous=await browser.newContext({viewport:{width:1440,height:900}});
 const login=await anonymous.newPage();
 await login.route('**/api/visitor-country',r=>r.fulfill({json:{country:'US',source:'edge'}}));
 await login.goto(root+'/login?hl=en',{waitUntil:'networkidle'});
 assert.equal(await login.getByRole('button',{name:/Continue with Google/}).count(),1,'Google only');
 assert.equal(await login.locator('main form').count(),1,'no other login methods');
 await login.locator('header a[href^="/login"]').getByText('Login',{exact:true}).waitFor();
 await login.screenshot({path:screenshots+'/desktop-login.png',fullPage:true});
 await login.goto(root+'/my-page?hl=en',{waitUntil:'networkidle'});
 assert.equal(new URL(login.url()).pathname,'/login','anonymous My Page redirects to Login');
 await anonymous.close();

 const desktop=await browser.newContext({viewport:{width:1440,height:900}});
 await desktop.addCookies([{name:'authjs.session-token',value:jwt,url:root}]);
 const page=await desktop.newPage();
 await page.route('**/api/visitor-country',r=>r.fulfill({json:{country:'US',source:'edge'}}));
 await page.goto(root+'/?hl=en',{waitUntil:'networkidle'});
 await page.locator('header a[href^="/my-page"]').getByText('My Page',{exact:true}).waitFor();
 await page.locator('header a[href^="/my-page"]').click();
 await page.waitForURL(u=>u.pathname==='/my-page');
 await page.getByText(original,{exact:true}).waitFor();
 assert.equal(await page.getByText('Published',{exact:true}).count(),1);
 const width=await safeWidth(page);
 assert.ok(width.scroll<=width.client+2,'desktop width overflow '+JSON.stringify(width));
 await page.screenshot({path:screenshots+'/desktop-my-reviews.png',fullPage:true});
 await page.getByRole('button',{name:'Edit',exact:true}).click();
 assert.equal(await page.getByRole('textbox',{name:'Your review'}).inputValue(),original);
 await page.getByRole('textbox',{name:'Your review'}).fill(updated);
 await page.getByRole('button',{name:'Submit changes'}).click();
 await page.getByText(updated,{exact:true}).waitFor();
 await page.getByText('Awaiting approval',{exact:true}).waitFor();
 const publicReviews=await fetch(root+'/api/restaurants/'+restaurant+'/reviews').then(x=>x.json());
 assert.ok(!publicReviews.reviews.some(x=>x.body===updated),'pending edit must be hidden publicly');
 await page.screenshot({path:screenshots+'/desktop-pending-approval.png',fullPage:true});
 await desktop.close();

 const phone=await browser.newContext({viewport:{width:360,height:740},isMobile:true,hasTouch:true});
 await phone.addCookies([{name:'authjs.session-token',value:jwt,url:root}]);
 const mobile=await phone.newPage();
 await mobile.route('**/api/visitor-country',r=>r.fulfill({json:{country:'US',source:'edge'}}));
 await mobile.goto(root+'/my-page?hl=en',{waitUntil:'networkidle'});
 await mobile.getByText(updated,{exact:true}).waitFor();
 const mobileWidth=await safeWidth(mobile);
 assert.ok(mobileWidth.scroll<=mobileWidth.client+2,'mobile width overflow '+JSON.stringify(mobileWidth));
 await mobile.screenshot({path:screenshots+'/mobile-my-reviews.png',fullPage:true});
 mobile.on('dialog',async d=>{assert.equal(d.type(),'confirm');await d.accept()});
 await mobile.getByRole('button',{name:'Delete',exact:true}).click();
 await mobile.getByText(updated,{exact:true}).waitFor({state:'detached'});
 await mobile.getByText('No reviews yet.',{exact:true}).waitFor();
 const c=new pg.Client({connectionString:process.env.DATABASE_URL});await c.connect();
 try{
  const r=await c.query('SELECT count(*)::int AS n FROM whateato_user_reviews WHERE account_id=$1',[uid]);
  assert.equal(r.rows[0].n,0,'author deleted own review without moderation');
 }finally{await c.end()}
 await phone.close();
 console.log('PASS: Chromium Google-only Login, Header session switch, personal review cards, edit -> pending, public removal, immediate delete, 1440/360px');
}finally{await browser.close()}
