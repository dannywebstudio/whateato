#!/usr/bin/env node
// Real HTTP smoke against a running local Next.js server and isolated CI fixture.
import assert from 'node:assert/strict';
const base='http://127.0.0.1:3000';
const rid='11111111-1111-4111-8111-111111111111';
async function get(path){
  const response=await fetch(base+path,{headers:{'Accept':'application/json'}});
  const raw=await response.text();
  let body;
  try{body=JSON.parse(raw)}catch{body=raw}
  return {status:response.status,body};
}
const readyp=await get('/api/ready');
assert.equal(readyp.status,200,'database readiness');
assert.equal(readyp.body.phase_1_5_schema,'ready');
assert.equal(readyp.body.catalog_quality_schema,'ready');
assert.equal(readyp.body.review_moderation_schema,'ready');
assert.equal(readyp.body.analytics_collection_enabled,false);
const first=await get('/api/v1/restaurants?q='+encodeURIComponent('테스트')+'&hl=en&limit=1');
assert.equal(first.status,200);
assert.equal(first.body.items.length,1);
assert.equal(first.body.has_more,true,'first page has a second published restaurant');
const second=await get('/api/v1/restaurants?q='+encodeURIComponent('테스트')+'&hl=en&limit=1&offset=1');
assert.equal(second.status,200);
assert.equal(second.body.items.length,1);
assert.equal(second.body.has_more,false,'last page must not show a phantom Next link');
const ids=[first.body.items[0].id,second.body.items[0].id].sort();
assert.deepEqual(ids,[rid,'22222222-2222-4222-8222-222222222222'].sort());
const matched=await get('/api/v1/restaurants?q='+encodeURIComponent('테스트')+'&hl=en&f=cafe');
assert.equal(matched.status,200);
assert.equal(matched.body.items.length,1);
assert.equal(matched.body.items[0].name,'Sunny Table');
assert.equal(matched.body.items[0].opening_hours,null,'unverified hours must never show open now');
assert.equal(matched.body.items[0].editorial_score,4.5);
assert.equal(matched.body.items[0].main_menu,'Coffee');
assert.equal(matched.body.items[0].tags[0].label,'Café');
assert.ok(matched.body.items[0].featured_image_metadata?.id);
assert.ok(!matched.body.items[0].featured_image_metadata?.storage_key,
  'unpublished storage location must not leak to API');
// Public permit category fallback is allowed only for concrete cafe/pub
// classifications. It must not synthesize lifestyle tag assignments.
const permitBar=await get('/api/v1/restaurants?q='+encodeURIComponent('테스트식당')+'&hl=ko&f=bar');
assert.equal(permitBar.status,200);
assert.equal(permitBar.body.items.length,1,'permit pub should match bar chip');
assert.equal(permitBar.body.items[0].category_code,'정종/대포집/소주방');
assert.deepEqual(permitBar.body.items[0].tags,[],'permit classification is NOT a verified lifestyle tag');
const permitCafe=await get('/api/v1/restaurants?q='+encodeURIComponent('지번전용식당')+'&hl=ko&f=cafe');
assert.equal(permitCafe.status,200);
assert.equal(permitCafe.body.items.length,1,'old permit 까페 classification should match cafe chip');
assert.deepEqual(permitCafe.body.items[0].tags,[],'permit category is not a licensed enrichment');
const categoryKeyword=await get('/api/v1/restaurants?q='+encodeURIComponent('정종/대포집/소주방')+'&hl=ko');
assert.equal(categoryKeyword.status,200);
assert.equal(categoryKeyword.body.items.length,1,'official registry classification is a searchable term');
assert.equal(categoryKeyword.body.items[0].name_ko,'테스트식당');
const categoryMap=await get('/api/v1/map/markers?bbox=37.57,126.98,37.59,127.01&q='+encodeURIComponent('정종/대포집/소주방'));
assert.equal(categoryMap.status,200);
assert.equal(categoryMap.body.items.length,1,'map and search include same permit category keyword');
const colloquialCafe=await get('/api/v1/restaurants?q='+encodeURIComponent('카페')+'&hl=ko');
assert.equal(colloquialCafe.status,200);
assert.ok(colloquialCafe.body.items.some(x=>x.id==='77777777-7777-4777-8777-777777777777'),
  '카페 keyword finds original permit code 까페 without creating tags');
const colloquialPub=await get('/api/v1/restaurants?q='+encodeURIComponent('술집')+'&hl=ko');
assert.equal(colloquialPub.status,200);
assert.ok(colloquialPub.body.items.some(x=>x.id==='22222222-2222-4222-8222-222222222222'),
  '술집 keyword matches only explicit permitted pub classifications');
