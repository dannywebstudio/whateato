# WhatEatO — 2026-10-13 Detail + DB staging checkpoint

## Staging database (read-only live Neon query)
Project aged-wildflower-47196131, test branch br-autumn-pine-b36z3utm.
- restaurants 10,000
- published locale rows 12 (3 restaurants × 4 locales)
- locale rows in review 28
- published menu rows 8; draft menus 16
- approved/published licensed photos 0
- approved independent editorial ratings 0
- pending data-quality review issues 377
These are database rows/issues rather than counts of fully enriched restaurants.

## Detail UI development branch
- Responsive photo gallery displays up to six rights-approved DB images, and keeps zero-photo venues image-free.
- First photo is prioritized and remaining photos lazy-loaded.
- Google Maps directions replace Kakao Maps on restaurant detail, and the live test expectation was updated.
- Existing restaurant name, official permit address fallback, published verified menu, description, tags, optional independently approved score, and approved reviews remain intact.
- No changes to global DESIGN LOCK v1 styles, homepage, main, production database, or domain.

## Release status
GitHub commit exists but new commits have not yet passed independently observed end-to-end Render QA. No public launch or production migration. Image storage is not configured with real licensed photos. Do not label every permit record verified/open. 377 issues are pending, not confirmed holds.

## Remaining acceptance gates
- CI TypeScript, HTTP/Postgres fixtures, and real Chromium PC/mobile PASS on latest branch.
- Google Maps links work on browser and mobile; default map service may vary by region.
- Rights-cleared photo upload and durable storage; verify both photo and no-photo states.
- Research queue identity/operation/menu/4-locale checks, documented approval before additional publishing.
- Production schema upgrade and rollback plan before merge.
