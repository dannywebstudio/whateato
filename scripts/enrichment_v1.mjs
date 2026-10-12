#!/usr/bin/env node
/**
 * WhatEatO evidence-first content intake v1.
 *  - inspect <path> : validate a research packet, NO DB connection or edits.
 *  - stage <path>   : insert REVIEW/DRAFT/PROPOSED/PENDING only, on verified staging branch.
 *  - Never approves, publishes, assigns verified tags, licenses images or scores.
 *  - URLs are research references, NOT automatically proof of ownership or facts.
 */
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import pg from 'pg';

export const SCHEMA_VERSION='whateato.enrichment.v1';
const UUID=/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i;
const LOCALES=new Set(['ko','en','ja','zh-CN']);
const TAGS=new Set(['date_night','bar','lunch','dinner','solo_dining','family_dining','cafe',
 'dessert','budget_friendly','good_atmosphere','local_pick','traveler_friendly',
 'english_menu','vegetarian_options','reservation_available','near_subway']);
const MAX_AGE_DAYS=365;

function requireText(value,label,max=700){
  if(typeof value!=='string'||!value.trim()||value.length>max||/[\u0000-\u001F\u007F]/.test(value)){
    throw Error(label+': valid nonempty text required (max '+max+')');
  }
  return value.trim();
}
function optionalText(value,label,max){
  if(value==null)return null;
  return requireText(value,label,max);
}
function reference(value,label){
  const text=requireText(value,label,700);
  let url;
  try{url=new URL(text)}catch{throw Error(label+': absolute HTTPS reference required')}
  if(url.protocol!=='https:'||url.username||url.password||!url.hostname.includes('.')){
    throw Error(label+': HTTPS URL without credentials required');
  }
  if(/^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$/i.test(url.hostname)){
    throw Error(label+': local URLs forbidden');
  }
  return text;
}
function date(value,label){
  const t=Date.parse(requireText(value,label,40));
  if(!Number.isFinite(t)||!/^\d{4}-\d{2}-\d{2}/.test(value))throw Error(label+': ISO date required');
  const age=Date.now()-t;
  if(age < -86400000||age > MAX_AGE_DAYS*86400000)throw Error(label+': reference outside 365-day evidence freshness window');
  return new Date(t).toISOString();
}
function array(value,label,max){
  if(!Array.isArray(value)||value.length>max)throw Error(label+': array with at most '+max+' entries required');
  return value;
}
function distinct(values,label){if(new Set(values).size!==values.length)throw Error(label+': duplicate identifiers')}
function stableUuid(...parts){
  const hex=createHash('sha256').update(['whateato-enrichment-v1',...parts].join('|')).digest('hex');
  return hex.slice(0,8)+'-'+hex.slice(8,12)+'-4'+hex.slice(13,16)+'-8'+hex.slice(17,20)+'-'+hex.slice(20,32);
}

