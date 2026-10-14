# WhatEatO Blog Category Tree v1 — 2026-10-14

## Approved starting taxonomy
- **맛집** / Restaurants (`restaurants`): root category.
- **여행** / Travel (`travel`) with:
  - 교통 정보 / Transportation (`transportation`)
  - 축제 정보 / Festivals & Events (`festivals`)
  - 추천 쇼핑 아이템 / Shopping Recommendations (`shopping-picks`)
  - 지역 명소 / Local Attractions (`local-attractions`)
- **K-Beauty item** / K-Beauty Items (`k-beauty`) with:
  - 올리브영 / Olive Young (`olive-young`)
  - 다이소 / Daiso (`daiso`)
  - 성형외과 후기 / Plastic Surgery Reviews (`plastic-surgery-reviews`)
  - 향수 / Perfume (`perfume`)

English-first international storefront, labels stored in multilingual JSON (en, ko required; ja, zh-CN optional), Korean editorial labels preserved.

## CMS workflows
Owner: /admin → 블로그 콘텐츠 → 카테고리 관리 (no article creation required).
Owner can create an additional **root** or a **child** under any active root; rename translations, change numeric order, move an empty-root/leaf safely, and activate/deactivate categories. Slug is immutable to protect URLs and preexisting publication snapshots. Categories with active children cannot be deactivated; roots with children cannot be nested; up to 200 categories and exactly two levels. Editors can list and choose *active* categories but cannot change taxonomy. Moderators cannot access blog CMS.
Existing legacy 019 category codes (food-guides, neighborhoods, korean-food, dining-tips, food-culture) remain inactive, but preserved under Restaurants for backwards compatibility, NOT hard-deleted or reclassified. Existing live snapshots remain accessible.

Post editor: dynamic group selection, root or child. Draft save / owner publish both validate that the category (and its root) is active. Root category pages show articles in that category plus all its children; child pages show only that category's articles. Public listing renders CMS localized category names and tags; article breadcrumb shows root → child. No code edits or redeploys required for later category additions. No sample or fabricated posts inserted.

## Rollout and QA
- Migration `db/migrations/020_blog_category_tree.sql` creates category table, seeds 3 roots + 8 child categories and 5 archived legacy categories, drops the old hardcoded CHECK, applies a database FK to the stable slug, and switches draft default to `restaurants`.
- This is an **additive, staging-only** migration. `feature/cms-admin-ui-v1` and Draft PR #8. No main branch merge or original Render production deploy.
- CI validates initial 3+8 nodes, nested category filtering and localized display, owner-only creation/update/activation, CSRF denial, unique slugs, two-level hierarchy, no orphaning and no draft assignment of archived category, alongside blog publish and Chrome responsive tests.
- **Editorial quality:** Category names alone do not constitute independently verified product, medical or tourism claims. Plastic Surgery Reviews will require genuine reviews/evidence in published articles; nothing is fabricated by category setup.
