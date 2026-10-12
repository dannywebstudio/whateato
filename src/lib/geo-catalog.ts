import {getPool} from '@/lib/db';
import {escapeLike,normalizeLocale,normalizeTags,normalizeText,type Locale} from '@/lib/platform-v1';
import {CatalogDatabaseUnavailable,type CatalogTag} from '@/lib/restaurant-catalog';

// Geographic APIs share the existing verified-publication rules.
// Coordinates originate in food-service permit records, not in a licensed map product.
export type GeoMarker={
  id:string;name:string;name_ko:string;address_ko:string|null;
  latitude:number;longitude:number;distance_km?:number;
  category_code:string|null;region_sigungu:string|null;
  editorial_score:number|null;tags:CatalogTag[];
};
export type GeoEnvelope={south:number;west:number;north:number;east:number};
export type GeoCatalogResponse={
  mode:'viewport'|'nearby';locale:Locale;bounds:GeoEnvelope;
  filters:string[];q:string;items:GeoMarker[];has_more:boolean;limit:number;
  location_note:string;ratings_note:string;
};
export class GeoInputError extends Error {
  constructor(message:string){super(message)}
}
const KOREA={south:33,west:124,north:39.5,east:132};
function decimal(value:unknown):number{
  if(typeof value!=='string'||!value.trim()||!/^[-+]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim())){
    throw new GeoInputError('invalid_geo_coordinate');
  }
  const number=Number(value);
  if(!Number.isFinite(number))throw new GeoInputError('invalid_geo_coordinate');
  return number;
}
function boundedCoords(lat:number,lon:number){
  if(lat<KOREA.south||lat>KOREA.north||lon<KOREA.west||lon>KOREA.east)
    throw new GeoInputError('coordinates_outside_korea');
}
export function parseViewport(raw:unknown):GeoEnvelope{
  if(typeof raw!=='string'||raw.length>110)throw new GeoInputError('invalid_bbox');
  const parts=raw.split(',');
  if(parts.length!==4)throw new GeoInputError('invalid_bbox');
  const [south,west,north,east]=parts.map(decimal);
  boundedCoords(south,west);
  boundedCoords(north,east);
  if(south>=north||west>=east)throw new GeoInputError('inverted_or_empty_bbox');
  if(north-south>1.5||east-west>1.5)throw new GeoInputError('viewport_too_large');
  return {south,west,north,east};
}
export function parseNearby(lat:unknown,lon:unknown,radius:unknown){
  const latitude=decimal(lat);
  const longitude=decimal(lon);
  boundedCoords(latitude,longitude);
  const radiusKm=radius==null?3:decimal(radius);
  if(radiusKm<0.25||radiusKm>20)throw new GeoInputError('radius_must_be_0.25_to_20_km');
  // Bounding box prefilter + exact Haversine prevents a global trig scan.
  const dlat=radiusKm/111.195;
  const dlon=radiusKm/(111.195*Math.max(0.01,Math.cos(latitude*Math.PI/180)));
  return {
    latitude,longitude,radiusKm,
    bounds:{
      south:Math.max(KOREA.south,latitude-dlat),
      west:Math.max(KOREA.west,longitude-dlon),
      north:Math.min(KOREA.north,latitude+dlat),
      east:Math.min(KOREA.east,longitude+dlon)
    }
  };
}
type QueryParams={
  locale?:unknown;filters?:unknown;q?:unknown;limit?:number;
};
function options(input:QueryParams){
  const locale=normalizeLocale(input.locale);
  const filters=normalizeTags(typeof input.filters==='string'?input.filters:'');
  const q=normalizeText(input.q,100);
  const raw=Number(input.limit);
  const limit=Number.isFinite(raw)?Math.min(200,Math.max(1,Math.trunc(raw))):100;
  return {locale,filters,q,limit};
}
const haversine=`(6371.0088*2*ASIN(LEAST(1.0,SQRT(
    POWER(SIN(RADIANS((r.latitude-$9::float8)/2)),2)
    +COS(RADIANS($9::float8))*COS(RADIANS(r.latitude))
    *POWER(SIN(RADIANS((r.longitude-$10::float8)/2)),2)
  ))))`;
