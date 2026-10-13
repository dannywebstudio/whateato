# WhatEatO official permit reconciliation — geographic priority v1

Owner-approved precedence (2026-10-13):

1. 서울특별시
2. 인천광역시
3. 경기도 — nearest to Seoul municipal boundary first
4. 부산광역시
5. 경상북도 경주시
6. 대구광역시
7. Other areas, ordered deterministically.

## Requirements

- The ordering applies to **WhatEatO source records** when determining which restaurant permits to verify first. It does **not** imply that the government OpenAPI supports geographic filters or sorted results.
- The government's general-restaurants OpenAPI has been verified to support paginated scanning, but filtering by `MNG_NO` was not established. Do not claim API page order matches the prioritization.
- A true Gyeonggi distance order requires a verified Seoul administrative-boundary geometry and coordinates (PostGIS or equivalent). **Do not substitute Seoul City Hall distance while calling it boundary distance.** Until these are supplied, treat Gyeonggi distance as pending and use a stable deterministic interim order.
- No restaurant is marked closed or deleted based solely on geography, absence from an incomplete government scan, or a failed match.
- Deletion remains disabled; authoritative exact management number and definitive official closure state/date must be established in a full-enough verified source.
- Current staging snapshot (2026-10-13): all 10,000 restaurant records are tagged 서울특별시, so 서울 will exhaust the existing catalog.

## Stable source record priority query

```sql
SELECT id, sbiz_source_key, region_sido, region_sigungu,
       latitude, longitude
FROM restaurants
WHERE sbiz_source_key LIKE 'localdata:%'
ORDER BY
 CASE
  WHEN region_sido IN ('서울특별시','서울') THEN 1
  WHEN region_sido IN ('인천광역시','인천') THEN 2
  WHEN region_sido IN ('경기도','경기') THEN 3
  WHEN region_sido IN ('부산광역시','부산') THEN 4
  WHEN region_sido IN ('경상북도','경북') AND region_sigungu LIKE '경주시%' THEN 5
  WHEN region_sido IN ('대구광역시','대구') THEN 6
  ELSE 7
 END,
 -- For Gyeonggi, insert an independently validated Seoul-boundary distance here
 -- when a municipality boundary geometry is available.
 region_sido COLLATE "C",
 region_sigungu COLLATE "C",
 sbiz_source_key COLLATE "C";
```

This ordering controls target processing, not API acquisition. In paginated scanning of a dataset without usable regional filters, an index of official permit numbers must be built to resolve targets in this order without making 10,000 independent API requests.
