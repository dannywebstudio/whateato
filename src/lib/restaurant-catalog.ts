import {getPool} from '@/lib/db';
import {triageABPublicWhere,triageDisplayCategorySql} from '@/lib/triage-ab-gate';
import {getOpeningHours,type OpeningHours} from '@/lib/opening-hours';
import {loadRatingDisplays,type RatingDisplay} from '@/lib/ratings-display';
import {escapeLike,isUuid,normalizeLocale,normalizeTags,normalizeText,type Locale} from '@/lib/platform-v1';

export type CatalogTag={code:string;label:string};
export type FeaturedImageMetadata={id:string;alt_ko:string|null;url:string};
export type RestaurantSearchItem={
  id:string;name:string;name_ko:string;address_ko:string|null;address:string|null;
  category_code:string|null;region_sido:string|null;region_sigungu:string|null;short_description:string|null;
  main_menu:string|null;featured_image_metadata:FeaturedImageMetadata|null;
  editorial_score:number|null;tags:CatalogTag[];opening_hours:OpeningHours|null;ratings:RatingDisplay;
};
export type RestaurantSearchInput={
  q?:unknown;region?:unknown;locale?:unknown;filters?:unknown;
  limit?:number;offset?:number;
};
export type RestaurantSearchResponse={
  locale:Locale;q:string;region:string;filters:string[];
  items:RestaurantSearchItem[];limit:number;offset:number;has_more:boolean;total_count:number;
  ratings_note:string;
};
export type RestaurantDetailInfo={
  id:string;name_ko:string;name:string;address:string|null;short_description:string|null;
  full_description:string|null;road_address_ko:string|null;lot_address_ko:string|null;
  region_sido:string|null;region_sigungu:string|null;category_code:string|null;
  latitude:number|null;longitude:number|null;
  editorial_score:number|null;editorial_methodology:string|null;opening_hours:OpeningHours|null;ratings:RatingDisplay;
};
export type RestaurantMenu={
  id:string;name:string;description:string|null;price_krw:number|null;price_verified_at:string|null;
};
export type RestaurantDetailResponse={
  locale:Locale;restaurant:RestaurantDetailInfo;menus:RestaurantMenu[];
  tags:CatalogTag[];images:FeaturedImageMetadata[];
  image_note:string;rating_note:string;
};
export class CatalogDatabaseUnavailable extends Error {
  constructor(){super('database_not_configured')}
}

