#!/usr/bin/env node
// Read-only, staging-only database contract test for WhatEatO Phase 1.5.
// Usage: WHATEATO_STAGING_DATABASE_URL=... WHATEATO_PHASE15_STAGING_ACK=I_ACK_STAGING_ONLY WHATEATO_EXPECTED_NEON_BRANCH_ID=br-... node scripts/verify_phase15_staging.mjs
import pg from 'pg';
import { performance } from 'node:perf_hooks';

if (!process.env.WHATEATO_STAGING_DATABASE_URL) {
  console.error('Missing WHATEATO_STAGING_DATABASE_URL (do not use production URL).');
  process.exit(2);
}
if (process.env.WHATEATO_PHASE15_STAGING_ACK !== 'I_ACK_STAGING_ONLY') {
  console.error('Refusing to connect without explicit staging-only acknowledgement.');
  process.exit(2);
}

if (!/^br-[a-z0-9-]+$/.test(process.env.WHATEATO_EXPECTED_NEON_BRANCH_ID || '')) {
  console.error('Set WHATEATO_EXPECTED_NEON_BRANCH_ID to your staging branch ID.');
  process.exit(2);
}

const pool = new pg.Pool({
  connectionString: process.env.WHATEATO_STAGING_DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 7000,
  idleTimeoutMillis: 2000,
});
const requiredTables = [
  'restaurant_localizations', 'restaurant_tags', 'restaurant_tag_localizations',
  'restaurant_tag_assignments', 'restaurant_menus', 'restaurant_menu_localizations',
  'restaurant_images', 'restaurant_editorial_scores', 'whateato_analytics_events',
];
function ensure(condition, message) {
  if (!condition) throw Error('FAIL: ' + message);
  console.log('PASS: ' + message);
}
let client;
try {
  client = await pool.connect();
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const branchCheck = await client.query(
    "SELECT current_setting('neon.branch_id',true) AS branch_id, current_database() AS db"
  );
  ensure(branchCheck.rows[0]?.branch_id === process.env.WHATEATO_EXPECTED_NEON_BRANCH_ID,
    'connected database is exactly the declared staging Neon branch');
  console.log('Checking database:', branchCheck.rows[0].db, 'branch:', branchCheck.rows[0].branch_id);
  const tables = await client.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name = ANY($1::text[])",
    [requiredTables],
  );
  ensure(tables.rows.length === requiredTables.length, 'all 9 migration 004 tables exist');
  const census = await client.query(
    'SELECT count(*)::int AS total, count(DISTINCT id)::int AS unique_ids, count(*) FILTER (WHERE publication_status=\'published\' AND business_status=\'active\')::int AS searchable FROM restaurants',
  );
  const {total, unique_ids, searchable} = census.rows[0];
  ensure(total >= 10000 && unique_ids === total, 'at least 10,000 unique restaurant IDs preserved');
  ensure(searchable > 0, 'published active restaurants remain searchable');
  const tags = await client.query('SELECT count(*)::int AS total FROM restaurant_tags');
  ensure(tags.rows[0].total >= 16, 'seed tag taxonomy available');
  const translated = await client.query("SELECT COUNT(*)::int AS total FROM restaurant_tag_localizations WHERE locale IN ('ko','en','ja','zh-CN')");
  ensure(translated.rows[0].total >= 36, 'multilingual tag labels available');
  const unsafePhotos = await client.query(
    "SELECT count(*)::int AS total FROM restaurant_images WHERE publication_state='published' AND (rights_status<>'approved' OR usage_rights_reference IS NULL OR rights_verified_at IS NULL)",
  );
  ensure(unsafePhotos.rows[0].total === 0, 'no unlicensed published photo metadata');
  const unsafeScores = await client.query(
    "SELECT count(*)::int AS total FROM restaurant_editorial_scores WHERE approval_state='approved' AND (verified_at IS NULL OR score IS NULL)",
  );
  ensure(unsafeScores.rows[0].total === 0, 'no unverified approved editorial score');
  const unsafeDescriptions = await client.query(
    "SELECT count(*)::int AS total FROM restaurant_localizations WHERE publication_state='published' AND verified_at IS NULL",
  );
  ensure(unsafeDescriptions.rows[0].total === 0, 'no unverified published localization');
  const unsafeTags = await client.query(
    "SELECT count(*)::int AS total FROM restaurant_tag_assignments WHERE verification_state='verified' AND (evidence_ref IS NULL OR verified_at IS NULL)",
  );
  ensure(unsafeTags.rows[0].total === 0, 'no verified tag without evidence');
  const columns = await client.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='whateato_analytics_events'",
  );
  const names = columns.rows.map(x=>x.column_name);
  ensure(!names.some(x=>/ip_address|session_id|user_id|email|fingerprint|cookie/i.test(x)), 'no identifier columns in anonymous analytics');
  const started = performance.now();
  const search = await client.query(`
    SELECT r.id::text AS id, COALESCE(l.display_name,k.display_name,r.name_ko) AS name,
      CASE WHEN sc.approval_state='approved' THEN sc.score::float8 ELSE NULL END AS editorial_score
    FROM restaurants r
    LEFT JOIN restaurant_localizations l ON l.restaurant_id=r.id AND l.locale=$1 AND l.publication_state='published'
    LEFT JOIN restaurant_localizations k ON k.restaurant_id=r.id AND k.locale='ko' AND k.publication_state='published'
    LEFT JOIN restaurant_editorial_scores sc ON sc.restaurant_id=r.id AND sc.approval_state='approved'
    WHERE r.publication_status='published' AND r.business_status='active'
    ORDER BY r.name_ko,r.id LIMIT 20`, ['en']);
  const queryMs = Number((performance.now() - started).toFixed(1));
  ensure(search.rows.length === 20 && search.rows.every(x=>x.id && x.name), 'localized search with Korean fallback returns 20 valid records');
  console.log(JSON.stringify({total, unique_ids, searchable, queryMs, note:'App-level and cold-start timings are not measured'}, null, 2));
  await client.query('ROLLBACK');
  console.log('Phase 1.5 STAGING PASS (read only, production untouched)');
} catch (err) {
  console.error(err);
  if (client) { try { await client.query('ROLLBACK'); } catch {} }
  process.exitCode = 1;
} finally {
  if (client) client.release();
  await pool.end();
}