export function validatePacket(packet){
  if(!packet||typeof packet!=='object'||Array.isArray(packet))throw Error('packet must be a JSON object');
  if(packet.schema_version!==SCHEMA_VERSION)throw Error('unexpected schema_version');
  if(!UUID.test(packet.restaurant_id||''))throw Error('restaurant_id: invalid UUID');
  const name_ko=requireText(packet.name_ko,'name_ko',300);
  const road_address_ko=requireText(packet.road_address_ko,'road_address_ko',500);
  const identity=packet.identity_evidence;
  if(!identity||typeof identity!=='object')throw Error('identity_evidence required');
  const identityRef=reference(identity.url,'identity_evidence.url');
  date(identity.checked_at,'identity_evidence.checked_at');

  const localizations=array(packet.localizations??[],'localizations',4).map((l,i)=>{
    const label='localizations['+i+']';
    if(!LOCALES.has(l?.locale))throw Error(label+': invalid locale');
    const display_name=requireText(l.display_name,label+'.display_name',300);
    const short_description=optionalText(l.short_description,label+'.short_description',500);
    const full_description=optionalText(l.full_description,label+'.full_description',5000);
    const source=reference(l.source_url,label+'.source_url');
    date(l.checked_at,label+'.checked_at');
    return {locale:l.locale,display_name,short_description,full_description,source};
  });
  distinct(localizations.map(l=>l.locale),'localizations');

  const tags=array(packet.tags??[],'tags',16).map((t,i)=>{
    const label='tags['+i+']';
    if(!TAGS.has(t?.code))throw Error(label+': unknown tag');
    const source=reference(t.source_url,label+'.source_url');
    date(t.checked_at,label+'.checked_at');
    return {code:t.code,source};
  });
  distinct(tags.map(t=>t.code),'tags');

  const menus=array(packet.menus??[],'menus',40).map((m,i)=>{
    const label='menus['+i+']';
    const name=requireText(m?.name_ko,label+'.name_ko',200);
    if(!Number.isInteger(m?.position)||m.position<0||m.position>32000)throw Error(label+': position must be integer 0-32000');
    if(m.price_krw!==null && m.price_krw!==undefined &&
      (!Number.isInteger(m.price_krw)||m.price_krw<0||m.price_krw>100000000))throw Error(label+': invalid price');
    const source=reference(m.source_url,label+'.source_url');
    date(m.checked_at,label+'.checked_at');
    return {name,position:m.position,price_krw:m.price_krw??null,source};
  });
  distinct(menus.map(m=>m.name+'|'+m.position),'menus');

  const images=array(packet.images??[],'images',12).map((img,i)=>{
    const label='images['+i+']';
    const key=requireText(img?.storage_key,label+'.storage_key',600);
    if(!/^media\/[a-zA-Z0-9_/-]+\.(?:jpg|jpeg|png|webp)$/.test(key)||
      key.includes('..')||key.includes('//'))throw Error(label+': invalid private media storage_key');
    const source=reference(img.source_url,label+'.source_url');
    const rights=reference(img.rights_document_url,label+'.rights_document_url');
    date(img.rights_checked_at,label+'.rights_checked_at');
    const alt=optionalText(img.alt_ko,label+'.alt_ko',250);
    return {key,source,rights,alt};
  });
  distinct(images.map(i=>i.key),'images');

  let score=null;
  if(packet.editorial_score!=null){
    const s=packet.editorial_score;
    if(typeof s.score!=='number'||!Number.isFinite(s.score)||
      s.score<0||s.score>5||Math.round(s.score*10)!==s.score*10)throw Error('editorial_score: valid 0.0-5.0 increments of 0.1 required');
    if(s.methodology_version==='google-average'||s.methodology_version==='naver-average')
      throw Error('external rating must not be relabeled editorial');
    score={
      score:s.score,methodology:requireText(s.methodology_version,'editorial_score.methodology_version',100),
      summary:requireText(s.evidence_summary,'editorial_score.evidence_summary',2000),
      source:reference(s.source_url,'editorial_score.source_url')
    };
    if(score.methodology.length<3||score.summary.length<10)throw Error('editorial score needs a substantial independent evidence summary');
    date(s.checked_at,'editorial_score.checked_at');
  }
  const count=localizations.length+tags.length+menus.length+images.length+(score?1:0);
  if(!count)throw Error('Empty packet: no new content to stage');
  return {restaurant_id:packet.restaurant_id,name_ko,road_address_ko,identityRef,localizations,tags,menus,images,score};
}