// Shared SQL contracts power BOTH the v1 public API and Next.js server-rendered pages.
// Only published/verified content, licensed photo metadata, and approved independent scores.
export async function searchRestaurantCatalog(input:RestaurantSearchInput):Promise<RestaurantSearchResponse>{
  const locale=normalizeLocale(input.locale);
  const q=normalizeText(input.q,100);
  const region=normalizeText(input.region,60);
  const filters=Array.isArray(input.filters)
    ?normalizeTags(input.filters.filter(v=>typeof v==='string').join(','))
    :normalizeTags(typeof input.filters==='string'?input.filters:'');
  const limit=Math.min(30,Math.max(1,Math.trunc(Number.isFinite(input.limit)?Number(input.limit):20)));
  const offset=Math.min(10000,Math.max(0,Math.trunc(Number.isFinite(input.offset)?Number(input.offset):0)));
  const pool=getPool();
  if(!pool)throw new CatalogDatabaseUnavailable();
  const sql=`
    SELECT COUNT(*) OVER()::integer AS total_count,r.id::text AS id,
      COALESCE(l.display_name,k.display_name,r.name_ko) AS name,
      r.name_ko,COALESCE(NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) AS address_ko,
      COALESCE(al.display_address,NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) AS address,${triageDisplayCategorySql()} AS category_code,r.region_sido,r.region_sigungu,
      COALESCE(l.short_description,k.short_description) AS short_description,
      (SELECT COALESCE(ml.name,kl.name)
         FROM restaurant_menus m
         LEFT JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id AND ml.locale=$1
         LEFT JOIN restaurant_menu_localizations kl ON kl.menu_id=m.id AND kl.locale='ko'
         WHERE m.restaurant_id=r.id AND m.publication_state='published'
           AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL
           AND COALESCE(ml.name,kl.name) IS NOT NULL
         ORDER BY m.position,m.id LIMIT 1) AS main_menu,
      (SELECT json_build_object('id',im.id::text,'alt_ko',im.alt_ko,'url','/api/v1/images/'||im.id::text)
         FROM restaurant_images im
         WHERE im.restaurant_id=r.id AND im.publication_state='published'
           AND im.rights_status='approved'
           AND NULLIF(BTRIM(im.usage_rights_reference),'') IS NOT NULL
           AND im.rights_verified_at IS NOT NULL
         ORDER BY CASE WHEN im.cms_photo_role='cover' THEN 0 ELSE 1 END,im.position,im.id
          LIMIT 1) AS featured_image_metadata,
      CASE WHEN sc.approval_state='approved' AND sc.verified_at IS NOT NULL
        THEN sc.score::float8 ELSE NULL END AS editorial_score,
      COALESCE((SELECT json_agg(json_build_object('code',a.tag_code,'label',COALESCE(tl.label,ko_tl.label,a.tag_code)) ORDER BY a.tag_code)
        FROM restaurant_tag_assignments a
        LEFT JOIN restaurant_tag_localizations tl ON tl.tag_code=a.tag_code AND tl.locale=$1
        LEFT JOIN restaurant_tag_localizations ko_tl ON ko_tl.tag_code=a.tag_code AND ko_tl.locale='ko'
        WHERE a.restaurant_id=r.id AND a.verification_state='verified'
          AND NULLIF(BTRIM(a.evidence_ref),'') IS NOT NULL
          AND a.verified_at IS NOT NULL),'[]'::json) AS tags
    FROM restaurants r
    LEFT JOIN restaurant_address_localizations_v1 al ON al.restaurant_id=r.id AND al.locale=$1
    LEFT JOIN restaurant_localizations l ON l.restaurant_id=r.id AND l.locale=$1 AND l.publication_state='published'
    LEFT JOIN restaurant_localizations k ON k.restaurant_id=r.id AND k.locale='ko' AND k.publication_state='published'
    LEFT JOIN restaurant_editorial_scores sc ON sc.restaurant_id=r.id AND sc.approval_state='approved'
    WHERE r.publication_status='published' AND r.business_status='active'
      ${triageABPublicWhere()}
      AND (${process.env.WHATEATO_PREVIEW_50_ONLY === 'true' ? 'FALSE' : 'TRUE'} OR EXISTS (
        SELECT 1 FROM restaurant_enrichment_sample_1000 preview
        JOIN restaurant_content_readiness_v1 readiness ON readiness.id=preview.restaurant_id
        WHERE preview.restaurant_id=r.id AND preview.sample_rank BETWEEN 1 AND 50
          AND readiness.published_languages>=1 AND readiness.verified_menus>=1
          AND (
            (readiness.approved_images>=1 OR (${process.env.WHATEATO_PREVIEW_THREE_TEXT_ONLY === 'true' ? 'TRUE' : 'FALSE'} AND preview.sample_rank BETWEEN 1 AND 3))
            OR (
              ${process.env.WHATEATO_GOOGLE_PHOTO_APPROVED === 'true' && process.env.WHATEATO_GOOGLE_PHOTO_QUOTA_GUARD_READY === 'true' ? 'TRUE' : 'FALSE'}
              AND EXISTS (
                SELECT 1 FROM google_place_manual_identity_approvals_v1 a
                JOIN restaurant_source_match_checkpoints_v1 cp ON cp.restaurant_id=a.restaurant_id
                  AND cp.google_place_id=a.google_place_id
                JOIN google_places_photo_quota_v1 md ON md.month_key=to_char(now() AT TIME ZONE 'UTC','YYYY-MM')
                  AND md.sku='place_details_photo_metadata' AND md.used<md.limit_count
                JOIN google_places_photo_quota_v1 pm ON pm.month_key=to_char(now() AT TIME ZONE 'UTC','YYYY-MM')
                  AND pm.sku='place_photo_media' AND pm.used<pm.limit_count
                WHERE a.restaurant_id=r.id AND a.verified_at IS NOT NULL
              )
            )
          ) AND readiness.verified_tags>=1
          AND readiness.next_action <> 'identity_or_evidence_hold'
      ))
      AND NOT EXISTS (SELECT 1 FROM restaurant_data_quality_reviews dq
        WHERE dq.restaurant_id=r.id AND dq.review_state='confirmed_hold')
      AND ($2::text='' OR r.name_ko ILIKE $3 OR r.road_address_ko ILIKE $3
           OR r.lot_address_ko ILIKE $3 OR r.category_code ILIKE $3
           OR (lower($2::text)=ANY(ARRAY['카페','까페','cafe','coffee']) AND r.category_code IN ('카페','까페'))
           OR (lower($2::text)=ANY(ARRAY['술집','bar','pub']) AND r.category_code IN ('정종/대포집/소주방','감성주점','호프/통닭'))
           OR r.region_sigungu ILIKE $3 OR r.region_dong ILIKE $3
           OR l.display_name ILIKE $3 OR k.display_name ILIKE $3
           OR EXISTS (SELECT 1 FROM restaurant_menus m
             JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id
             WHERE m.restaurant_id=r.id AND m.publication_state='published'
               AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL
               AND ml.locale IN ($1,'ko') AND ml.name ILIKE $3))
      AND ($4::text='' OR r.region_sido ILIKE $5 OR r.region_sigungu ILIKE $5 OR r.region_dong ILIKE $5)
      -- Only classifications supported directly by official permit data can
      -- serve as a category-based fallback; never invent lifestyle tags.
      AND NOT EXISTS (
        SELECT 1 FROM unnest($6::text[]) required_tag
        WHERE NOT (
          EXISTS (
            SELECT 1 FROM restaurant_tag_assignments ra
            WHERE ra.restaurant_id=r.id AND ra.tag_code=required_tag
              AND ra.verification_state='verified'
              AND NULLIF(BTRIM(ra.evidence_ref),'') IS NOT NULL
              AND ra.verified_at IS NOT NULL
          )
          OR (required_tag='cafe' AND r.category_code IN ('카페','까페'))
          OR (required_tag='bar' AND r.category_code IN (
            '정종/대포집/소주방','감성주점','호프/통닭'))
        )
      )
    -- Name matches outrank address, neighborhood and registry-category matches.
    ORDER BY CASE
      WHEN $2::text='' THEN 0
      WHEN lower(r.name_ko)=lower($2) OR lower(l.display_name)=lower($2) THEN 0
      WHEN r.name_ko ILIKE ($2 || '%') OR l.display_name ILIKE ($2 || '%') THEN 1
      WHEN r.name_ko ILIKE $3 OR l.display_name ILIKE $3 THEN 2
      WHEN r.road_address_ko ILIKE $3 OR r.lot_address_ko ILIKE $3 THEN 3
      WHEN r.region_sigungu ILIKE $3 OR r.region_dong ILIKE $3 THEN 4
      ELSE 5
    END,
      r.name_ko ASC,r.id ASC
    LIMIT ($7::integer + 1) OFFSET $8`;
  const res=await pool.query<RestaurantSearchItem & {total_count:number}>(sql,
    [locale,q,'%'+escapeLike(q)+'%',region,'%'+escapeLike(region)+'%',filters,limit,offset]);
  const items=res.rows.slice(0,limit);
  const [opening,ratings]=await Promise.all([getOpeningHours(pool,items.map(x=>x.id)),loadRatingDisplays(pool,items.map(x=>x.id))]);
  return {locale,q,region,filters,items:items.map(x=>({...x,opening_hours:opening[x.id]||null,ratings:ratings[x.id]||{external:null,whateato:null}})),limit,offset,
    has_more:res.rows.length>limit,total_count:res.rows[0]?.total_count??0,
    ratings_note:'editorial_score is an independently approved WhatEatO score; null means unverified'};
}

