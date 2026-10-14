#!/usr/bin/env node
// Offline safety gate for optional Google DB enrichment; no API calls made.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const text=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const lib=text('src/lib/google-free-tier-budget.ts');
const sql=text('db/migrations/016_google_free_tier_budget.sql');
const env=text('.env.example');
assert.match(env,/WHATEATO_GOOGLE_ENRICHMENT_ENABLED=false/);
assert.match(env,/WHATEATO_GOOGLE_PHOTO_APPROVED=false/);
assert.match(env,/WHATEATO_GOOGLE_PHOTO_QUOTA_GUARD_READY=false/);
assert.match(lib,/places_text_search_pro:\{month:300,day:20\}/);
assert.match(lib,/translation_nmt_chars:\{month:100000,day:10000\}/);
assert.match(lib,/WHATEATO_GOOGLE_ENRICHMENT_ENABLED==='true'/);
for(const err of ['disabled','no_database','monthly_cap','daily_cap','duplicate_work_item']){
 assert.ok(lib.includes("new GoogleBudgetBlocked('"+err+"')"));
}
assert.ok(lib.includes("client.query('BEGIN')"));
assert.match(lib,/FOR UPDATE/);
assert.ok(lib.includes("client.query('COMMIT')"));
assert.ok(lib.includes("client.query('ROLLBACK')"));
assert.ok(lib.includes('places.id,places.displayName,places.formattedAddress'));
assert.doesNotMatch(lib,/places\.rating|places\.reviews|places\.photos/);
assert.ok(lib.includes('https://places.googleapis.com/v1/places:searchText'));
assert.ok(lib.includes('https://translation.googleapis.com/language/translate/v2'));
assert.ok(lib.includes("source:'ko',target:input.to,format:'text'"));
assert.match(sql,/PRIMARY KEY\(month_key,sku,request_key\)/);
assert.match(sql,/PRIMARY KEY\(period_key,sku\)/);
assert.doesNotMatch(sql,/^\s*(DELETE|TRUNCATE|DROP|ALTER\s+TABLE\s+.+DROP)\b/im);
const map=text('src/components/RestaurantMap.tsx');
assert.ok(map.includes('https://tiles.openfreemap.org/styles/liberty'));
assert.doesNotMatch(map,/maps\.googleapis\.com\/maps\/api/);
console.log('PASS: free-tier guard OFF, atomic PostgreSQL quotas, no paid extras');
