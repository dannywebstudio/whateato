#!/usr/bin/env node
// Synthetic and destructive fixture strictly for ephemeral localhost PostgreSQL CI.
// Refuses Neon/cloud and any non-local host. NEVER run against user restaurant data.
import {readFileSync} from 'node:fs';
import {mkdir,writeFile} from 'node:fs/promises';
import {isAbsolute,join,basename} from 'node:path';
import pg from 'pg';
const url=process.env.DATABASE_URL||'';
let parsed;
try{parsed=new URL(url)}catch{throw Error('DATABASE_URL required for CI fixture')}
if(!['localhost','127.0.0.1'].includes(parsed.hostname)||
   process.env.WHATEATO_CI_LOCAL_FIXTURE!=='ONLY_LOCAL_EPHEMERAL'){
  throw Error('Fixture refused: local ephemeral database and explicit CI acknowledgement required');
}
// Synthetic 1x1 PNG stored only in an isolated CI runner directory.
const mediaRoot=process.env.WHATEATO_MEDIA_ROOT||'';
if(!isAbsolute(mediaRoot)||basename(mediaRoot)!=='ci-media')
  throw Error('CI image root must be an isolated absolute ci-media directory');
await mkdir(join(mediaRoot,'media','ci-only'),{recursive:true});
await writeFile(join(mediaRoot,'media','ci-only','licensed.png'),
  Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9FHMs1oAAAAASUVORK5CYII=','base64'));
const client=new pg.Client({connectionString:url,connectionTimeoutMillis:7000});
await client.connect();
try{
  await client.query(`CREATE TABLE restaurants (
    id uuid PRIMARY KEY,
    name_ko text NOT NULL,
    road_address_ko text,
    lot_address_ko text,
    region_sido text,
    region_sigungu text,
    region_dong text,
    category_code text,
    latitude double precision,
    longitude double precision,
    business_status text NOT NULL DEFAULT 'active',
    publication_status text NOT NULL DEFAULT 'published'
  )`);
  await client.query(`
    INSERT INTO restaurants(id,name_ko,road_address_ko,region_sido,region_sigungu,category_code,latitude,longitude,business_status,publication_status) VALUES
    ('11111111-1111-4111-8111-111111111111','테스트카페','서울특별시 종로구 샘플로 1','서울특별시','종로구','카페',37.5711,126.9800,'active','published'),
    ('22222222-2222-4222-8222-222222222222','테스트식당','서울특별시 종로구 샘플로 2','서울특별시','종로구','한식',37.5780,126.9900,'active','published'),
    ('33333333-3333-4333-8333-333333333333','테스트비공개','서울특별시 종로구 샘플로 3','서울특별시','종로구','기타',37.5712,126.9801,'active','hidden'),
    ('44444444-4444-4444-8444-444444444444','테스트폐업','서울특별시 종로구 샘플로 4','서울특별시','종로구','기타',37.5713,126.9802,'closed','published')
  `);
  for(const migration of ['003_reviews_auth_minimal.sql','004_i18n_analytics.sql','005_geo_search_indexes.sql','006_complete_restaurant_tag_translations.sql']){
    await client.query(readFileSync('db/migrations/'+migration,'utf8'));
  }
  await client.query(`
    INSERT INTO restaurant_localizations(restaurant_id,locale,display_name,short_description,full_description,publication_state,verified_at)
    VALUES
    ('11111111-1111-4111-8111-111111111111','en','Sunny Table','Evidence-backed short intro.','Evidence-backed full intro for CI.', 'published',now()),
    ('22222222-2222-4222-8222-222222222222','en','Draft Bistro','Not approved yet.','Draft-only description.','draft',NULL)
  `);
  await client.query(`
    INSERT INTO restaurant_tag_assignments(restaurant_id,tag_code,verification_state,evidence_ref,verified_at) VALUES
    ('11111111-1111-4111-8111-111111111111','cafe','verified','local-ci-test-evidence',now()),
    ('22222222-2222-4222-8222-222222222222','date_night','proposed',NULL,NULL)
  `);
  const approvedMenu=await client.query(`
    INSERT INTO restaurant_menus(restaurant_id,price_krw,publication_state,evidence_ref,price_verified_at)
    VALUES('11111111-1111-4111-8111-111111111111',7500,'published','local-ci-menu-evidence',now())
    RETURNING id`);
  await client.query(`
    INSERT INTO restaurant_menu_localizations(menu_id,locale,name,description) VALUES
    ($1,'ko','커피','CI용 메뉴'),($1,'en','Coffee','CI test menu')`,[approvedMenu.rows[0].id]);
  const unverifiedPriceMenu=await client.query(`
    INSERT INTO restaurant_menus(restaurant_id,price_krw,position,publication_state,evidence_ref,price_verified_at)
    VALUES('11111111-1111-4111-8111-111111111111',9999,1,'published','local-ci-menu-evidence',NULL)
    RETURNING id`);
  await client.query(`
    INSERT INTO restaurant_menu_localizations(menu_id,locale,name) VALUES($1,'en','Unverified Price Item')`,
    [unverifiedPriceMenu.rows[0].id]);
  await client.query(`
    INSERT INTO restaurant_images(id,restaurant_id,storage_key,source_reference,usage_rights_reference,
     rights_status,publication_state,rights_verified_at,alt_ko) VALUES
    ('55555555-5555-4555-8555-555555555555','11111111-1111-4111-8111-111111111111','media/ci-only/licensed.png','CI synthetic fixture','CI-only mock approval','approved','published',now(),'테스트용 이미지 메타데이터'),
    ('66666666-6666-4666-8666-666666666666','22222222-2222-4222-8222-222222222222','media/ci-only/unverified.png','CI synthetic fixture',NULL,'pending','draft',NULL,'비공개')
  `);
  await client.query(`
    INSERT INTO restaurant_editorial_scores(restaurant_id,score,methodology_version,evidence_summary,approval_state,verified_at)
    VALUES
    ('11111111-1111-4111-8111-111111111111',4.5,'ci-fixture-v1','Synthetic review evidence solely for isolated local CI, not a real rating.','approved',now()),
    ('22222222-2222-4222-8222-222222222222',4.9,'ci-fixture-v1','Synthetic draft must not be visible to the public.','draft',NULL)
  `);
  console.log('Synthetic Phase 2 fixture ready (localhost only; 4 rows)');
}finally{await client.end()}
