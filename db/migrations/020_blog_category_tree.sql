-- Category taxonomy is owned by CMS, not compiled into application code.
-- Stable URL slugs; two-level tree; legacy blog draft categories remain addressable.
BEGIN;
CREATE TABLE IF NOT EXISTS whateato_blog_categories(
 slug text PRIMARY KEY CHECK(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 64),
 parent_slug text REFERENCES whateato_blog_categories(slug) ON DELETE RESTRICT,
 names jsonb NOT NULL CHECK (jsonb_typeof(names)='object'
   AND length(coalesce(names->>'en','')) BETWEEN 2 AND 100
   AND length(coalesce(names->>'ko','')) BETWEEN 1 AND 100),
 position integer NOT NULL DEFAULT 100 CHECK(position BETWEEN 0 AND 10000),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(parent_slug IS DISTINCT FROM slug)
);
CREATE INDEX IF NOT EXISTS idx_we_blog_cat_parent
 ON whateato_blog_categories(parent_slug,is_active,position,slug);
INSERT INTO whateato_blog_categories(slug,parent_slug,names,position,is_active)
 VALUES
 ('restaurants',NULL,'{"en":"Restaurants","ko":"맛집","ja":"グルメ","zh-CN":"美食"}',10,true),
 ('travel',NULL,'{"en":"Travel","ko":"여행","ja":"旅行","zh-CN":"旅行"}',20,true),
 ('k-beauty',NULL,'{"en":"K-Beauty Items","ko":"K-Beauty item","ja":"Kビューティー","zh-CN":"韩妆好物"}',30,true)
ON CONFLICT(slug) DO NOTHING;
INSERT INTO whateato_blog_categories(slug,parent_slug,names,position,is_active)
 VALUES
 ('transportation','travel','{"en":"Transportation","ko":"교통 정보","ja":"交通情報","zh-CN":"交通信息"}',10,true),
 ('festivals','travel','{"en":"Festivals & Events","ko":"축제 정보","ja":"祭り・イベント","zh-CN":"节庆活动"}',20,true),
 ('shopping-picks','travel','{"en":"Shopping Recommendations","ko":"추천 쇼핑 아이템","ja":"おすすめショッピング","zh-CN":"购物推荐"}',30,true),
 ('local-attractions','travel','{"en":"Local Attractions","ko":"지역 명소","ja":"観光名所","zh-CN":"当地景点"}',40,true),
 ('olive-young','k-beauty','{"en":"Olive Young","ko":"올리브영","ja":"オリーブヤング","zh-CN":"Olive Young"}',10,true),
 ('daiso','k-beauty','{"en":"Daiso","ko":"다이소","ja":"ダイソー","zh-CN":"大创"}',20,true),
 ('plastic-surgery-reviews','k-beauty','{"en":"Plastic Surgery Reviews","ko":"성형외과 후기","ja":"美容整形レビュー","zh-CN":"整形体验评价"}',30,true),
 ('perfume','k-beauty','{"en":"Perfume","ko":"향수","ja":"香水","zh-CN":"香水"}',40,true)
ON CONFLICT(slug) DO NOTHING;
-- Maintain backward compatibility for existing 019-era drafts and snapshots.
INSERT INTO whateato_blog_categories(slug,parent_slug,names,position,is_active)
 VALUES
 ('food-guides','restaurants','{"en":"Food Guides","ko":"맛집 가이드"}',200,false),
 ('neighborhoods','restaurants','{"en":"Neighborhoods","ko":"지역별 맛집"}',210,false),
 ('korean-food','restaurants','{"en":"Korean Food","ko":"한식"}',220,false),
 ('dining-tips','restaurants','{"en":"Dining Tips","ko":"식당 이용 팁"}',230,false),
 ('food-culture','restaurants','{"en":"Food Culture","ko":"음식 문화"}',240,false)
ON CONFLICT(slug) DO NOTHING;
ALTER TABLE whateato_blog_drafts DROP CONSTRAINT IF EXISTS whateato_blog_drafts_category_check;
ALTER TABLE whateato_blog_drafts ALTER COLUMN category SET DEFAULT 'restaurants';
ALTER TABLE whateato_blog_drafts ADD CONSTRAINT fk_we_blog_draft_category
 FOREIGN KEY(category) REFERENCES whateato_blog_categories(slug) ON DELETE RESTRICT;
COMMIT;