function stagingConnection(url){
  let parsed;
  try{parsed=new URL(url)}catch{throw Error('DATABASE_URL required')}
  const local=['localhost','127.0.0.1'].includes(parsed.hostname);
  if(local){
    if(process.env.WHATEATO_CI_LOCAL_FIXTURE!=='ONLY_LOCAL_EPHEMERAL' ||
      process.env.WHATEATO_ENRICHMENT_STAGE_ACK!=='LOCAL_CI_ONLY')throw Error('local stage requires ephemeral CI fixture acknowledgements');
  }else{
    if(!/\.neon\.tech$/i.test(parsed.hostname)||
      process.env.WHATEATO_ENRICHMENT_STAGE_ACK!=='I_ACK_STAGING_ONLY'||
      process.env.WHATEATO_EXPECTED_NEON_BRANCH_ID!=='br-autumn-pine-b36z3utm'){
      throw Error('stage rejects production: only explicitly acknowledged WhatEatO Neon staging branch permitted');
    }
  }
  return {local};
}
export async function stagePacket(packet){
  const parsed=validatePacket(packet);
  const url=process.env.DATABASE_URL||'';
  const {local}=stagingConnection(url);
  const client=new pg.Client({connectionString:url,connectionTimeoutMillis:7000,
    application_name:'whateato_enrichment_draft_only'});
  await client.connect();
  try{
    const attest=await client.query("SELECT current_setting('neon.branch_id',true) AS branch_id");
    if(!local && attest.rows[0]?.branch_id!=='br-autumn-pine-b36z3utm')throw Error('Neon branch_id attestation failed; no writes performed');
    await client.query('BEGIN');
    await client.query("SET LOCAL statement_timeout='15000ms'");
    const target=await client.query(`SELECT id::text AS id,name_ko,road_address_ko FROM restaurants
      WHERE id=$1 AND business_status='active' AND publication_status='published' FOR SHARE`,[parsed.restaurant_id]);
    const r=target.rows[0];
    if(!r||r.name_ko!==parsed.name_ko||r.road_address_ko!==parsed.road_address_ko){
      throw Error('restaurant identity/address mismatch; no staging writes allowed');
    }
    for(const l of parsed.localizations){
      await client.query(`INSERT INTO restaurant_localizations
        (restaurant_id,locale,display_name,short_description,full_description,publication_state,source_notes,verified_at)
        VALUES($1,$2,$3,$4,$5,'review',$6,NULL)
        ON CONFLICT(restaurant_id,locale) DO UPDATE SET
          display_name=EXCLUDED.display_name,short_description=EXCLUDED.short_description,
          full_description=EXCLUDED.full_description,source_notes=EXCLUDED.source_notes,
          publication_state='review',verified_at=NULL,updated_at=now()
        WHERE restaurant_localizations.publication_state <> 'published'`,
        [parsed.restaurant_id,l.locale,l.display_name,l.short_description,l.full_description,l.source]);
    }
    for(const t of parsed.tags){
      await client.query(`INSERT INTO restaurant_tag_assignments
        (restaurant_id,tag_code,verification_state,evidence_ref,verified_at)
        VALUES($1,$2,'proposed',$3,NULL)
        ON CONFLICT(restaurant_id,tag_code) DO UPDATE SET
          verification_state='proposed',evidence_ref=EXCLUDED.evidence_ref,verified_at=NULL
        WHERE restaurant_tag_assignments.verification_state <> 'verified'`,
        [parsed.restaurant_id,t.code,t.source]);
    }
    for(const m of parsed.menus){
      const mid=stableUuid(parsed.restaurant_id,'menu',m.name,m.position);
      await client.query(`INSERT INTO restaurant_menus
        (id,restaurant_id,price_krw,position,publication_state,evidence_ref,price_verified_at)
        VALUES($1,$2,$3,$4,'draft',$5,NULL)
        ON CONFLICT(id) DO UPDATE SET
          price_krw=EXCLUDED.price_krw,position=EXCLUDED.position,evidence_ref=EXCLUDED.evidence_ref
        WHERE restaurant_menus.publication_state <> 'published'
          AND restaurant_menus.restaurant_id=EXCLUDED.restaurant_id`,
        [mid,parsed.restaurant_id,m.price_krw,m.position,m.source]);
      await client.query(`INSERT INTO restaurant_menu_localizations(menu_id,locale,name)
        VALUES($1,'ko',$2) ON CONFLICT(menu_id,locale) DO NOTHING`,[mid,m.name]);
    }
    for(const img of parsed.images){
      await client.query(`INSERT INTO restaurant_images
        (restaurant_id,storage_key,source_reference,usage_rights_reference,
         rights_status,publication_state,position,rights_verified_at,alt_ko)
        VALUES($1,$2,$3,$4,'pending','draft',0,NULL,$5)
        ON CONFLICT(storage_key) DO UPDATE SET
          source_reference=EXCLUDED.source_reference,
          usage_rights_reference=EXCLUDED.usage_rights_reference,
          alt_ko=EXCLUDED.alt_ko
        WHERE restaurant_images.restaurant_id=EXCLUDED.restaurant_id
          AND restaurant_images.publication_state <> 'published'`,
        [parsed.restaurant_id,img.key,img.source,img.rights,img.alt]);
    }
    if(parsed.score){
      await client.query(`INSERT INTO restaurant_editorial_scores
        (restaurant_id,score,methodology_version,evidence_summary,approval_state,verified_at)
        VALUES($1,$2,$3,$4,'review',NULL)
        ON CONFLICT(restaurant_id) DO UPDATE SET score=EXCLUDED.score,
          methodology_version=EXCLUDED.methodology_version,evidence_summary=EXCLUDED.evidence_summary,
          approval_state='review',verified_at=NULL,updated_at=now()
        WHERE restaurant_editorial_scores.approval_state <> 'approved'`,
        [parsed.restaurant_id,parsed.score.score,parsed.score.methodology,parsed.score.summary]);
    }
    await client.query('COMMIT');
    return {staged:true,branch:local?'ci-local':'staging',
      restaurant_id:parsed.restaurant_id,localizations:parsed.localizations.length,
      proposed_tags:parsed.tags.length,draft_menus:parsed.menus.length,
      pending_images:parsed.images.length,draft_score:Boolean(parsed.score),
      public_content_published:false};
  }catch(err){
    await client.query('ROLLBACK').catch(()=>{});
    throw err;
  }finally{await client.end()}
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [action,filename]=process.argv.slice(2);
  if(!['inspect','stage'].includes(action)||!filename){
    console.error('Usage: node scripts/enrichment_v1.mjs inspect|stage data/packet.json');
    process.exitCode=2;
  }else{
    try{
      const packet=JSON.parse(readFileSync(filename,'utf8'));
      if(action==='inspect'){
        const d=validatePacket(packet);
        console.log(JSON.stringify({valid:true,action:'inspect',restaurant_id:d.restaurant_id,
          localizations:d.localizations.length,tags:d.tags.length,menus:d.menus.length,
          images:d.images.length,editorial_score:Boolean(d.score),published:false},null,2));
      }else console.log(JSON.stringify(await stagePacket(packet),null,2));
    }catch(e){console.error('FAIL:',e.message);process.exitCode=1}
  }
}
