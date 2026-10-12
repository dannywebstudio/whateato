import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRestaurantSearchSql,parseFilters,normalizedTokens} from '../src/lib/search-query.ts';
test('keeps only recognized, unique filter chips',()=>{
 assert.deepEqual(parseFilters('cafe,cafe,INVALID,solo_dining'),['cafe','solo_dining']);
});
test('tokens split multi-intent queries',()=>{
 assert.deepEqual(normalizedTokens(' 강남역  파스타 '),['강남역','파스타']);
});
test('search without query or filters is safe and empty',()=>{
 assert.equal(makeRestaurantSearchSql({query:' ',filters:[]}),null);
});
test('two tokens AND together with placeholders',()=>{
 const r=makeRestaurantSearchSql({query:'강남역 파스타',filters:[]});
 assert.ok(r);
 assert.equal(r.params.length,2);
 assert.ok(r.sql.includes('$1'));
 assert.ok(r.sql.includes('$2'));
 assert.ok(r.sql.includes("business_status <> 'closed'"));
});
test('OR within one group, AND between groups',()=>{
 const r=makeRestaurantSearchSql({query:'',filters:['cafe','bar','date_night']});
 assert.ok(r);
 assert.equal(r.params.length,2);
 assert.deepEqual(r.params[0],['cafe','bar']);
 assert.deepEqual(r.params[1],['date_night']);
 assert.equal(r.sql.split('EXISTS (SELECT 1 FROM restaurant_verified_tags').length-1,2);
});
test('unverified tags and aliases are never used',()=>{
 const r=makeRestaurantSearchSql({query:'성수',filters:['local_pick']});
 assert.ok(r);
 assert.ok(r.sql.includes("a.review_status='verified'"));
 assert.ok(r.sql.includes("t.review_status='verified'"));
});
test('SQL injection remains parameters, never interpolated',()=>{
 const evil="' OR 1=1 --";
 const r=makeRestaurantSearchSql({query:evil,filters:[]});
 assert.ok(r);
 assert.equal(r.sql.includes('1=1'),false);
 assert.ok(r.params.some(p=>String(p).includes('1=1')));
});
test('limit number of tokens and wildcard escapes',()=>{
 const r=makeRestaurantSearchSql({query:'one two three four five six seven',filters:[]});
 assert.ok(r);assert.equal(r.params.length,6);
 const w=makeRestaurantSearchSql({query:'100%_마라',filters:[]});
 assert.ok(w);assert.equal(w.params[0],'%100\\%\\_마라%');
});
