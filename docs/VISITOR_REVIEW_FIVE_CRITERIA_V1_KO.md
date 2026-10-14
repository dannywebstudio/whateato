# WhatEatO visitor reviews — 5-criteria + food photos (staging release)

**Scope:** Only the already-approved restaurant detail "Visitor reviews / 방문 후기" region,
plus existing Admin CMS moderation cards and required APIs/database. Global-first English,
localized Korean/Japanese/Simplified Chinese. No change to public header, hero, map, footer,
restaurant gallery or card layout.

## Reader experience
- Google login to submit/edit/delete one review per restaurant.
- Five criteria: Food & taste (required), Service, Tourist friendliness, Value for money,
  Cleanliness. All 1–5 stars. Unassessed optional criteria are excluded from the arithmetic
  mean, never treated as zero. An example (5,4,N/A,3,5) gives **4.3**.
- The official WhatEatO displayed visitor rating averages the **individual approved
  review averages**; legacy single-star reviews retain their original score. The old
  smallint `rating` field stores a rounded compatibility value for legacy readers and is
  NOT the new authoritative one-decimal rating.
- Review 30–1500 characters, food photos up to five total, each JPG/PNG/WebP ≤3 MB.
  To control abuse, up to 20 photo uploads per account in a rolling 24-hour window.
  Photos are decoded, oriented, downscaled to fit 1200×1200, EXIF stripped,
  and encoded WebP in private, branch-scoped Neon S3 object storage.
- A visitor attests they are allowed to publish their images. Media stays private until
  moderator *sees each attached photo* and explicitly checks the confirmation checkbox.
  Only approved review+photo rows serve publicly; owner can privately preview pending.
- Editing the review resets its moderation status and any formerly approved photos to
  pending, hiding them until another review. Author can remove their own photo and review.
- Review photo deletion detaches private URLs immediately and performs best-effort
  S3 removal; failed deletions stay in durable `whateato_review_photo_cleanup`. Server
  operators can invoke `scripts/purge_review_photo_queue.mjs` with explicit ACK.
  This is NOT an automatic daily job.

## Database + permission controls
- Existing migration 014 already defines category rows, five review-photo metadata
  positions and average view. New additive migration 017 adds a durable cleanup queue.
  It was applied to **Neon staging branch** `br-autumn-pine-b36z3utm` only.
- No additional personal data, Google email, IP, user profile or OAuth token is stored.
  No raw images stored in PostgreSQL.
- Author-only signed session on create/edit/own-photo/delete; exact canonical Origin
  required for writes, bounded JSON/multipart data, native MIME checks and Sharp decoding.
  Moderation API requires owner/moderator role via same-origin session BFF; reviewed
  photos can only be obtained by moderator or original author before publication.
- Moderation audit preserved. Approved public score excludes pending/rejected items.
- The admin queue shows five criteria and thumbnail previews; text alone cannot be
  approved when pending photos exist without the explicit photo-confirmation flag.
- A previously published review that an author deletes keeps a minimal moderated audit
  tombstone, not their original narrative text. Media metadata and scores are detached.

## Test evidence + rollout
- CI PostGIS16 + real Next HTTP: anonymous write forbidden, forged Origin rejected,
  category score validation, null-score arithmetic, private photo URL rejects before
  approval, moderator photo-confirmation gate, category/photo activation on approval,
  edited review re-moderation, safe photo cleanup queue on author delete, legacy rating
  compatibility. Existing bulk CMS/roles smoke suite remains in place.
- Normal Next production build and typecheck required PASS.
- **Staging only:** https://whateato-cms-preview.onrender.com/restaurant/<restaurant-uuid>?hl=en
  (open a published test restaurant from /search on the preview).
- Google owner bootstrap stays disabled. Real signed-in user photo upload and responsive
  360px/390px/1440px visual acceptance still require a controlled operator browser QA
  after the deployment, before release to the live service or main branch.
- Existing older design-lock baseline check and Phase 2 fixture check may flag unrelated
  inherited issues. Do not disable these gates without owner approval.
