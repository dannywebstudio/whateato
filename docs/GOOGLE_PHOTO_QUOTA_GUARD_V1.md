# Google Photos staging zero-spend controls
- Staging table `google_places_photo_quota_v1` has an atomic UPDATE-based quota reservation by month + SKU. Both SKU limit rows are absent by default, so all photo calls denied.
- No photo route is enabled. The source module is dormant unless both approval environment variables explicitly enabled; neither was changed.
- A Google candidate Place ID alone is not verified identity. Require explicit reviewer confirmation of Google place identity before service invocation.
- All vendor Place Photo metadata and photo media are separately metered; a request reserves budget first, and unsuccessful upstream calls still count.
- Do not claim a DB counter enforces $0 across other Google Cloud services, clients, or Google monthly billing. Set Google Cloud API quotas plus billing alerts as a separate defense.
- No existing public restaurant gate is weakened. Under current staging preview all 3 are still hidden because no reusable photos are approved. Future Google-hosted photos need a separate visible attribution component and cannot be stored as approved local rights images.
