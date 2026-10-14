import {NextRequest,NextResponse} from 'next/server';
import {auth,authReady} from '@/auth';
import {getPool} from '@/lib/db';
import {getPublicReviews,validUuid,validateReview} from '@/lib/reviews';
import {categoryInput} from '@/lib/review-categories';
import {safeSameOrigin} from '@/lib/owner-cms-auth';
import {boundedJson} from '@/lib/bulk-content-admin';

export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const noStore={'Cache-Control':'private, no-store','Vary':'Cookie'} as const;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:noStore});
async function actor(){
 if(!authReady())return null;
 const session=await auth();
 const id=session?.user?.id;
 return id&&validUuid(id)?id:null;
}
export async function GET(request:NextRequest,{params}:Context){
 const {id}=await params;
 if(!validUuid(id))return reply({error:'invalid_restaurant'},400);
 try{
  if(request.nextUrl.searchParams.get('mine')==='1'){
   const accountId=await actor();
   if(!accountId)return reply({error:'login_required'},401);
   const pool=getPool();if(!pool)return reply({error:'database_unavailable'},503);
   const result=await pool.query(`
    SELECT r.id::text,r.rating,r.body,r.moderation_status,
      CASE WHEN s.review_id IS NULL THEN NULL ELSE jsonb_build_object(
       'taste',s.taste,'service',s.service,'tourist_friendliness',s.tourist_friendliness,
       'value_for_money',s.value_for_money,'cleanliness',s.cleanliness) END AS categories,
      coalesce((SELECT jsonb_agg(jsonb_build_object(
       'id',p.id::text,'url','/api/review-photos/'||p.id::text,'status',p.moderation_state)
       ORDER BY p.position) FROM whateato_review_photo_assets p
       WHERE p.review_id=r.id),'[]'::jsonb) AS photos
    FROM whateato_user_reviews r LEFT JOIN whateato_review_category_scores s ON s.review_id=r.id
    WHERE r.restaurant_id=$1 AND r.account_id=$2 LIMIT 1`,[id,accountId]);
   return reply({review:result.rows[0]||null});
  }
  const reviews=await getPublicReviews(id);
  return reply({reviews,moderation:'Only approved reviews and photos are publicly shown'});
 }catch{return reply({error:'reviews_unavailable'},503)}
}
export async function POST(request:NextRequest,{params}:Context){
 const {id}=await params;
 if(!validUuid(id))return reply({error:'invalid_restaurant'},400);
 if(!safeSameOrigin(request))return reply({error:'cross_site_request'},403);
 const accountId=await actor();
 if(!accountId)return reply({error:'login_required'},401);
 const data=await boundedJson(request,8192);
 if(!data.ok)return reply({error:data.error},data.status);
 if(!data.value||typeof data.value!=='object'||Array.isArray(data.value))
  return reply({error:'invalid_review'},400);
 const p=data.value as Record<string,unknown>;
 if(Object.keys(p).some(key=>!['rating','body','categories'].includes(key)))
  return reply({error:'unexpected_fields'},400);
 const parsed=p.categories===undefined?null:categoryInput(p.categories);
 if(p.categories!==undefined&&!parsed)return reply({error:'invalid_category_scores'},400);
 const rating=parsed?.legacyRating??p.rating;
 const problem=validateReview(rating,p.body);
 if(problem)return reply({error:problem},400);
 const pool=getPool();if(!pool)return reply({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  // Upsert the author's ONE review for this restaurant, never duplicate public stars.
  const result=await client.query<{id:string}>(`
   INSERT INTO whateato_user_reviews(restaurant_id,account_id,rating,body)
   SELECT r.id,a.id,$3,$4 FROM restaurants r CROSS JOIN whateato_review_accounts a
   WHERE r.id=$1 AND a.id=$2 AND r.business_status='active' AND r.publication_status='published'
   ON CONFLICT(restaurant_id,account_id) DO UPDATE SET rating=EXCLUDED.rating,
     body=EXCLUDED.body,updated_at=now(),moderation_status='pending',reviewed_at=NULL
   RETURNING id::text`,[id,accountId,rating,(p.body as string).trim()]);
  if(!result.rows.length){await client.query('ROLLBACK');return reply({error:'not_found_or_account'},404)}
  const reviewId=result.rows[0].id;
  if(parsed){
   const x=parsed.scores;
   await client.query(`
    INSERT INTO whateato_review_category_scores
     (review_id,taste,service,tourist_friendliness,value_for_money,cleanliness)
    VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT(review_id) DO UPDATE SET taste=EXCLUDED.taste,service=EXCLUDED.service,
     tourist_friendliness=EXCLUDED.tourist_friendliness,value_for_money=EXCLUDED.value_for_money,
     cleanliness=EXCLUDED.cleanliness`,[
    reviewId,x.taste,x.service,x.tourist_friendliness,x.value_for_money,x.cleanliness
   ]);
  }else{
   await client.query('DELETE FROM whateato_review_category_scores WHERE review_id=$1',[reviewId]);
  }
  // Any edited review must be freshly moderated, including preexisting photos.
  await client.query(`UPDATE whateato_review_photo_assets SET moderation_state='pending'
      WHERE review_id=$1 AND moderation_state='approved'`,[reviewId]);
  await client.query('COMMIT');
  return reply({id:reviewId,status:'pending',average:parsed?.average??rating,
    message:'Review received; pending moderation'},202);
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return reply({error:'review_unavailable'},503);
 }finally{client.release()}
}
export async function DELETE(request:NextRequest,{params}:Context){
 const {id}=await params;
 if(!validUuid(id))return reply({error:'invalid_restaurant'},400);
 if(!safeSameOrigin(request))return reply({error:'cross_site_request'},403);
 const accountId=await actor();
 if(!accountId)return reply({error:'login_required'},401);
 const pool=getPool();if(!pool)return reply({error:'database_unavailable'},503);
 const client=await pool.connect();
 try{
  await client.query('BEGIN');
  const review=await client.query<{id:string}>(`
    SELECT id::text FROM whateato_user_reviews WHERE restaurant_id=$1 AND account_id=$2
    FOR UPDATE`,[id,accountId]);
  if(review.rows.length){
   const rid=review.rows[0].id;
   await client.query(`INSERT INTO whateato_review_photo_cleanup(storage_key)
     SELECT storage_key FROM whateato_review_photo_assets WHERE review_id=$1
     ON CONFLICT(storage_key) DO NOTHING`,[rid]);
   await client.query('DELETE FROM whateato_review_photo_assets WHERE review_id=$1',[rid]);
   await client.query('DELETE FROM whateato_review_category_scores WHERE review_id=$1',[rid]);
   // Preserve prior moderation audit through original review record? Existing model
   // uses FK RESTRICT audit; if audited, hide text instead of hard-deleting it.
   const audited=await client.query(`SELECT 1 FROM whateato_review_moderation_audit
       WHERE review_id=$1 LIMIT 1`,[rid]);
   if(audited.rowCount){
    await client.query(`UPDATE whateato_user_reviews SET moderation_status='rejected',
       body='Review removed by its author. Original text is no longer available.',
       rating=3,updated_at=now() WHERE id=$1`,[rid]);
   }else{
    await client.query('DELETE FROM whateato_user_reviews WHERE id=$1',[rid]);
   }
  }
  await client.query('COMMIT');
  return reply({deleted:true});
 }catch{
  await client.query('ROLLBACK').catch(()=>{});
  return reply({error:'review_unavailable'},503);
 }finally{client.release()}
}
