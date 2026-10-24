#!/usr/bin/env node
// Read-only production QA. No deployment, credentials, writes or website changes.
const origin=(process.argv[2] || 'https://whateato.com').replace(/\/$/,'');
const approved = [
 ['a21f6631-85a3-4b26-9e22-c03dfbca6362','개항로통닭'],
 ['8083caf8-7ba3-400b-a541-b077915596e0','개항집'],
 ['3c0aa90b-9fe2-4ea9-b653-d05422ba8c7f','경인면옥'],
 ['e02a8ae6-d06e-49f8-b17a-d5abddde5772','광신제면소'],
 ['4123c3a2-cdbb-4db4-a032-6ed19ab8df3e','신성루'],
 ['e61d2708-70e7-44f5-962e-00680ad45f47','온센 본점'],
 ['c6b42a78-0b2a-4299-a831-6aaefda161b7','잉글랜드경양식돈까스'],
 ['f2980e29-feeb-4910-89c5-989c95591e3a','청실홍실 신포본점']
];
async function get(path) {
 const res=await fetch(origin+path,{redirect:'follow',signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw new Error(path+' returned HTTP '+res.status);
 return res;
}
try{
 const page=await get('/map?hl=ko');
 console.log('PASS /map HTTP '+page.status);
 const search=await (await get('/api/v1/restaurants?hl=ko&limit=30')).json();
 if(!Array.isArray(search.items))throw new Error('Search API items array is missing');
 const searchIds=new Set(search.items.map(v=>v.id));
 const markers=await (await get('/api/v1/map/markers?hl=ko&bbox=37.44,126.58,37.5,126.68&limit=100')).json();
 if(!Array.isArray(markers.items))throw new Error('Map API items array is missing');
 const mapIds=new Set(markers.items.map(v=>v.id));
 let failures=0;
 for(const [id,name] of approved) {
   const inSearch=searchIds.has(id),onMap=mapIds.has(id);
   console.log((inSearch&&onMap?'PASS':'FAIL')+' '+name+' search='+inSearch+' map='+onMap);
   if(!inSearch||!onMap)failures++;
 }
 console.log('Observed search items='+search.items.length+' Incheon Map markers='+markers.items.length);
 if(failures)throw new Error(failures+' approved Incheon restaurants missing from public APIs');
 console.log('PASS: Eight verified Incheon restaurants visible in live Search and Map');
}catch(e){
 console.error('LIVE_RELEASE_QA_FAILED: '+String(e));
 process.exitCode=1;
}