export async function getGeoCatalog(input:QueryParams & {
  mode:'viewport';bbox:unknown
} | QueryParams & {
  mode:'nearby';lat:unknown;lon:unknown;radius?:unknown
}):Promise<GeoCatalogResponse>{
  const {locale,filters,q,limit}=options(input);
  const nearby=input.mode==='nearby'
    ?parseNearby(input.lat,input.lon,input.radius)
    :null;
  const bounds=nearby?.bounds||parseViewport(input.mode==='viewport'?input.bbox:null);
  const db=getPool();if(!db)throw new CatalogDatabaseUnavailable();
  const distance=nearby?haversine:'NULL::float8';
  const sql=`
    SELECT r.id::text AS id,COALESCE(l.display_name,k.display_name,r.name_ko) AS name,
      r.name_ko,COALESCE(NULLIF(BTRIM(r.road_address_ko),''),NULLIF(BTRIM(r.lot_address_ko),'')) AS address_ko,r.latitude,r.longitude,
      r.category_code,r.region_sigungu,
      CASE WHEN sc.approval_state='approved' AND sc.verified_at IS NOT NULL
        THEN sc.score::float8 ELSE NULL END AS editorial_score,
      COALESCE((SELECT json_agg(json_build_object(
        'code',a.tag_code,'label',COALESCE(tl.label,kl.label,a.tag_code)) ORDER BY a.tag_code)
        FROM restaurant_tag_assignments a
        LEFT JOIN restaurant_tag_localizations tl ON tl.tag_code=a.tag_code AND tl.locale=$1
        LEFT JOIN restaurant_tag_localizations kl ON kl.tag_code=a.tag_code AND kl.locale='ko'
        WHERE a.restaurant_id=r.id AND a.verification_state='verified'
          AND a.verified_at IS NOT NULL AND NULLIF(BTRIM(a.evidence_ref),'') IS NOT NULL
        ),'[]'::json) AS tags,
      ${distance} AS distance_km
    FROM restaurants r
    LEFT JOIN restaurant_localizations l ON l.restaurant_id=r.id AND l.locale=$1 AND l.publication_state='published'
    LEFT JOIN restaurant_localizations k ON k.restaurant_id=r.id AND k.locale='ko' AND k.publication_state='published'
    LEFT JOIN restaurant_editorial_scores sc ON sc.restaurant_id=r.id AND sc.approval_state='approved'
    WHERE r.publication_status='published' AND r.business_status='active'
      AND NOT EXISTS (SELECT 1 FROM restaurant_data_quality_reviews dq
        WHERE dq.restaurant_id=r.id AND dq.review_state='confirmed_hold')
      AND r.latitude BETWEEN $2 AND $3 AND r.longitude BETWEEN $4 AND $5
      AND ($6::text='' OR r.name_ko ILIKE $7 OR r.road_address_ko ILIKE $7
        OR r.lot_address_ko ILIKE $7 OR r.region_sigungu ILIKE $7 OR r.region_dong ILIKE $7
        OR l.display_name ILIKE $7 OR k.display_name ILIKE $7
        OR EXISTS(SELECT 1 FROM restaurant_menus m
          JOIN restaurant_menu_localizations ml ON ml.menu_id=m.id
          WHERE m.restaurant_id=r.id AND m.publication_state='published'
            AND NULLIF(BTRIM(m.evidence_ref),'') IS NOT NULL
            AND ml.locale IN ($1,'ko') AND ml.name ILIKE $7))
      -- Keep viewport and search-page filters aligned. The only permit-
      -- derived shortcuts are explicit cafe / pub classifications.
      AND NOT EXISTS(SELECT 1 FROM unnest($8::text[]) required_tag WHERE NOT (
        EXISTS(SELECT 1 FROM restaurant_tag_assignments a
          WHERE a.restaurant_id=r.id AND a.tag_code=required_tag
            AND a.verification_state='verified'
            AND a.verified_at IS NOT NULL AND NULLIF(BTRIM(a.evidence_ref),'') IS NOT NULL)
        OR (required_tag='cafe' AND r.category_code IN ('카페','까페'))
        OR (required_tag='bar' AND r.category_code IN (
          '정종/대포집/소주방','감성주점','호프/통닭'))
      ))
      ${nearby?`AND ${haversine} <= $11::float8`:''}
    ORDER BY ${nearby?'distance_km ASC,':''} r.name_ko ASC,r.id ASC
    LIMIT ${nearby?'$12':'$9'}::integer`;
  const params=nearby
    ?[locale,bounds.south,bounds.north,bounds.west,bounds.east,
      q,'%'+escapeLike(q)+'%',filters,nearby.latitude,nearby.longitude,nearby.radiusKm,limit+1]
    :[locale,bounds.south,bounds.north,bounds.west,bounds.east,
      q,'%'+escapeLike(q)+'%',filters,limit+1];
  const res=await db.query<GeoMarker>(sql,params);
  const items=res.rows.slice(0,limit).map(r=>({
    ...r,...(nearby?{distance_km:Number(r.distance_km)}:{}),
  }));
  return {
    mode:input.mode,locale,bounds,filters,q,items,limit,
    has_more:res.rows.length>limit,
    location_note:'Coordinates come from public permit records and may not identify the entrance or prove a venue is open now.',
    ratings_note:'Editorial score is independent and shown only when verified and approved.'
  };
}