const noVerifiedTags=await get('/api/v1/restaurants?hl=ko&f=date_night');
assert.deepEqual(noVerifiedTags.body.items,[],'proposed tag must not match');
const ja=await get('/api/v1/restaurants?hl=ja&q='+encodeURIComponent('테스트카페'));
assert.equal(ja.body.items[0].name,'테스트카페','no fabricated Japanese translation');
const region=await get('/api/v1/restaurants?hl=ko&region='+encodeURIComponent('종로구')+'&f=cafe');
assert.equal(region.body.items.length,2,'registry category fallback adds old-spelling cafe without invented verified tag');
const detail=await get('/api/v1/restaurants/'+rid+'?hl=en');
assert.equal(detail.status,200);
assert.equal(detail.body.restaurant.name,'Sunny Table');
assert.equal(detail.body.restaurant.editorial_score,4.5);
assert.equal(detail.body.restaurant.full_description,'Evidence-backed full intro for CI.');
assert.equal(detail.body.menus.length,2);
assert.equal(detail.body.menus.find(x=>x.name==='Coffee').price_krw,7500);
assert.equal(detail.body.menus.find(x=>x.name==='Unverified Price Item').price_krw,null);
assert.equal(detail.body.tags.length,1);
assert.equal(detail.body.images.length,1);
assert.equal(detail.body.images[0].url,'/api/v1/images/55555555-5555-4555-8555-555555555555');
assert.equal(matched.body.items[0].featured_image_metadata.url,detail.body.images[0].url);
const imageResponse=await fetch(base+detail.body.images[0].url);
assert.equal(imageResponse.status,200,'licensed media delivered');
assert.equal(imageResponse.headers.get('content-type'),'image/png');
assert.equal(imageResponse.headers.get('cache-control'),'no-store');
assert.equal(imageResponse.headers.get('x-content-type-options'),'nosniff');
const imageBytes=new Uint8Array(await imageResponse.arrayBuffer());
assert.ok(imageBytes.length>16);
assert.deepEqual(Array.from(imageBytes.slice(0,8)),[137,80,78,71,13,10,26,10]);
assert.equal((await get('/api/v1/images/66666666-6666-4666-8666-666666666666')).status,404,
  'unlicensed or unpublished photo must never be delivered');
assert.equal((await get('/api/v1/images/not-a-uuid')).status,400);

assert.equal((await get('/api/v1/restaurants/bad-id')).status,400);
assert.equal((await get('/api/v1/restaurants/ffffffff-ffff-4fff-8fff-ffffffffffff')).status,404);
const secondDetail=await get('/api/v1/restaurants/22222222-2222-4222-8222-222222222222?hl=en');
assert.equal(secondDetail.body.restaurant.name,'테스트식당','draft translation must be hidden');
assert.equal(secondDetail.body.restaurant.editorial_score,null,'draft score must be hidden');
assert.equal(secondDetail.body.tags.length,0,'proposed tag must be hidden');
assert.equal(secondDetail.body.images.length,0,'unlicensed images must be hidden');
// Public permit catalog is read-only: no auto-deletion of suspected duplicate
// or unverifiable records. Only an evidenced MANUAL confirmed_hold blocks display.
const heldId='88888888-8888-4888-8888-888888888888';
const lotId='77777777-7777-4777-8777-777777777777';
const holdSearch=await get('/api/v1/restaurants?q='+encodeURIComponent('보류검증식당')+'&hl=ko');
assert.equal(holdSearch.status,200);
assert.deepEqual(holdSearch.body.items,[],'human-confirmed hold must be absent from search');
assert.equal((await get('/api/v1/restaurants/'+heldId)).status,404,
  'held restaurant must be absent from direct public details');
const lotSearch=await get('/api/v1/restaurants?q='+encodeURIComponent('지번전용식당')+'&hl=ko');
assert.equal(lotSearch.status,200);
assert.equal(lotSearch.body.items.length,1,'pending issue must not hide otherwise public venue');
assert.equal(lotSearch.body.items[0].id,lotId);
assert.equal(lotSearch.body.items[0].address_ko,'서울특별시 종로구 적선동 9-1',
  'lot address should safely replace missing road address');
assert.equal((await get('/api/v1/restaurants?q='+encodeURIComponent('적선동'))).body.items[0].id,lotId,
  'search must match lot address when road address is absent');
