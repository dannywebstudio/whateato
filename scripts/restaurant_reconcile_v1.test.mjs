import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcileIdentity,CARD_DETAIL_GATES} from './restaurant_reconcile_v1.mjs';
const base={official:{name:'청진옥',address:'서울특별시 종로구 종로3길 32',permitStatus:'영업',permitKey:'localdata:1'},googleIdCandidates:['idonly']};
test('one exact name and full address is only a candidate, never automatically publishable',()=>{
 const x=reconcileIdentity({...base,naverCandidates:[{title:'<b>청진옥</b>',roadAddress:'서울특별시 종로구 종로3길 32'}]});
 assert.equal(x.decision,'CANDIDATE');assert.equal(x.publishable,false);assert.equal(x.naverExactMatches,1);
 assert.equal(x.googleIdsOnlyCount,1);assert.equal(JSON.stringify(x).includes('종로3길'),false);
});
test('district-only matching is insufficient',()=>{
 const x=reconcileIdentity({...base,naverCandidates:[{title:'청진옥',roadAddress:'서울 종로구 다른길 15'}]});
 assert.equal(x.decision,'REVIEW');assert.equal(x.naverWeakMatches,1);
});
test('Google IDs alone do not validate or approve identity',()=>{
 const x=reconcileIdentity(base);assert.equal(x.decision,'REVIEW');assert.equal(x.publishable,false);
});
test('closure and manual hold override matching',()=>{
 const cand=[{title:'청진옥',roadAddress:base.official.address}];
 assert.equal(reconcileIdentity({...base,official:{...base.official,permitStatus:'폐업'},naverCandidates:cand}).decision,'HOLD');
 assert.equal(reconcileIdentity({...base,manualIdentityHold:true,naverCandidates:cand}).decision,'HOLD');
});
test('ambiguous duplicate exact matches require review',()=>{
 const c={title:'청진옥',roadAddress:base.official.address};
 assert.equal(reconcileIdentity({...base,naverCandidates:[c,c]}).decision,'REVIEW');
});
test('published-card gates do not infer photography or rating from APIs',()=>{
 assert.match(CARD_DETAIL_GATES.images,/rights/);assert.match(CARD_DETAIL_GATES.rating,/approved/);
});