export async function getRestaurantCatalogDetail(id:string,language:unknown):Promise<RestaurantDetailResponse|null>{
  if(!isUuid(id))return null;
  const locale=normalizeLocale(language);
  const pool=getPool();
  if(!pool)throw new CatalogDatabaseUnavailable();
  const row=await pool.query<RestaurantDetailInfo>(`
    SELECT r.id::text AS id,r.name_ko,
      COALESCE(l.display_name,k.display_name,r.name_ko) AS name,
      COALESCE(l.short_description,k.short_description) AS short_description,
      COALESCE(l.full_description,k.full_description) AS full_description,
      COALESCE(al.display_address,r.road_address_ko,r.lot_address_ko) AS address,r.road_address_ko,r.lot_address_ko,r.region_sido,r.region_sigungu,
      ${triageDisplayCategorySql()} AS category_code,r.latitude,r.longitude,
      CASE WHEN sc.approval_state='approved' AND sc.verified_at IS NOT NULL
        THEN sc.score::float8 ELSE NULL END AS editorial_score,
      CASE WHEN sc.approval_state='approved' AND sc.verified_at IS NOT NULL
        THEN sc.methodology_version ELSE NULL END AS editorial_methodology
    FROM restaurants r
    LEFT JOIN restaurant_address_localizations_v1 al ON al.restaurant_id=r.id AND al.locale=$2
    LEFT JOIN restaurant_localizations l ON l.restaurant_id=r.id AND l.locale=$2 AND l.publication_state='published'
    LEFT JOIN restaurant_localizations k ON k.restaurant_id=r.id AND k.locale='ko' AND k.publication_state='published'
    LEFT JOIN restaurant_editorial_scores sc ON sc.restaurant_id=r.id AND sc.approval_state='approved'
    WHERE r.id=$1 AND r.publication_status='published' AND r.business_status='active'
      ${triageABPublicWhere()}
      AND (${process.env.WHATEATO_PREVIEW_50_ONLY === 'true' ? 'FALSE' : 'TRUE'} OR EXISTS (
        SELECT 1 FROM restaurant_enrichment_sample_1000 preview
        JOIN restaurant_content_readiness_v1 readiness ON readiness.id=preview.restaurant_id
        WHERE preview.restaurant_id=r.id AND preview.sample_rank BETWEEN 1 AND 50
          AND readiness.published_languages>=1 AND readiness.verified_menus>=1
          AND (readiness.approved_images>=1 OR (${process.env.WHATEATO_PREVIEW_THREE_TEXT_ONLY === 'true' ? 'TRUE' : 'FALSE'} AND preview.sample_rank BETWEEN 1 AND 3)) AND readiness.verified_tags>=1
          AND readiness.next_action <> 'identity_or_evidence_hold'
      ))
      AND NOT EXISTS (SELECT 1 FROM restaurant_data_quality_reviews dq
        WHERE dq.restaurant_id=r.id AND dq.review_state='confirmed_hold')`,[id,locale]);
  if(!row.rows[0])return null;
  const [menus,tags,images]=await Promise.all([
    pool.query<RestaurantMenu>(`
      SELECT m.id::text AS id,COALESCE(ml.name,kl.name) AS name,
        COALESCE(ml.description,kl.description) AS description,
        CASE WHEN m.price_verified_at IS NOT NULL THEN m.price_krw ELSE NULL END AS price_krw,
        m.price_verified_at
      FROM restaurant_menus m
      LEFT JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id AND ml.locale=$2
      LEFT JOIN restaurant_menu_localizations kl ON kl.menu_id=m.id AND kl.locale='ko'
      WHERE m.restaurant_id=$1 AND m.publication_state='published'
        AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL
        AND COALESCE(ml.name,kl.name) IS NOT NULL
      ORDER BY m.position,m.id LIMIT 40`,[id,locale]),
    pool.query<CatalogTag>(`
      SELECT a.tag_code AS code,COALESCE(tl.label,kl.label,a.tag_code) AS label
      FROM restaurant_tag_assignments a
      LEFT JOIN restaurant_tag_localizations tl ON tl.tag_code=a.tag_code AND tl.locale=$2
      LEFT JOIN restaurant_tag_localizations kl ON kl.tag_code=a.tag_code AND kl.locale='ko'
      WHERE a.restaurant_id=$1 AND a.verification_state='verified'
        AND NULLIF(BTRIM(a.evidence_ref),'') IS NOT NULL AND a.verified_at IS NOT NULL
      ORDER BY a.tag_code`,[id,locale]),
    pool.query<FeaturedImageMetadata>(`
      SELECT id::text,alt_ko,('/api/v1/images/'||id::text) AS url FROM restaurant_images
      WHERE restaurant_id=$1 AND publication_state='published' AND rights_status='approved'
        AND NULLIF(BTRIM(usage_rights_reference),'') IS NOT NULL AND rights_verified_at IS NOT NULL
        AND cms_photo_role='gallery'
      ORDER BY position,id LIMIT 25`,[id])
  ]);
  const [opening,ratings]=await Promise.all([getOpeningHours(pool,[id]),loadRatingDisplays(pool,[id])]);
  return {locale,restaurant:{...row.rows[0],opening_hours:opening[id]||null,ratings:ratings[id]||{external:null,whateato:null}},menus:menus.rows,tags:tags.rows,images:images.rows,
    image_note:'Licensed media delivered via internal route only when server-owned media storage is configured.',
    rating_note:'Independent editorial score is not a Google/Naver or user-review average.'};
}