const lotDetail=await get('/api/v1/restaurants/'+lotId);
assert.equal(lotDetail.status,200);
assert.equal(lotDetail.body.restaurant.road_address_ko,null);
assert.equal(lotDetail.body.restaurant.lot_address_ko,'서울특별시 종로구 적선동 9-1');
const lotGeo=await get('/api/v1/map/markers?bbox=37.60,127.04,37.62,127.06&q='+encodeURIComponent('지번전용식당'));
assert.equal(lotGeo.status,200);
assert.equal(lotGeo.body.items.length,1);
assert.equal(lotGeo.body.items[0].id,lotId);
assert.equal(lotGeo.body.items[0].address_ko,'서울특별시 종로구 적선동 9-1');
const lotHtml=await get('/search?q='+encodeURIComponent('지번전용식당'));
assert.match(lotHtml.body,/서울특별시 종로구 적선동 9-1/);
const heldHtml=await get('/search?q='+encodeURIComponent('보류검증식당'));
assert.ok(!heldHtml.body.includes('/restaurant/'+heldId),'held restaurant card must not appear in SSR search (query text may remain in input)');
assert.equal((await get('/restaurant/'+heldId)).status,404);

const searchHtml=await get('/search?q='+encodeURIComponent('테스트')+'&hl=en&f=cafe');
assert.equal(searchHtml.status,200);
assert.match(searchHtml.body,/Sunny Table/,'SSR results connected to catalog');
assert.match(searchHtml.body,/Coffee/,'SSR main menu displayed');
assert.match(searchHtml.body,/<img[^>]*src="\/api\/v1\/images\/55555555-5555-4555-8555-555555555555"/,
  'approved media is rendered in search result');
