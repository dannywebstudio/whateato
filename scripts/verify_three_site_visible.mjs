#!/usr/bin/env node
const base='https://whateato.onrender.com';
const rows=[
 ['16918f58-4e63-4e49-a013-aad17e499ad4','광화문 미진'],
 ['6cc37914-1bb8-406e-a365-34c897b4f26f','청진옥'],
 ['2daa58f1-6360-4ddb-a27f-6e6d1437a122','우래옥']
];
for(const [id,name] of rows){
 const r=await fetch(base+'/restaurant/'+id+'?hl=ko',{signal:AbortSignal.timeout(40000)});
 if(r.status!==200)throw Error(name+' detail HTTP '+r.status);
 const html=await r.text();
 if(!html.includes(name))throw Error(name+' SSR missing name');
 if(!html.includes('openstreetmap.org/export/embed.html'))throw Error(name+' mini map missing');
 if(!html.includes('입니다')&&!html.includes('선보입니다'))throw Error(name+' polite description missing');
 const api=await fetch(base+'/api/v1/restaurants/'+id+'?hl=ko',{signal:AbortSignal.timeout(40000)});
 if(!api.ok)throw Error(name+' API HTTP '+api.status);
 const body=await api.json();
 if(body.menus.length<2||body.menus.some(menu=>menu.price_krw===null))throw Error(name+' unpriced menus');
 if(!body.restaurant.opening_hours||body.restaurant.opening_hours.weekly.length<6)throw Error(name+' missing weekly hours');
 if(!['open','closed'].includes(body.restaurant.opening_hours.state))throw Error(name+' status unavailable');
 console.log('IMPROVEMENTS '+name+' menus='+body.menus.length+' hours='+body.restaurant.opening_hours.state);
 console.log('VISIBLE DETAIL '+name+' HTTP '+r.status);
}
const list=await fetch(base+'/api/v1/restaurants?hl=ko&limit=30',{signal:AbortSignal.timeout(40000)});
if(!list.ok)throw Error('list HTTP '+list.status);
const data=await list.json();
for(const [id,name] of rows){
 if(!data.items.some(x=>x.id===id))throw Error('list missing '+name);
}
if(data.items.length!==3)throw Error('Unexpected restaurant count '+data.items.length);
console.log('PASS: exactly 3 text-only staging records visible');
