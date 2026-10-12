# WhatEatO

Independent Korea restaurant search platform. **Hostinger Business + GitHub** preview deployment.

This is a deployable first-stage **frontend preview**, not a live nationwide restaurant database. Search is deliberately empty until the independent PostgreSQL/PostGIS database is configured and populated. Blog CMS and actual map provider follow in later phases.

## Local testing
Node.js 22:
```sh
npm install
npm run build
npm run dev
```
Open http://localhost:3000.

## Hostinger Business
In hPanel → Websites → Add Website → Node.js Web App → Import Git Repository, choose `dannywebstudio/whateato`, branch `main`, Node 22, Next.js.
Configure `NEXT_PUBLIC_LAUNCH_READY=false`; keep `DATABASE_URL` unset initially. Test `/api/health` and `/api/ready` (503 is expected before DB provisioning).

Do not commit `.env`, passwords, keys, raw licensed datasets, or personal visitor data.

**No other project code or data is used.**

## Restaurant DB / verified metadata (next phase)
- Dedicated Neon/PostGIS core schema: `db/migrations/001_core.sql`
- Import official SBIZ CSV with `scripts/import_sbiz_lite.py` (dry-run by default; no raw CSV stored)
- Estimated business hours for verified schedules only; live opening is NOT guaranteed
- AI preliminary 1–5 ratings require reviewed quality assessments from 2 distinct publishers; never present them as user reviews
- Setup instructions in `docs/NEON_SETUP_KO.md`
- `npm run test:hours` and Python unit tests are part of CI
