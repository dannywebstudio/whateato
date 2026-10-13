-- WhatEatO Phase 4.1: idempotent source-data quality review inventory.
-- Adds ONLY PENDING findings; does not delete, merge, hide or "verify" any venue.
-- Re-running never resets dismissed or human-confirmed review decisions.
BEGIN;
INSERT INTO restaurant_data_quality_reviews
  (restaurant_id,issue_code,severity,review_state,evidence_summary)
SELECT id,'COORDINATES_MISSING','medium','pending',
  'Permit dataset is missing either latitude or longitude. Map marker must not be inferred from address alone.'
FROM restaurants
WHERE latitude IS NULL OR longitude IS NULL
ON CONFLICT(restaurant_id,issue_code) DO NOTHING;

INSERT INTO restaurant_data_quality_reviews
  (restaurant_id,issue_code,severity,review_state,evidence_summary)
SELECT id,'ADDRESS_MISSING','high','pending',
  'Both road and lot addresses are missing from the permit dataset; operator review needed before claiming a physical address.'
FROM restaurants
WHERE NULLIF(BTRIM(road_address_ko),'') IS NULL
  AND NULLIF(BTRIM(lot_address_ko),'') IS NULL
ON CONFLICT(restaurant_id,issue_code) DO NOTHING;

-- Same name and identical address is only a POSSIBLE duplicate; separate
-- permit source identifiers can represent valid separate legal establishments.
-- Keep both source rows and all original UUIDs until a reviewer validates.
WITH normalized AS (
  SELECT id,lower(BTRIM(name_ko)) AS name,
    COALESCE(NULLIF(BTRIM(road_address_ko),''),
             NULLIF(BTRIM(lot_address_ko),'')) AS address
  FROM restaurants
),
candidates AS (
  SELECT n.id
  FROM normalized n
  JOIN (
    SELECT name,address
    FROM normalized
    WHERE address IS NOT NULL
    GROUP BY name,address HAVING COUNT(*)>1
  ) d ON d.name=n.name AND d.address=n.address
)
INSERT INTO restaurant_data_quality_reviews
  (restaurant_id,issue_code,severity,review_state,evidence_summary)
SELECT id,'POSSIBLE_DUPLICATE','medium','pending',
  'Restaurant name and exact normalized address match another registry row; source license identity must be checked before merging.'
FROM candidates
ON CONFLICT(restaurant_id,issue_code) DO NOTHING;
COMMIT;
