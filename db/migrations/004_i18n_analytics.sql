-- WhatEatO Architecture v1.4: multilingual enrichment + privacy-minimal analytics
-- Apply manually to the dedicated WhatEatO PostgreSQL DB after reviewing 001/002/003.
-- No restaurant rows are altered or assigned fabricated ratings.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS restaurant_localizations (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('ko','en','ja','zh-CN')),
  display_name text NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 300),
  short_description text CHECK (char_length(short_description) <= 500),
  full_description text CHECK (char_length(full_description) <= 5000),
  publication_state text NOT NULL DEFAULT 'draft' CHECK (publication_state IN ('draft','review','published','rejected')),
  source_notes text CHECK (char_length(source_notes) <= 1000),
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (restaurant_id,locale),
  CHECK (publication_state <> 'published' OR verified_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_localized_restaurant_public
  ON restaurant_localizations(locale,restaurant_id) WHERE publication_state='published';

CREATE TABLE IF NOT EXISTS restaurant_tags (
  code text PRIMARY KEY CHECK (code ~ '^[a-z][a-z0-9_]{1,63}$')
);
CREATE TABLE IF NOT EXISTS restaurant_tag_localizations (
  tag_code text NOT NULL REFERENCES restaurant_tags(code) ON DELETE CASCADE,
  locale text NOT NULL CHECK(locale IN ('ko','en','ja','zh-CN')),
  label text NOT NULL CHECK(char_length(label) BETWEEN 1 AND 90),
  PRIMARY KEY(tag_code,locale)
);
CREATE TABLE IF NOT EXISTS restaurant_tag_assignments (
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tag_code text NOT NULL REFERENCES restaurant_tags(code) ON DELETE CASCADE,
  verification_state text NOT NULL DEFAULT 'proposed' CHECK(verification_state IN ('proposed','verified','rejected')),
  evidence_ref text CHECK(char_length(evidence_ref) <= 700),
  verified_at timestamptz,
  PRIMARY KEY(restaurant_id,tag_code),
  CHECK(verification_state <> 'verified' OR (evidence_ref IS NOT NULL AND verified_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_verified_tag_lookups
  ON restaurant_tag_assignments(tag_code,restaurant_id) WHERE verification_state='verified';

CREATE TABLE IF NOT EXISTS restaurant_menus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  price_krw integer CHECK(price_krw BETWEEN 0 AND 100000000),
  position smallint NOT NULL DEFAULT 0,
  publication_state text NOT NULL DEFAULT 'draft' CHECK(publication_state IN ('draft','published')),
  evidence_ref text CHECK(char_length(evidence_ref) <= 700),
  price_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (publication_state <> 'published' OR evidence_ref IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_restaurant_menu_public
  ON restaurant_menus(restaurant_id,position) WHERE publication_state='published';
CREATE TABLE IF NOT EXISTS restaurant_menu_localizations (
  menu_id uuid NOT NULL REFERENCES restaurant_menus(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK(locale IN ('ko','en','ja','zh-CN')),
  name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 200),
  description text CHECK(char_length(description) <= 600),
  PRIMARY KEY(menu_id,locale)
);

CREATE TABLE IF NOT EXISTS restaurant_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  storage_key text NOT NULL UNIQUE CHECK(char_length(storage_key) BETWEEN 3 AND 600),
  alt_ko text CHECK(char_length(alt_ko) <= 250),
  source_reference text NOT NULL CHECK(char_length(source_reference) BETWEEN 5 AND 700),
  usage_rights_reference text CHECK(char_length(usage_rights_reference) <= 700),
  rights_status text NOT NULL DEFAULT 'pending' CHECK(rights_status IN ('pending','approved','rejected','revoked')),
  publication_state text NOT NULL DEFAULT 'draft' CHECK(publication_state IN ('draft','published')),
  position smallint NOT NULL DEFAULT 0,
  rights_verified_at timestamptz,
  CHECK(publication_state <> 'published' OR
    (rights_status='approved' AND usage_rights_reference IS NOT NULL AND rights_verified_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_restaurant_images_public
  ON restaurant_images(restaurant_id,position)
  WHERE publication_state='published' AND rights_status='approved';

-- Editorial score is NOT a Google/Naver/user review average.
-- No score is publicly returned unless independently verified and approved.
CREATE TABLE IF NOT EXISTS restaurant_editorial_scores (
  restaurant_id uuid PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
  score numeric(2,1) CHECK(score >= 0 AND score <= 5),
  methodology_version text NOT NULL CHECK(char_length(methodology_version) BETWEEN 3 AND 100),
  evidence_summary text NOT NULL CHECK(char_length(evidence_summary) BETWEEN 10 AND 2000),
  approval_state text NOT NULL DEFAULT 'draft' CHECK(approval_state IN ('draft','review','approved','rejected')),
  verified_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK(approval_state <> 'approved' OR (score IS NOT NULL AND verified_at IS NOT NULL))
);

-- No IP address, email, user ID, cookie ID or session ID are recorded here.
-- Page views and event counts are NOT unique visitor counts.
CREATE TABLE IF NOT EXISTS whateato_analytics_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK(event_type IN ('page_view','search_submitted','detail_view','result_click','map_click','directions_click','phone_click')),
  page_type text NOT NULL CHECK(page_type IN ('home','search','restaurant','map','other')),
  locale text NOT NULL CHECK(locale IN ('ko','en','ja','zh-CN')),
  device_type text NOT NULL CHECK(device_type IN ('desktop','mobile','tablet','unknown')),
  acquisition_channel text NOT NULL CHECK(acquisition_channel IN ('direct','search','social','referral','unknown')),
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE SET NULL,
  search_term text CHECK(char_length(search_term) <= 80),
  result_count integer CHECK(result_count BETWEEN 0 AND 1000000),
  CHECK(event_type <> 'detail_view' OR restaurant_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_whateato_analytics_time ON whateato_analytics_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_whateato_analytics_restaurant_time ON whateato_analytics_events(restaurant_id,occurred_at DESC) WHERE restaurant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whateato_analytics_search ON whateato_analytics_events(occurred_at DESC,search_term) WHERE event_type='search_submitted';

INSERT INTO restaurant_tags(code) VALUES
 ('date_night'),('bar'),('lunch'),('dinner'),('solo_dining'),
 ('family_dining'),('cafe'),('dessert'),('budget_friendly'),
 ('good_atmosphere'),('local_pick'),('traveler_friendly'),
 ('english_menu'),('vegetarian_options'),('reservation_available'),('near_subway')
ON CONFLICT DO NOTHING;
INSERT INTO restaurant_tag_localizations(tag_code,locale,label) VALUES
 ('date_night','ko','데이트'),('date_night','en','Date night'),('date_night','ja','デート'),('date_night','zh-CN','约会'),
 ('bar','ko','술집'),('bar','en','Bar'),('bar','ja','居酒屋・バー'),('bar','zh-CN','酒吧'),
 ('solo_dining','ko','혼밥'),('solo_dining','en','Solo dining'),('solo_dining','ja','一人ご飯'),('solo_dining','zh-CN','独自用餐'),
 ('cafe','ko','카페'),('cafe','en','Café'),('cafe','ja','カフェ'),('cafe','zh-CN','咖啡馆'),
 ('family_dining','ko','가족 외식'),('family_dining','en','Family dining'),('family_dining','ja','家族での食事'),('family_dining','zh-CN','家庭聚餐'),
 ('english_menu','ko','영어 메뉴'),('english_menu','en','English menu'),('english_menu','ja','英語メニュー'),('english_menu','zh-CN','英文菜单'),
 ('vegetarian_options','ko','채식 메뉴'),('vegetarian_options','en','Vegetarian options'),('vegetarian_options','ja','ベジタリアン対応'),('vegetarian_options','zh-CN','素食选择'),
 ('reservation_available','ko','예약 가능'),('reservation_available','en','Reservations available'),('reservation_available','ja','予約可能'),('reservation_available','zh-CN','可预订'),
 ('near_subway','ko','지하철역 근처'),('near_subway','en','Near subway'),('near_subway','ja','地下鉄駅の近く'),('near_subway','zh-CN','靠近地铁站')
ON CONFLICT (tag_code,locale) DO NOTHING;
COMMIT;
