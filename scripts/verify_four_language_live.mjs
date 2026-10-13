#!/usr/bin/env node
import assert from 'node:assert/strict';
const base='https://whateato.onrender.com', id='2daa58f1-6360-4ddb-a27f-6e6d1437a122';
for(const [lang,needle] of [['ko','서울특별시'],['en','Changgyeonggung-ro'],['ja','昌慶宮路'],['zh-CN','昌庆宫路']]){
 const [detail,list]=await Promise.all([
  fetch(base+'/api/v1/restaurants/'+id+'?hl='+encodeURIComponent(lang),{signal:AbortSignal.timeout(40000)}),
  fetch(base+'/api/v1/restaurants?hl='+encodeURIComponent(lang)+'&limit=10',{signal:AbortSignal.timeout(40000)})
 ]);
 assert.equal(detail.status,200,'detail '+lang);
 assert.equal(list.status,200,'search '+lang);
 const d=await detail.json(),l=await list.json();
 assert.ok(d.restaurant.address?.includes(needle),'translated detail address '+lang+': '+d.restaurant.address);
 assert.ok(l.items.find(x=>x.id===id)?.address?.includes(needle),'translated search address '+lang);
 assert.ok(d.menus.length===2 && d.menus.every(m=>m.name),'localized menu data '+lang);
 console.log(JSON.stringify({locale:lang,address:d.restaurant.address,menus:d.menus.map(m=>m.name)}));
}
const m=await fetch(base+'/api/v1/map/markers?bbox=37.54%2C126.95%2C37.61%2C127.05&hl=en&limit=50',{signal:AbortSignal.timeout(40000)});
assert.equal(m.status,200);const data=await m.json();
assert.ok(data.items.find(x=>x.id===id)?.address?.includes('Changgyeonggung-ro'),'map uses localized address');
assert.ok(data.items.find(x=>x.id===id)?.main_menu,'map has localized main menu');
console.log('PASS shared multilingual search/detail/map addresses and menus');
