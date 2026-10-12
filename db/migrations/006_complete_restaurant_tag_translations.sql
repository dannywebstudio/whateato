-- WhatEatO Phase 3 / Four-language tag label completeness.
-- Non-destructive: insert only missing label rows; never overwrite reviewed text.
-- Original 004 inserted 9/16 tags, leaving 7 tag codes without localized labels.
BEGIN;
INSERT INTO restaurant_tag_localizations (tag_code,locale,label) VALUES
 ('lunch','ko','점심'),('lunch','en','Lunch'),('lunch','ja','ランチ'),('lunch','zh-CN','午餐'),
 ('dinner','ko','저녁'),('dinner','en','Dinner'),('dinner','ja','ディナー'),('dinner','zh-CN','晚餐'),
 ('dessert','ko','디저트'),('dessert','en','Dessert'),('dessert','ja','デザート'),('dessert','zh-CN','甜品'),
 ('budget_friendly','ko','가성비'),('budget_friendly','en','Good value'),('budget_friendly','ja','お得'),('budget_friendly','zh-CN','高性价比'),
 ('good_atmosphere','ko','분위기'),('good_atmosphere','en','Good atmosphere'),('good_atmosphere','ja','雰囲気が良い'),('good_atmosphere','zh-CN','氛围良好'),
 ('local_pick','ko','현지인 추천'),('local_pick','en','Local picks'),('local_pick','ja','地元のおすすめ'),('local_pick','zh-CN','当地推荐'),
 ('traveler_friendly','ko','여행자 편의'),('traveler_friendly','en','Traveler friendly'),('traveler_friendly','ja','旅行者向け'),('traveler_friendly','zh-CN','游客友好')
ON CONFLICT (tag_code,locale) DO NOTHING;
COMMIT;
