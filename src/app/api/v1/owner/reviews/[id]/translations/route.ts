import {NextRequest,NextResponse} from 'next/server';
import {currentStaff,hasPermission,safeSameOrigin,ownerHeaders} from '@/lib/owner-cms-auth';
import {getPool} from '@/lib/db';
import {isUuid} from '@/lib/platform-v1';
export const runtime='nodejs';
type Ctx={params:Promise<{id:string}>};
const respond=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:ownerHeaders});
const locales=['ko','en','ja','zh-CN'] as const;
export async function POST(req:NextRequest,{params}:Ctx){
 const staff=await currentStaff();
 if(!staff||!hasPermission(staff,'moderate'))return respond({error:'moderator_required'},403);
 if(!safeSameOrigin(req))return respond({error:'cross_site_request'},403);
 const {id}=await params;if(!isUuid(id))return respond({error:'invalid_review_id'},400);
 if(!req.headers.get('content-type')?.startsWith('application/json'))return respond({error:'json_required'},415);
 const raw=await req.text();
 if(raw.length>9000)return respond({error:'json_too_large'},413);
 let json:unknown;
 try{json=JSON.parse(raw)}catch{return respond({error:'invalid_json'},400)}
 if(!json||typeof json!=='object'||Array.isArray(json))return respond({error:'invalid_translation_json'},400);
 const record=json as Record<string,unknown>;
 if(Object.keys(record).length!==4||!locales.every(locale=>Object.hasOwn(record,locale)&&
  typeof record[locale]==='string'&&(record[locale] as string).trim().length>=30&&
  (record[locale] as string).trim().length<=1500))
  return respond({error:'required_locales_ko_en_ja_zh-CN_30_to_1500_characters'},400);
 const bodies=Object.fromEntries(locales.map(k=>[k,(record[k] as string).trim()]));
 const pool=getPool();if(!pool)return respond({error:'database_unavailable'},503);
 try{
  const r=await pool.query(`INSERT INTO whateato_review_translations(review_id,bodies,updated_by)
   SELECT r.id,$2::jsonb,$3::uuid FROM whateato_user_reviews r
   WHERE r.id=$1 AND r.moderation_status IN ('pending','published')
   ON CONFLICT(review_id) DO UPDATE SET bodies=EXCLUDED.bodies,updated_by=EXCLUDED.updated_by,updated_at=now()
   RETURNING review_id`,[id,JSON.stringify(bodies),staff.accountId]);
  if(!r.rowCount)return respond({error:'review_not_found_or_rejected'},404);
  return respond({saved:true,locales});
 }catch{return respond({error:'review_translation_unavailable'},503)}
}
