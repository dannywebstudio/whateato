# CMS dependency / cleanup audit — 2026-10-16

## Branch and scope
Source baseline: `feature/i18n-analytics-backend-v1`, not the repository's outdated default `main`.
This PR is a **non-destructive first-pass modularization**, not complete CMS decomposition or a production release.

## Verified CMS references
- `src/app/admin/page.tsx` imports `AdminConsole.tsx`, `owner-cms-auth` and Auth.js.
- `AdminConsole.tsx` imports `BlogEditor.tsx`, `admin.module.css` and accesses owner API routes for catalog, bulk batches, reviews and media.
- Restaurant detail, menus, verified tags, daily opening hours, visibility and cover/gallery photos share AdminConsole state. Do not delete any of these behaviors in cleanup.
- Existing `BlogEditor.tsx` is already a separate feature component. It remains unchanged.
- Review moderation and media decisions have owner-only destructive/approval actions; server role checks remain authoritative.

## First extraction
- `modules/types.ts`: CMS shared types
- `modules/restaurants.ts`: restaurant data/editor configuration and time helpers
- `modules/batches.ts`: batch types and NDJSON parsing
- `modules/reviews.ts`: review types and score labeling
- `modules/media.ts`: image-size guard and photo role label
- `modules/client.ts`: credentialed JSON API client
- `AdminConsole.tsx`: still owns states and UI tabs; now imports domain modules

## Deletion policy and remaining work
No file was conclusively proven unused from this targeted audit. **No source deletion is authorized by this audit.** Before removing files, inspect full repository tree, dynamic imports, app route auto-discovery, npm scripts, migrations, and workflow references. Do not delete older branches until deployment branch and unique commits are validated.

Next: split restaurant editor, review moderation, media and batch panels into independent React components with typed props or state hooks, in separate reviewable PRs. Add focused behavior tests for per-role permissions, catalog save, batch publish, review deletion and image upload; follow with full GitHub Actions verification.
