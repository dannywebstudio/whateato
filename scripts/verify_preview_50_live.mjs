#!/usr/bin/env node
// Read-only HTTP smoke test; only staging preview, no external paid APIs.
const base=process.env.WHATEATO_PREVIEW_BASE_URL||'https://whateato.onrender.com';
if(new URL(base).hostname!=='whateato.onrender.com')throw Error('staging host only');
const checks=[
 ['/api/v1/restaurants?limit=30', 'items'],
 ['/api/v1/map/markers?bbox=37.54%2C126.95%2C37.61%2C127.05&limit=100','items']
];
for(const [route,key] of checks){
 const c=new AbortController();const timer=setTimeout(()=>c.abort(),25000);
 try{
  const response=await fetch(base+route,{signal:c.signal,headers:{'Cache-Control':'no-cache'}});
  if(!response.ok)throw Error(route+' HTTP '+response.status);
  const data=await response.json();
  if(!Array.isArray(data[key]))throw Error(route+' missing items array');
  if(data[key].length!==0)throw Error(route+' unexpected visible restaurants: '+data[key].length+'; preview gate may be disabled');
  console.log(JSON.stringify({route,ok:true,visibleCount:data[key].length}));
 }finally{clearTimeout(timer)}
}
console.log('PASS: no unready restaurants exposed by Search or Map APIs');

const privateDetails=[
 '16918f58-4e63-4e49-a013-aad17e499ad4',
 '6cc37914-1bb8-406e-a365-34c897b4f26f',
 '2daa58f1-6360-4ddb-a27f-6e6d1437a122'
];
for(const id of privateDetails){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),25000);
 try{
  const response=await fetch(base+'/restaurant/'+id,{signal:controller.signal,redirect:'manual'});
  if(response.status!==404)throw Error('Incomplete restaurant direct URL not hidden, HTTP '+response.status+' id='+id);
  console.log(JSON.stringify({route:'/restaurant/'+id,hidden:true,httpStatus:404}));
 }finally{clearTimeout(timer)}
}
