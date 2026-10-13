# WhatEatO Google Place Photos New — safe implementation gate

**Owner selected Places Photo API. Implementation is dormant, not live.**

Official references:
- https://developers.google.com/maps/documentation/places/web-service/place-photos
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/maps/billing-and-pricing/pricing

## Architecture
1. Verify official permit -> NAVER exact name/road match -> manual verification of Google Place ID; existing IDs-only results are only candidates.
2. On user-visible photo request, when authorized: retrieve transient Place Details photo metadata and photo author attributions; neither photo resource names nor photos persist.
3. Photo Media service supplies image bytes on demand, with no-store and server-only API key.
4. Card and detail must include nearby visible Google Maps attribution, photographer name/link (and source photo link where available). Google Places content must **not** be displayed on the existing MapLibre map markers/infowindows.
5. Do not represent Places Photo data as WhatEatO-licensed `restaurant_images` or mark its `rights_status='approved'`. Build a separate transient photo rendering path.
6. Photos may be absent, may be irrelevant, may have expired references; fail without a fake photo.

## Costs and controls
- Billing events may include Place Details Photos and Place Photos, whose free usage caps are metered separately. No cost guarantee without checking existing month-to-date billing across all services sharing project.
- Site visitors can trigger unlimited photo media calls unless server-side persistent quota reservation is in place. Therefore **default OFF**.
- Both environment variables are required to enable: `WHATEATO_GOOGLE_PHOTO_APPROVED=true` and `WHATEATO_GOOGLE_PHOTO_QUOTA_GUARD_READY=true`; setting these is forbidden until a durable transactional per-SKU monthly/daily quota guard has been implemented and tested.
- Keep server-only `GOOGLE_PLACES_API_KEY`; never publish it to `NEXT_PUBLIC_*` or redirect requests including the key.
- Launch first three places only after verifying Google IDs and author attribution requirements in UI; reserve a safety margin below free quota.
- No regular polling, background prefetch, photo-name caching or legacy Maps scraped uploads.

**Scope**: server adapter foundation only; no API billed and no Render env change from this commit.
