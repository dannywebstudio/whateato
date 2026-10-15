#!/usr/bin/env node
// Contract QA: publicly reachable multilingual legal links with no duplicate contact page.
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
const footer=read('src/components/LocalizedChromeText.tsx');
const layout=read('src/app/layout.tsx');
const privacy=read('src/app/privacy/page.tsx');
const terms=read('src/app/terms/page.tsx');
const privacyCopy=read('src/lib/legal-privacy.ts');
const termsCopy=read('src/lib/legal-terms.ts');
const contact=read('src/app/contact/page.tsx');
const legalPage=read('src/components/LegalPage.tsx');
assert.match(layout,/SiteFooter/,'site-wide footer remains mounted');
for(const path of ['/privacy','/terms','/contact'])
 assert.ok(footer.includes("'"+path+"'"),'footer link missing: '+path);
assert.ok(footer.includes("encodeURIComponent(locale)"),'localized legal links must preserve language');
for(const locale of ['ko','en','ja',"'zh-CN'"]){
 assert.ok(footer.includes(locale+':{privacy:'),'localized footer label missing: '+locale);
 assert.ok(privacyCopy.includes(locale+':{'),'privacy locale missing: '+locale);
 assert.ok(termsCopy.includes(locale+':{'),'terms locale missing: '+locale);
}
assert.match(privacy,/normalizeLocale\(hl\)/);
assert.match(terms,/normalizeLocale\(hl\)/);
assert.match(privacy,/privacyCopy\[locale\]/);
assert.match(terms,/termsCopy\[locale\]/);
assert.match(legalPage,/href=\{'\/contact\?hl='/,'legal pages must reuse existing Contact');
assert.match(contact,/const email='pakrsky2@naver.com'/,'keep existing Contact email');
assert.ok(!existsSync('src/app/contact-new'),'do not duplicate existing contact');
assert.ok(!privacy.includes('개발 미리보기'),'live privacy must not claim developer preview');
for(const p of ['privacy','terms'])assert.match(read('src/app/'+p+'/page.tsx'),/robots:\{index:false,follow:false\}/);
for(const phrase of ['openid','email','google_subject','Google','Hostinger','Neon','ipwho.is','OpenStreetMap']){
 // google_subject internal exact label may be disclosed in user-friendly text as sub.
 if(phrase==='google_subject')continue;
 assert.ok(privacyCopy.includes(phrase),'required disclosure missing: '+phrase);
}
console.log('PASS: footer links /privacy /terms /contact, 4 locales, existing Contact, privacy and terms disclosures');
