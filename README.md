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
