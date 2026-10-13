# WhatEatO — Restaurant Detail Design v1.0 OWNER LOCK
Approved 2026-10-13. Design must not change without owner instruction.
## Locked hierarchy
1. Back to results + region
2. Hero licensed restaurant photo and multi-image gallery, responsive
3. Name, short natural-language description, independently approved score when supported
4. Opening state, weekday hours, break/closures, with one concise operating-hours caveat. Reservation availability and booking buttons are excluded from public UI.
5. Verified main menu and price table, unknown prices never fabricated
6. Extended venue introduction and evidenced tags
7. Location/map with full registered address
8. Google Maps directions
9. NEW: “내 Google 지도에 저장하기” / Save to my Google Maps, directly under location/directions. This opens Google Maps place search; user must select Save in Google Maps. It MUST NOT pretend to auto-save or require granting Google account write permissions.
10. Approved user reviews and Google-login review form (photos permissible where rights/policy permit)
Languages: ko,en,ja,zh-CN.
Only AdSense monetization; no other ad/affiliate links.
Maps: MapLibre inside WhatEatO; Google Maps for external directions/place saving; no Kakao links.
Restaurant card v1.0 separate DESIGN LOCK preserved.
## Implementation distinction
The above is approved TARGET design, not a claim that all sections have passed Render visual QA. In this commit only the Google Maps save handoff under the existing detailed address section has been added. The previously approved example images/hours/stars/reviews were illustrative, not live content.

## Owner revision — Reservations excluded
- Do not show reservation availability, booking status, booking platform information, or a reservation button in restaurant cards or detail pages.
- Existing historical reservation observations may remain in nonpublic research staging; they are not user-facing and must not be interpreted as a verified booking channel.
- Add reservation UI only following a new explicit owner request and validated booking handoff.
