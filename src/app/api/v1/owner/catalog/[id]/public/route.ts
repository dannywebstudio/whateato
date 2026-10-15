import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,ownerHeaders,safeSameOrigin} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
import {boundedJson} from '@/lib/bulk-content-admin';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Ctx={params:Promise<{id:string}>};
const respond=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:ownerHeaders});

// Never let bulk imports, editors or ordinary Google reviewers expose venues.
// Only an authenticated, enabled owner can explicitly approve or revoke.
export async function POST(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'publish'))return respond({error:'owner_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id}=await params;
 if(!isUuid(id))return respond({error:'invalid_restaurant_id'},400);
 const parsed=await boundedJson(req,2048);
 if(!parsed.ok)return respond({error:parsed.error},parsed.status);
 const p=parsed.value;
 if(!p||typeof p!=='object'||Array.isArray(p))return respond({error:'invalid_action'},400);
 const input=p as Record<string,unknown>;
 if(Object.keys(input).some(k=>!['action','confirm_restaurant_id','evidence_url'].includes(k))||
   !['approve','revoke'].includes(String(input.action))||input.confirm_restaurant_id!==id)
   return respond({error:'explicit_confirmation_required'},400);
 const action=input.action as 'approve'|'revoke';
 const evidence=typeof input.evidence_url==='string'?input.evidence_url.trim():'';
 if(action==='approve'&&(
   evidence.length<10||evidence.length>700||!/^https:\/\/[^\s/@:]+[^\s]*$/i.test(evidence)))
   return respond({error:'verified_evidence_url_required'},400);
 const pool=getPool();
 if(!pool)return respond({error:'database_not_configured'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const row=await client.query<{name_ko:string;publication_status:string;business_status:string;
    coordinates:boolean;ko:boolean;en:boolean;hours:boolean;menu:boolean;tags:boolean;
    quality_hold:boolean;grade_c:boolean}>(`
   SELECT r.name_ko,r.publication_status,r.business_status,
    (r.latitude BETWEEN 33 AND 39.5 AND r.longitude BETWEEN 124 AND 132) AS coordinates,
    EXISTS(SELECT 1 FROM restaurant_localizations l WHERE l.restaurant_id=r.id
      AND l.locale='ko' AND l.publication_state='published' AND l.verified_at IS NOT NULL
      AND char_length(btrim(l.short_description))>=35) AS ko,
    EXISTS(SELECT 1 FROM restaurant_localizations l WHERE l.restaurant_id=r.id
      AND l.locale='en' AND l.publication_state='published' AND l.verified_at IS NOT NULL
      AND char_length(btrim(l.short_description))>=35) AS en,
    EXISTS(SELECT 1 FROM restaurant_opening_hours h
      WHERE h.restaurant_id=r.id AND h.publication_state='published'
        AND h.verified_at IS NOT NULL AND NULLIF(btrim(h.source_url),'') IS NOT NULL
        AND EXISTS(SELECT 1 FROM restaurant_opening_intervals i
          WHERE i.restaurant_id=r.id AND i.end_minute>i.start_minute)) AS hours,
    EXISTS(SELECT 1 FROM restaurant_menus m WHERE m.restaurant_id=r.id
      AND m.publication_state='published' AND NULLIF(btrim(m.evidence_ref),'') IS NOT NULL) AS menu,
    EXISTS(SELECT 1 FROM restaurant_tag_assignments t WHERE t.restaurant_id=r.id
      AND t.verification_state='verified' AND NULLIF(btrim(t.evidence_ref),'') IS NOT NULL) AS tags,
    EXISTS(SELECT 1 FROM restaurant_data_quality_reviews q
      WHERE q.restaurant_id=r.id AND q.review_state='confirmed_hold') AS quality_hold,
    EXISTS(SELECT 1 FROM whateato_restaurant_triage_v1 t WHERE t.restaurant_id=r.id
      AND (t.grade='C' OR t.visibility NOT IN ('full','basic_map','basic_search_only'))) AS grade_c
   FROM restaurants r WHERE r.id=$1 FOR UPDATE`,[id]);
  if(!row.rowCount){await client.query('ROLLBACK');return respond({error:'not_found'},404)}
  const data=row.rows[0];
  if(action==='approve'){
    const blockers=[
      ...(data.publication_status!=='published'||data.business_status!=='active'?['publish_venue_first']:[]),
      ...(!data.ko?['verified_korean_description']:[]),
      ...(!data.en?['verified_english_description']:[]),
      ...(!data.hours?['verified_opening_hours']:[]),
      ...(!data.menu?['verified_main_menu']:[]),
      ...(!data.tags?['verified_tag']:[]),
      ...(!data.coordinates?['confirmed_coordinates']:[]),
      ...(data.quality_hold?['quality_hold']:[]),
      ...(data.grade_c?['triage_c_or_hidden']:[])
    ];
    if(blockers.length){await client.query('ROLLBACK');return respond({error:'public_approval_preflight_failed',blockers},409)}
    await client.query(`
      INSERT INTO whateato_restaurant_public_approvals_v1
       (restaurant_id,is_visible,approval_source,approved_by,approved_at,evidence_url,revoked_by,revoked_at)
      VALUES($1,true,'owner',$2,now(),$3,NULL,NULL)
      ON CONFLICT(restaurant_id) DO UPDATE SET
       is_visible=true,approval_source='owner',approved_by=$2,approved_at=now(),
       evidence_url=$3,revoked_by=NULL,revoked_at=NULL`,[id,staff.accountId,evidence]);
  }else{
    const revoked=await client.query(`
      UPDATE whateato_restaurant_public_approvals_v1 SET
       is_visible=false,revoked_by=$2,revoked_at=now()
      WHERE restaurant_id=$1 AND is_visible=true RETURNING restaurant_id`,
      [id,staff.accountId]);
    if(!revoked.rowCount){await client.query('ROLLBACK');return respond({error:'restaurant_not_public'},409)}
  }
  await client.query(`
   INSERT INTO whateato_public_restaurant_approval_audit_v1
     (restaurant_id,actor_id,action,evidence_url)
   VALUES($1,$2,$3,$4)`,[id,staff.accountId,action,action==='approve'?evidence:null]);
  await client.query('COMMIT');
  return respond({restaurant_id:id,name:data.name_ko,public_approved:action==='approve',
    sitemap_auto_update:true});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return respond({error:'public_restaurant_approval_unavailable'},503);
 }finally{client.release()}
}
