# WhatEatO Bulk Content Operations v1 — Backend (Global First / Design Lock)

**Status: isolated implementation branch, NOT released.** No main/Render/staging/production writes and NO existing UI modifications were performed by this feature.
Starting data: ~10,000 restaurant permit records. Target: 100k+ without loading whole catalogs into memory.

## Immutable rules
- **Global First:** Korea travel by international visitors, **English canonical first**. Other locale publication in a batch is rejected unless an English published profile already exists or the batch includes it. Language-specific content remains editable in four locales (en, ja, zh-CN, ko).
- **UI Design Lock:** Do not change user-facing React pages, styles, hero, search cards, map or mobile layout in this backend release.
- **Evidence:** Public descriptions/menus/tags/hours require review; never synthesize prices, ratings, rights or operating statuses. Data is permit-based, not live verification.
- **Deletion:** No hard deletion of restaurant permit rows or user reviews through bulk operations. `visibility_hide` uses the already-enforced human `confirmed_hold` gate; `visibility_restore` removes **only that admin-owned hold** and cannot override other closure/quality flags.
- **Disabled by default:** `WHATEATO_BULK_ADMIN_ENABLED` is off without explicit staging rollout and migration. Token access is server-to-server only, NOT a browser editing interface.
- **Review privacy:** Admins cannot edit submitted visitor review scores/body. Existing moderation API stays independent.

## Architecture
```text
NDJSON stream / future owner admin CMS (server only)
   -> POST /api/v1/admin/bulk/batches [idempotency key]
   -> POST /.../{id}/items (max 50 validated items/request, 512 KiB)
   -> POST /.../{id}/actions submit -> review -> approve (explicit batch UUID)
   -> POST /.../{id}/actions apply (20 records/transaction with savepoints)
   -> existing published localization/menu/tag/hours/quality tables
   -> existing Search / Detail / Map readers (no UI changes)
```

Migrations: `db/migrations/014_bulk_content_operations.sql` is additive. Creates:
- `whateato_bulk_batches`, `whateato_bulk_items` with unique client/source keys and indexed review queues
- `whateato_bulk_audit` with append-only action records (no cookies/IP/email/review body)
- `whateato_bulk_menu_keys` mapping stable restaurant menu keys for locale/idempotent upserts
- **Future, not activated:** `whateato_review_category_scores`, `whateato_review_photo_assets`, category-average view. These do NOT change legacy review scoring, upload endpoints or public ratings.

Workflow state machine:
```text
draft --submit--> review --approve--> approved --apply--> processing
   |                 |                                      |
   +----cancel-------+--reject--> rejected                   +--> completed
                                                              +--> completed_with_errors
```

- Validation happens before staging, and is repeated via constraints/foreign keys at apply.
- A batch can contain up to **10,000 change items**. A network call accepts 50 items; execution processes 20 per transaction.
- Source keys and batch client keys are unique and idempotent. Replaying an identical ingestion is harmless; conflicting replay returns HTTP 409.
- Batch row lock serializes execution. Each item has a SQL savepoint; errors mark that item failed, never partially modify a restaurant, and cannot block valid siblings.
- No retries of failed items within completed batches: make a corrected new batch with a new client key.
- Reading batches/items uses **keyset cursors**, never deep OFFSET.
- English-first readiness check occurs at **approval**, not ingestion (draft translation packets may be incomplete).
- No hard delete, automatic approval, or unreviewed publish path.

## Available data operations
| Kind | Bounded input and output |
| --- | --- |
| `localization` | One locale, display name <=45, short intro 15–150, full intro <=1200, source note; publishes only after batch approval |
| `localization_unpublish` | Moves one localized profile to draft (reversible) |
| `menu` | Stable menu key, 1 locale, name <=24, optional price, evidence HTTPS, position; published after approval |
| `menu_unpublish` | Marks one keyed menu draft, preserves record |
| `tag` | Assign/remove verified catalog tag with evidence on verification |
| `hours` | 7 days, 0–3 nonoverlapping daytime intervals per day, Asia/Seoul, evidence URL; supports daily closure and split breaks |
| `visibility_hide` | Requires explicit `confirm_hide:true` and evidence, uses human-review visibility gate |
| `visibility_restore` | Removes only a hold owned by this workflow |

Current weekly hours schema does not represent an interval crossing midnight directly. Split overnight hours into adjacent-day intervals after verification; reject misleading times instead of guessing.

## Security + release checklist
1. Keep `WHATEATO_BULK_ADMIN_ENABLED=false` (or unset) on current Render until staging schema + full tests + owner release approval.
2. Backup **Neon staging**, attest correct branch, apply migration 014 to staging **only**. Never run seed scripts on Neon.
3. Enable only with `WHATEATO_BULK_ADMIN_TOKEN` 32+ random characters from the server secret manager, HTTPS only. Token MUST NOT be prefixed `NEXT_PUBLIC_`; owner browser never sees it.
4. Require admin IP/origin-aware edge rate limits and request audit logs before internet exposure. Bearer tokens are for trusted automation; Google-admin browser sessions will require their own role-based, CSRF-protected proxy when the owner CMS UI is separately authorized.
5. Run PostgreSQL CI fixture + real HTTP tests: bad auth, cross-origin, replay, conflicting item key, English gate, per-item failure rollback, reversible hide, and review category average.
6. Staging only: submit and manually approve a **small evidence-backed** batch; verify rendered Search/Detail/Map and zero layout change.
7. Production deployment requires separately approved migration, backup, operational monitoring and rollback plan. Do not merge this feature directly to Render's watched branch without these gates.

## Example commands (once a staging-only batch has been created)
Environment variables: `WHATEATO_ADMIN_API_ORIGIN`, `WHATEATO_BULK_ADMIN_TOKEN`, and explicit matching acknowledgement.

```bash
WHATEATO_BULK_IMPORT_ACK=<batch-uuid> node scripts/import_bulk_ndjson.mjs <batch-uuid> data.ndjson
WHATEATO_BULK_EXECUTE_ACK=<batch-uuid> node scripts/run_bulk_batch.mjs <batch-uuid>
```

Import does **not** submit or approve. Runner does **not** approve and refuses mismatched acknowledgements. Neither stores image bytes in Render, GitHub, or Neon.

## Still separate implementation gates
- Browser-visible owner edit button, role-based session/2FA, multi-admin approvals and CMS forms.
- Photo upload API, private object storage + WebP decoding/optimization, EXIF removal, scan + image rights and publication activation.
- Photo carousel and any related frontend changes are explicitly outside DESIGN LOCK until owner request.
- Five-category visitor-review submission UI + migration of existing overall rating rules; current new normalized tables are staging schema only. Separate approval needed for public score aggregation.
- High-volume import tooling should additionally support operator-facing error exports, per-field revision history and media jobs before scaling beyond the initial 10k catalog.

**Guardrail:** this v1 is a real backend foundation and controlled bulk publishing API, not a claim that the finished admin dashboard/media upload/review scoring UX exists.
