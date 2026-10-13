# WhatEatO Three-source Restaurant Reconciliation v1

Status: implementation foundation on feature/i18n-analytics-backend-v1. No staging write, no publication, no deployment approval.

## Inputs / authority
1. **Official government permit**: stable registry identity, address and closure/revocation status. Closure signals hold the record; raw registry may contain stale/duplicate businesses.
2. **NAVER Search Local**: transient name + full road-address cross-check. Do not persist API result fields. One weak district match is insufficient; multiple candidates need human review.
3. **Google Places API (New)**: currently only the free Text Search Essentials (IDs Only) probe is authorized, field mask `places.id`. A Place ID candidate is **not** evidence that name, street address, category, photos, rating, or menu matches. No auto-upgrade to paid SKU. Existing Google map display (MapLibre) must not be populated with Google Places licensed data absent a policy check.

## Pipeline
```
Existing Seoul 1,000 sample (staging)
   -> official permit status / address anchor
   -> transient NAVER exact name + full address comparison
   -> Google Place ID-only connectivity/candidate lookup (optional)
   -> reconcileIdentity => HOLD / REVIEW / CANDIDATE
   -> evidence review & source/rights assessment
   -> enrichment_v1 inspect -> draft-only stage (staging, explicitly approved)
   -> independent QA approval -> public catalog existing verified gates
   -> unchanged Restaurant Card Design v1.0 / Detail Design v1.0
```

## Hard operational gates
- No DB cleanup/deletion/merge without separate owner approval.
- No production write, PR merge, or changing locked UI without approval.
- No Google paid fields; default budget zero paid requests, max one request in probe.
- No automatic daily jobs or bulk API collection until owner approves scope.
- API results cannot be cached or republished without explicit legal permission, attribution/usage policy review.
- No AI-fabricated review averages, menus, business hours, photos or approvals.
- Publish name/address from official registry only after identity QA; publish other elements only when independently sourced and approved.
- Photos require explicit reusable rights; menus, tags, blurbs require individual evidence and QA.
- Existing `restaurant-catalog.ts` already hides content lacking published/verified/approved states.

## Completion criteria for next implementation increment
- Persist only first-party verification decisions, provenance and auditor judgments, not third-party raw result payloads.
- Build bounded 20-place offline/CI test on sanitized fixtures, then optional manual staging dry-run.
- Measure exact vs ambiguous vs not found and compare official closure flags.
- Operator approval before increasing to 1,000 or publishing a restaurant.
