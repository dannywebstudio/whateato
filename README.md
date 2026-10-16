# WhatEatO

WhatEatO is a multilingual restaurant discovery and review website focused on Korea. The production website runs on **Hostinger**, with source code managed in this GitHub repository.

## Stack
- Next.js 15, React 19, Node.js 22+
- PostgreSQL, Auth.js (Google sign-in)
- MapLibre GL, image storage integration

## Current application
- Restaurant search, map, restaurant pages and editorial/blog content
- Four supported site languages: Korean (`ko`), English (`en`), Japanese (`ja`), Simplified Chinese (`zh-CN`)
- Account and review management: `/login`, `/my-page`, `/account`
- Role-restricted owner CMS: `/admin`

## Development
```sh
npm install --no-audit --no-fund
npm run typecheck
npm run build
npm run test:mapworker
npm run dev
```

Use Node.js version >=22 and <25. Environment-specific credentials and services are required for some authenticated, database and storage workflows.

## Deployment safety
Production hosting is **Hostinger**, not Render. The repository default branch is `main`, but recent integration changes have been made on `feature/i18n-analytics-backend-v1`. **Verify the Hostinger hPanel-connected branch and redeploy status before assuming a push or merge updates production.** A successful GitHub CI run alone does not prove live rollout.

Never commit secrets, `.env` files, licensed raw datasets or private user data. Do not modify production database state during source cleanup.

## CMS refactor baseline
See [CMS refactor baseline (2026-10-16)](docs/CMS_REFACTOR_BASELINE_2026-10-16.md) for verified components, safety constraints, and the staged cleanup backlog.
