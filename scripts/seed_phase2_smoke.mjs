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
    INSERT INTO restaurants(
      id,name_ko,road_address_ko,lot_address_ko,region_sido,region_sigungu,
      category_code,latitude,longitude,business_status,publication_status
    ) VALUES
    ('11111111-1111-4111-8111-111111111111','테스트카페',
      '서울특별시 종로구 샘플로 1',NULL,'서울특별시','종로구','카페',37.5711,126.9800,'active','published'),
    ('22222222-2222-4222-8222-222222222222','테스트식당',
      '서울특별시 종로구 샘플로 2',NULL,'서울특별시','종로구','정종/대포집/소주방',37.5780,126.9900,'active','published'),
    ('33333333-3333-4333-8333-333333333333','테스트비공개',
      '서울특별시 종로구 샘플로 3',NULL,'서울특별시','종로구','기타',37.5712,126.9801,'active','hidden'),
    ('44444444-4444-4444-8444-444444444444','테스트폐업',
      '서울특별시 종로구 샘플로 4',NULL,'서울특별시','종로구','기타',37.5713,126.9802,'closed','published'),
    ('77777777-7777-4777-8777-777777777777','지번전용식당',
      NULL,'서울특별시 종로구 적선동 9-1','서울특별시','종로구','까페',37.6101,127.0500,'active','published'),
    ('88888888-8888-4888-8888-888888888888','보류검증식당',
      '서울특별시 종로구 가상로 8',NULL,'서울특별시','종로구','기타',37.5712,126.9795,'active','published')
  `);
  // Synthetic multi-cell map data detects hotspot-only alphabetical samples.
  await client.query(`
    INSERT INTO restaurants(
      id,name_ko,road_address_ko,region_sido,region_sigungu,
      category_code,latitude,longitude,business_status,publication_status
    ) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','가공간표본1','가상 공간검증로 1','서울특별시','독립표본구','기타',37.2010,127.2010,'active','published'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','가공간표본2','가상 공간검증로 2','서울특별시','독립표본구','기타',37.2011,127.2011,'active','published'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','가공간표본3','가상 공간검증로 3','서울특별시','독립표본구','기타',37.2012,127.2012,'active','published'),
    ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1','하공간표본','가상 공간검증로 4','서울특별시','독립표본구','기타',37.2810,127.2810,'active','published')
  `);
  for(const migration of ['003_reviews_auth_minimal.sql','004_i18n_analytics.sql','005_geo_search_indexes.sql','006_complete_restaurant_tag_translations.sql','007_review_moderation_audit.sql','008_restaurant_quality_review.sql','009_quality_candidates_non_destructive.sql','010_verified_opening_hours.sql','012_approved_external_ratings.sql']){
    await client.query(readFileSync('db/migrations/'+migration,'utf8'));
  }
  // Mirror additive CMS/blog schema in localhost HTTP test (never Neon).
  for(const migration of [
    '014_bulk_content_operations.sql',
    '015_owner_cms_roles_media.sql',
    '016_cms_restaurant_address_media.sql',
    '017_public_visitor_review_media.sql',
    '018_owner_review_delete_audit.sql',
    '019_blog_cms_editorial.sql',
    '020_blog_category_tree.sql'
  ]) await client.query(readFileSync('db/migrations/'+migration,'utf8'));
  // Only in ephemeral local CI: enforce release A/B gate with approved sample records.
  await client.query(`
    CREATE TABLE whateato_release_cohort_300_v1 (
      restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id),
      review_state text NOT NULL DEFAULT 'approved'
    );
    CREATE TABLE whateato_restaurant_triage_v1 (
      restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id),
      grade text NOT NULL DEFAULT 'B',
      visibility text NOT NULL DEFAULT 'full'
    );
    INSERT INTO whateato_release_cohort_300_v1(restaurant_id)
      SELECT id FROM restaurants WHERE business_status='active' AND publication_status='published';
    INSERT INTO whateato_restaurant_triage_v1(restaurant_id)
      SELECT restaurant_id FROM whateato_release_cohort_300_v1;
    CREATE OR REPLACE VIEW restaurant_address_localizations_v1 AS
      SELECT id AS restaurant_id, 'ko'::text AS locale,
        COALESCE(road_address_ko,lot_address_ko) AS display_address,
        now() AS verified_at
      FROM restaurants;
    CREATE TABLE google_places_photo_quota_v1 (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      restaurant_id uuid, quota_day date, used_count integer DEFAULT 0,
      month_key text, sku text, used integer DEFAULT 0, limit_count integer DEFAULT 0
    );
    CREATE TABLE restaurant_enrichment_sample_1000 (
      restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id),
      sample_rank integer NOT NULL
    );
    CREATE OR REPLACE VIEW restaurant_content_readiness_v1 AS
      SELECT id,0::int AS published_languages,0::int AS verified_menus,
        0::int AS approved_images,0::int AS verified_tags,
        'content_review'::text AS next_action FROM restaurants;
    CREATE TABLE google_place_manual_identity_approvals_v1 (
      restaurant_id uuid, google_place_id text, verified_at timestamptz
    );
    CREATE TABLE restaurant_source_match_checkpoints_v1 (
      restaurant_id uuid, google_place_id text
    );
  `);
  // Match real startup preflight: exactly 300 selected, with synthetic hidden padding.
  await client.query(`
    INSERT INTO restaurants(id,name_ko,road_address_ko,business_status,publication_status)
    SELECT md5('ci-cohort-'||n::text)::uuid,'CI hidden cohort '||n,'CI synthetic road '||n,'active','hidden'
    FROM generate_series(1,290) n;
    INSERT INTO whateato_release_cohort_300_v1(restaurant_id)
    SELECT id FROM restaurants WHERE name_ko LIKE 'CI hidden cohort %';
    INSERT INTO whateato_restaurant_triage_v1(restaurant_id)
    SELECT id FROM restaurants WHERE name_ko LIKE 'CI hidden cohort %';
    -- Include closed and hidden synthetic records in the 300-row cohort,
    -- while retaining the public status exclusion in the catalog gate.
    INSERT INTO whateato_release_cohort_300_v1(restaurant_id)
    SELECT id FROM restaurants
    WHERE id IN ('33333333-3333-4333-8333-333333333333',
                 '44444444-4444-4444-8444-444444444444');
    INSERT INTO whateato_restaurant_triage_v1(restaurant_id)
    SELECT id FROM restaurants
    WHERE id IN ('33333333-3333-4333-8333-333333333333',
                 '44444444-4444-4444-8444-444444444444');
    INSERT INTO restaurant_opening_hours(restaurant_id,publication_state,source_url,verified_at)
    SELECT id,'published','https://example.org/ci-synthetic-hours',now()
    FROM restaurants WHERE publication_status='published' AND business_status='active';
    INSERT INTO restaurant_opening_intervals(restaurant_id,weekday,start_minute,end_minute)
    SELECT h.restaurant_id,w,600,1200
    FROM restaurant_opening_hours h CROSS JOIN generate_series(0,6) w;
  `);
  // Local-only schema parity: CMS photo role used by current public catalog.
  await client.query(`
    ALTER TABLE restaurant_images
      ADD COLUMN IF NOT EXISTS cms_photo_role text NOT NULL DEFAULT 'gallery';
  `);
  // Explicitly human-confirmed synthetic hold; original restaurant row remains
  // present and unchanged. Pending flags may NEVER suppress public listings.
  await client.query(`
    INSERT INTO restaurant_data_quality_reviews(
      restaurant_id,issue_code,severity,review_state,evidence_ref,
      evidence_summary,reviewer_ref,reviewed_at
    ) VALUES
    ('88888888-8888-4888-8888-888888888888',
      'NAME_IDENTITY_MISMATCH','high','confirmed_hold',
      'ci://confirmed-restaurant-identity-hold',
      'Synthetic signed reviewer hold for temporary visibility regression only.',
      'ci-reviewer',now()),
    ('77777777-7777-4777-8777-777777777777',
      'ADDRESS_MISSING','medium','pending',NULL,
      'Synthetic missing road address warning; lot address exists and must be visible.',
      NULL,NULL)
  `);
  const localeCoverage=await client.query(`
    SELECT COUNT(*)::int AS labels FROM restaurant_tag_localizations`);
  if(localeCoverage.rows[0]?.labels!==64)
    throw Error('All 16 restaurant tags must have four localized labels; migration 006 not applied');
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
  // Fake local test reviewers; no real Google identities, and only approved reviews count.
  await client.query(`
    INSERT INTO whateato_review_accounts(id,google_subject) VALUES
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','ci_review_subject_0000001'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2','ci_review_subject_0000002'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3','ci_review_subject_0000003'),
    ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4','ci_review_subject_0000004')
  `);
  await client.query(`
    INSERT INTO whateato_user_reviews(restaurant_id,account_id,rating,body,moderation_status,reviewed_at)
    VALUES
    ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      5,'Synthetic approved CI review number one; not a real restaurant opinion.','published',now()),
    ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      4,'Synthetic approved CI review number two; not a real restaurant opinion.','published',now()),
    ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      3,'Synthetic approved CI review number three; not a real restaurant opinion.','published',now()),
    ('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
      1,'Synthetic unapproved CI review that must never appear in search or summary.','pending',NULL)
  `);
  // Second restaurant has three additional PENDING reviews for administrative
  // moderation: none should be counted before manual approval.
  await client.query(`
    INSERT INTO whateato_user_reviews(restaurant_id,account_id,rating,body,moderation_status)
    VALUES
    ('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      2,'Synthetic pending CI review for approve testing one; not a real opinion.','pending'),
    ('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
      4,'Synthetic pending CI review for approve testing two; not a real opinion.','pending'),
    ('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
      5,'Synthetic pending CI review for approve testing three; not a real opinion.','pending')
  `);
  // New owner-controlled public approvals. Keep only the two actually visible
  // synthetic restaurants; every other synthetic row remains private.
  await client.query(readFileSync('db/migrations/021_owner_approved_public_restaurants.sql','utf8'));
  await client.query(`
    INSERT INTO whateato_restaurant_public_approvals_v1
      (restaurant_id,is_visible,approval_source,evidence_url)
    VALUES
      ('11111111-1111-4111-8111-111111111111',true,'baseline','https://example.test/cafe'),
      ('22222222-2222-4222-8222-222222222222',true,'baseline','https://example.test/restaurant'),
      ('77777777-7777-4777-8777-777777777777',true,'baseline','https://example.test/permit-cafe'),
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',true,'baseline','https://example.test/map-1'),
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',true,'baseline','https://example.test/map-2'),
      ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',true,'baseline','https://example.test/map-3'),
      ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',true,'baseline','https://example.test/map-4')
  `);
  await client.query(readFileSync('db/migrations/050_review_i18n_texts.sql','utf8'));
  console.log('Synthetic Phase 2 fixture ready (localhost only; 6 rows; quality hold+lot fallback)');
}finally{await client.end()}