assert.ok(!searchHtml.body.includes('Draft Bistro'),'draft translation not visible in UI');
const detailHtml=await get('/restaurant/'+rid+'?hl=en');
assert.equal(detailHtml.status,200);
assert.match(detailHtml.body,/Evidence-backed full intro for CI./);
assert.ok(detailHtml.body.includes('www.google.com/maps/dir/?api=1'),'actual permit coordinates link to Google directions');
assert.match(detailHtml.body,/target="_blank" rel="noopener noreferrer"/,'directions use safe new-window link');
assert.match(detailHtml.body,/Coffee/);
assert.match(detailHtml.body,/Synthetic approved CI review number one/);
assert.match(detailHtml.body,/Synthetic approved CI review number two/);
assert.match(detailHtml.body,/Synthetic approved CI review number three/);
assert.ok(!detailHtml.body.includes('Synthetic unapproved CI review'));
assert.match(detailHtml.body,/Approved reviews.*?3/);
const reviewSummaryText=detailHtml.body.replace(/<!--[^]*?-->/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
assert.match(reviewSummaryText,/Approved reviews\s*3[^]*?★\s*4(?:\.0)?\s*\/\s*5/,'moderated review average excludes pending review');

assert.match(detailHtml.body,/<img[^>]*src="\/api\/v1\/images\/55555555-5555-4555-8555-555555555555"/,
  'approved media is rendered in detail page');
assert.match(detailHtml.body,/Sign in with Google/,'English review login prompt');
const japaneseDetail=await get('/restaurant/'+rid+'?hl=ja');
assert.equal(japaneseDetail.status,200);
assert.match(japaneseDetail.body,/Googleでログイン/,'Japanese review login prompt');
const chineseDetail=await get('/restaurant/'+rid+'?hl=zh-CN');
assert.equal(chineseDetail.status,200);
assert.match(chineseDetail.body,/使用 Google 登录/,'Chinese review login prompt');
const noImageDetail=await get('/restaurant/22222222-2222-4222-8222-222222222222?hl=ko');
assert.ok(!noImageDetail.body.includes('/api/v1/images/66666666-6666-4666-8666-666666666666'),
  'unapproved media must not appear in SSR HTML');

const mapHtml=await get('/map?q='+encodeURIComponent('테스트')+'&f=cafe&hl=en');
assert.equal(mapHtml.status,200,'map page remains SSR-capable');
assert.match(mapHtml.body,/Interactive restaurant map/,'commercially permitted free basemap has a container');
assert.ok(!mapHtml.body.includes('maptiler.com/maps/streets-v4/style.json?key='),
  'do not embed a paid map provider without a deliberately configured key');
assert.match(mapHtml.body,/aria-pressed="true"/,'map filter state restored after navigation');

const viewport=await get('/api/v1/map/markers?bbox=37.570,126.979,37.572,126.981&hl=en');
assert.equal(viewport.status,200,'bounded viewport map API');
assert.equal(viewport.body.mode,'viewport');
assert.equal(viewport.body.items.length,1,'closed and unpublished points are excluded');
assert.equal(viewport.body.items[0].id,rid);
assert.equal(viewport.body.items[0].name,'Sunny Table');
assert.equal(viewport.body.items[0].latitude,37.5711);
assert.equal(viewport.body.items[0].longitude,126.98);
assert.equal(viewport.body.items[0].editorial_score,4.5);
assert.equal(viewport.body.items[0].tags[0].code,'cafe');
assert.ok(!('distance_km' in viewport.body.items[0]) || viewport.body.items[0].distance_km===null);
assert.ok(!('storage_key' in viewport.body.items[0]));
const mapAll=await get('/api/v1/map/markers?bbox=37.56,126.97,37.59,127.01&hl=ja&limit=1');
assert.equal(mapAll.status,200);
assert.equal(mapAll.body.items.length,1);
assert.equal(mapAll.body.has_more,true,'viewport marker cap surfaces truncated state');
// Spatially diverse viewport sampling must not spend both slots on
// alphabetically early businesses from the same block when another cell has
// registered public restaurants. Nearby sorting remains distance-first.
const spatial=await get('/api/v1/map/markers?bbox=37.19,127.19,37.29,127.29&limit=2&hl=ko');
assert.equal(spatial.status,200,'spatial viewport smoke');
assert.equal(spatial.body.items.length,2,'strict viewport limit');
assert.equal(spatial.body.has_more,true,'remaining markers are acknowledged');
assert.deepEqual(spatial.body.items.map(x=>x.name_ko).sort(),
  ['가공간표본1','하공간표본'].sort(),
  'viewport slots must cover separate map cells regardless of PostgreSQL locale collation ordering');

const permitPubMarker=await get('/api/v1/map/markers?bbox=37.57,126.98,37.59,127.01&f=bar');
assert.equal(permitPubMarker.status,200);
assert.equal(permitPubMarker.body.items.length,1,'map and search share permit fallback');
assert.equal(permitPubMarker.body.items[0].category_code,'정종/대포집/소주방');
const mapNoTag=await get('/api/v1/map/markers?bbox=37.56,126.97,37.59,127.01&f=date_night');
assert.deepEqual(mapNoTag.body.items,[],'unverified tags never appear on map');
const nearby=await get('/api/v1/restaurants/nearby?lat=37.5711&lon=126.9800&radius_km=0.5&hl=en');
assert.equal(nearby.status,200);
assert.equal(nearby.body.mode,'nearby');
assert.equal(nearby.body.items.length,1,'farther restaurant excluded from radius');
assert.equal(nearby.body.items[0].id,rid);
assert.equal(nearby.body.items[0].distance_km,0);
const nearbyTwo=await get('/api/v1/restaurants/nearby?lat=37.5711&lon=126.98&radius_km=2&limit=1');
assert.equal(nearbyTwo.status,200);
assert.equal(nearbyTwo.body.items.length,1);
assert.equal(nearbyTwo.body.has_more,true);
assert.equal((await get('/api/v1/map/markers')).status,400,'bbox required');
assert.equal((await get('/api/v1/map/markers?bbox=37.58,127.0,37.57,126.97')).status,400,'inverted bbox');
assert.equal((await get('/api/v1/map/markers?bbox=33,124,39,132')).status,400,'excessive viewport');
assert.equal((await get('/api/v1/restaurants/nearby?lat=100&lon=126')).status,400,'Korea coordinate bounds');
assert.equal((await get('/api/v1/restaurants/nearby?lat=37.57&lon=126.98&radius_km=200')).status,400,'radius cap');

const robotsTxt=await get('/robots.txt');
assert.equal(robotsTxt.status,200);
assert.match(robotsTxt.body,/Disallow:\s*\//,'staging robots must block crawlers');
const sitemapXml=await get('/sitemap.xml');
assert.equal(sitemapXml.status,200);
assert.ok(!sitemapXml.body.includes('/restaurant/'+rid),'unlaunched permits must not be in sitemap');
assert.match(searchHtml.body,/<meta name="robots" content="noindex/,
  'search keyword/filter pages must be non-indexable');
assert.match(detailHtml.body,/<meta name="robots" content="noindex/,
  'restaurant page must stay noindex before launch');

const disabledAnalytics=await fetch(base+'/api/v1/analytics/events',{
  method:'POST',headers:{'Origin':base,'Content-Type':'application/json'},
  body:JSON.stringify({event_type:'page_view',page_type:'search',locale:'ko'})
});
assert.equal(disabledAnalytics.status,204,'analytics must be opt-in after release security checks');
console.log('PASS: Phase 2 real HTTP, SSR, localization, tag verification, score gate, licensing, pagination and analytics launch gate');
