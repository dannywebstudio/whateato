# WhatEatO Brand + Country-Language Synchronization v1 (2026-10-14)

## Owner-approved behavior
- Visitor's country is detected once per browser tab session (prefer validated country code from edge/CDN; otherwise transient IP Geo lookup; timezone + browser region only as fallback).
- Country → automatic language mapping:
  - KR: Korean (`ko`)
  - JP: Japanese (`ja`)
  - CN: Simplified Chinese (`zh-CN`)
  - Any other recognized nation, including US/GB/CA/AU/TW: English (`en`).
- Dropdown changes to country immediately set the corresponding language, homepage description, Map/Blog links, search placeholder, filter labels, global footer, and document language. `/search`, `/map`, `/blog`, `/restaurant/[id]` preserve the URL's existing query parameters while updating `hl` on explicit change.
- Visitors can still manually choose among the 4 supported languages independently of the country. A subsequent manual country change clears that language override and maps the new country's default language again.
- Shared SEO-deep-link locale `?hl=...` is honored on first access, even when the IP country is different, unless an explicit user preference was set in the same tab.
- Manual overrides live in sessionStorage (tab session); UI preferences are mirrored to `we_country` and `we_language` localStorage for subscribed components. A fresh tab normally re-detects the country rather than reusing a stale manual choice.
- Flag to the left of country selector follows ISO 3166 country value. Unsupported country in the preset dropdown is dynamically inserted with the appropriate code/name and matching flag. FlagCDN image failure falls back to a flag emoji. Browser/edge country detection is best effort (VPN, blocked IP lookup, proxy, or missing headers may return fallback).
- Geo API `/api/visitor-country` is dynamic and private no-store. No visitor IP or location is inserted into WhatEatO's DB. Transient third-party `ipwho.is` lookup sends the client IP only if no trusted edge geo header exists; feature flag `WHATEATO_GEOIP_LOOKUP_ENABLED=false` disables it. A SHA-256 in-memory cache limits repeated calls and the free daily budget. Privacy draft includes explicit notice.
- Visual identity keeps exact brand spelling `WhatEatO` and the existing ink-black What / green EatO palette. **What** now has a crafted slanted W and fine brush-like green underline, reused in Header and homepage Hero. No image/font assets introduced.

## Release precautions
- Source branch `feature/cms-admin-ui-v1`, staging PR #8. Deploy **only** to `whateato-cms-preview`. No production service, Neon production or `main` changes until owner separately authorizes.
- QA script `scripts/test_home_design_browser.mjs` verifies mocked country GeoIP rules, four language choices, locale sync, flags, manual override/reload, search routing, SEO links, logo, keyboard-friendly filter hover & reduced motion, plus 1440/390/360px screenshots.
- Existing globally inherited Design Lock tests may fail due previously outdated snapshot baseline. This user request explicitly authorizes only the header/logo and country-related behavior. Do not silently expand the authorized change to restaurant cards/maps/details.
