#!/usr/bin/env node
// Dedicated integration fixture: never opens a remote database.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import pg from 'pg';
const db=new URL(process.env.DATABASE_URL||'');
assert.ok(['localhost','127.0.0.1'].includes(db.hostname),'localhost only');
assert.equal(process.env.WHATEATO_CI_LOCAL_FIXTURE,'ONLY_LOCAL_EPHEMERAL');
const client=new pg.Client({connectionString:db.toString()});
await client.connect();
try{
 await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
 await client.query(`CREATE TABLE restaurants(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ko text NOT NULL,
  road_address_ko text,
  lot_address_ko text,
  region_sido text,
  region_sigungu text,
  region_dong text,
  category_code text,
  latitude double precision,
  longitude double precision,
  location geography(Point,4326),
  business_status text NOT NULL DEFAULT 'active',
  publication_status text NOT NULL DEFAULT 'published',
  updated_at timestamptz NOT NULL DEFAULT now()
 )`);
 await client.query(`CREATE TABLE restaurant_address_localizations_v1(
   restaurant_id uuid NOT NULL REFERENCES restaurants(id),locale text NOT NULL,
   display_address text NOT NULL,source_note text NOT NULL,
   verified_at timestamptz,PRIMARY KEY(restaurant_id,locale))`);
 await client.query(`INSERT INTO restaurants(id,name_ko,road_address_ko) VALUES
 ('11111111-1111-4111-8111-111111111111','Test Cafe','Synthetic One'),
 ('22222222-2222-4222-8222-222222222222','Test Bistro','Synthetic Two'),
 ('77777777-7777-4777-8777-777777777777','Test Location','Synthetic Three')`);
 for(const f of ['003_reviews_auth_minimal.sql','004_i18n_analytics.sql',
   '007_review_moderation_audit.sql','008_restaurant_quality_review.sql',
   '010_verified_opening_hours.sql','014_bulk_content_operations.sql','015_owner_cms_roles_media.sql','016_cms_restaurant_address_media.sql','017_public_visitor_review_media.sql','018_owner_review_delete_audit.sql','019_blog_cms_editorial.sql'])
  await client.query(readFileSync('db/migrations/'+f,'utf8'));
 await client.query(`
  INSERT INTO whateato_review_accounts(id,google_subject)
  VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1','bulk-ci-google-account-1')`);
 await client.query(`
  INSERT INTO whateato_user_reviews(restaurant_id,account_id,rating,body,moderation_status,reviewed_at)
  VALUES ('11111111-1111-4111-8111-111111111111',
   'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',5,
   'Synthetic approved CI review written only for a local test database.', 'published', now())`);
 console.log('PASS: isolated bulk fixtures, six genuine migrations, no external DB writes');
}finally{await client.end()}
