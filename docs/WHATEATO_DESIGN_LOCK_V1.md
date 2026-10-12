# WhatEatO — DESIGN LOCK v1.0 (OWNER APPROVED)

**Status: LOCKED — change only when the owner explicitly requests a design change.**
**Locked on: 2026-10-12 (KST).**
**Baseline commit: 1eaf05c10cb634b0f3b4025a9ba7d04f00ce9487.**
**Recovery snapshot branch: baseline/whateato-design-v1-locked.**

## Scope: what must NOT change automatically

The owner approved the appearance of the existing WhatEatO site and expressly instructed: "지금 현재 디자인 수정금지, 픽스해, 여기서부터 디밸롭하면서 추가해나갈꺼야".

- Overall minimalist white background; do not redesign, recolor, switch fonts, add hero graphics, or change whitespace/grid spacing.
- Centered WhatEatO wordmark, search field, 12 quick-filter chips and approved more-filter behavior.
- Header WhattoEatO logo and only Map / Blog top navigation; Search is intentionally absent from the header. Home logo still returns to the search homepage.
- Right-aligned country/language dropdowns.
- Existing Home / Search results / Map / Blog routes stay distinct.
- Existing responsive styling and typography remain the default for desktop and mobile.
- No replacing the approved design with an alternative template, dashboard, card style, marketing hero, or layout.
- GitHub Pages preview must remain visually consistent with the approved Next.js UI. Pages serves a static snapshot; that fact alone does not justify a new design.

## What development IS allowed without redesign

- Import more validated restaurants, add safe data pipelines, improve deduplication, validate coordinates.
- Search query behavior, result ranking, speed, indexing, region support, and APIs.
- Map data and pins, verified details, optional content/reviews supported by reliable evidence, SEO, accessibility and performance.
- Bug fixes that do not change the approved visual appearance or the existing user-facing hierarchy.
- Add new capabilities within the current layout as specifically requested by the owner.

**No design change is implicitly approved by a feature request.**
If a planned feature requires visual changes, state exactly which visual section would change and get owner approval first. Only after that may the lock baseline be deliberately updated in a separate reviewed commit/PR.

## Automated verification

The workflow at .github/workflows/design-lock.yml runs scripts/check_design_lock.py. It compares immutable baseline objects with the current versions of:

- src/app/globals.css
- src/app/page.tsx
- src/app/layout.tsx
- src/components/Header.tsx
- src/components/SearchBox.tsx
- preview/index.html
- preview/styles.css

In the preview JS, only appearance-defining functions are frozen:
renderHeader, renderFooter, formHtml, renderHome, renderSearch, renderMap, renderBlog.

This allows new data-fetching, search and map logic while preventing silent design drift in existing sections. The lock does not pretend to be a browser screenshot comparison: a newly added CSS/JS file could still visually change the site, so code review must follow this policy too.

## Recovery

The baseline snapshot branch points to the approved UI, not to an experimental layout.
For targeted recovery, use the baseline versions of the affected approved files. Do not roll back restaurant data, database schema, or unrelated features.

The lock checker must not be removed, weakened, or automatically rebased without explicit approval of the owner.

## GitHub governance

Design Lock CI provides automated detection of unauthorized changes. If automatic merge blocking is required, configure branch ruleset/branch protection to require the WhatEatO Design Lock check. This is repository-admin settings and is separate from CI itself.

## Current data limitations, not design decisions

Current GitHub Pages preview is a static mirror powered by a read-only verified Neon snapshot of 10,000 permit-active restaurants. Permit status does not prove "open now"; 12 lifestyle filters should not fabricate matches where tags lack validation. Preserve these evidence rules even when implementing new features.
