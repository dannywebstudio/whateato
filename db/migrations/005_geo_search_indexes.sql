-- WhatEatO Phase 3 non-destructive geo catalog optimization.
-- Coordinates are public food-service permit location fields; index does not
-- change or publish any restaurant, tag, review, location or user data.
-- Apply on staging first. A planned nationwide import should benchmark EXPLAIN.
BEGIN;
CREATE INDEX IF NOT EXISTS idx_restaurants_geo_public
  ON restaurants(latitude, longitude)
  WHERE publication_status='published' AND business_status='active'
    AND latitude IS NOT NULL AND longitude IS NOT NULL;
COMMIT;
