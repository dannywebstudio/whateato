# Owner-approved WhatEatO public catalog rollout

**Current public restaurants:** 광화문 미진, 청진옥, 우래옥 (three). Importing,
updating or bulk-publishing other restaurant records MUST NOT expose them.

## Pre-deploy sequence (mandatory)

1. Confirm which Neon branch Hostinger's secret `DATABASE_URL` actually
   references. **Do not copy or disclose the connection string**.
2. On THAT branch apply ONLY additive
   `db/migrations/021_owner_approved_public_restaurants.sql`.
   Verify table exists and the initial approved rows are **exactly three**,
   matching the UUIDs in that migration. Never seed the entire cohort.
3. Merge and deploy PR after `build`, `phase2-http`, `bulk-ci`, and
   `WhatEatO Design Lock` all pass.
4. Preserve `NEXT_PUBLIC_LAUNCH_READY=false`,
   `WHATEATO_PREVIEW_50_ONLY=true`,
   `WHATEATO_PREVIEW_THREE_TEXT_ONLY=true`,
   `WHATEATO_SEO_PUBLIC_ENABLED=true`, and
   `NEXT_PUBLIC_SITE_URL=https://whateato.com`.
5. Live read-only QA: `/api/ready`, public search and map 3 venues only;
   `/sitemap.xml` exactly homepage + 3; `/robots.txt` allows only those
   3 under /restaurant/; unapproved known UUID returns 404.
6. For owner CMS, only after Google OAuth, `whateato_admin_accounts` owner
   grant, migration 014–021 and appropriate storage/security checks are ready:
   set `WHATEATO_OWNER_CMS_ENABLED=true`. Check `/admin` owner login.
7. Owner workflow: create/edit draft -> approved content batch publish ->
   select restaurant -> paste verified HTTPS evidence URL -> click **검증 완료 · 공개 승인**.
   Server validates publication, Korean and English descriptions, menus, tags,
   coordinates, verified hours and no C/held status. This changes public search,
   map, detail, robots and sitemap without GitHub redeploy.
8. To remove a restaurant use **공개 취소 · Sitemap 제외**. Blog workflow
   already requires owner review/publish and auto-removes unpublished articles.

## One-time safety SQL (read-only)
```sql
SELECT restaurant_id::text,approval_source,is_visible
FROM whateato_restaurant_public_approvals_v1
ORDER BY restaurant_id;
```

Expected immediately after migration: only the original three, all `is_visible=true`.

## Rollback
Before new code deployment, restore the previous application version if necessary.
Do not drop the approval table or delete the prior restaurant DB. If the new app
fails its prestart guard, confirm migration has run on the exact Hostinger branch
rather than disabling the guard or broadening publication.
