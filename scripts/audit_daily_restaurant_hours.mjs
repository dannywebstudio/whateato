#!/usr/bin/env node
/** Daily staging-only hours freshness review. NO paid API calls or auto-publishing. */
import pg from 'pg';
const url=process.env.WHATEATO_STAGING_DATABASE_URL;
const expected='br-autumn-pine-b36z3utm';
if(!url||process.env.WHATEATO_EXPECTED_NEON_BRANCH_ID!==expected)
 throw Error('Staging database/branch guard is required');
const client=new pg.Client({connectionString:url,ssl:{rejectUnauthorized:true}});
await client.connect();
try{
 const db=await client.query("SELECT current_database() AS name");
 console.log('DB connected for staging hours daily audit',db.rows[0].name);
 const r=await client.query(`
 INSERT INTO restaurant_hours_sync_reviews_v1(restaurant_id,review_date,source_url,source_verified_at)
 SELECT h.restaurant_id,(now() AT TIME ZONE 'Asia/Seoul')::date,h.source_url,h.verified_at
 FROM restaurant_opening_hours h
 JOIN restaurant_enrichment_sample_1000 s ON s.restaurant_id=h.restaurant_id AND s.sample_rank<=50
 WHERE h.publication_state='published'
 ON CONFLICT(restaurant_id,review_date) DO NOTHING
 RETURNING restaurant_id`);
 const pending=await client.query(`SELECT count(*)::int AS total,
 count(*) FILTER(WHERE source_verified_at<now()-interval '7 days')::int AS older_than_week
 FROM restaurant_hours_sync_reviews_v1
 WHERE review_date=(now() AT TIME ZONE 'Asia/Seoul')::date AND state='needs_source_check'`);
 console.log(JSON.stringify({newDailyReviews:r.rowCount,pending:pending.rows[0],externalApiCalls:0,autoPublished:0}));
}finally{await client.end()}
