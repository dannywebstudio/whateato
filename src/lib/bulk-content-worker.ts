import type {PoolClient} from 'pg';
import type {BulkInput} from '@/lib/bulk-content-admin';

// Every operation runs in an item savepoint within one transaction.
// A failed item rolls back completely, without rolling back successful siblings.
export async function applyBulkItem(client:PoolClient,item:BulkInput):Promise<void>{
  const id=item.restaurant_id,p=item.payload;
  const active=await client.query<{id:string}>(`
    SELECT id::text FROM restaurants WHERE id=$1::uuid
      AND business_status='active' AND publication_status='published'
    FOR SHARE`,[id]);
  // Visibility release can apply even after a record has been hidden;
  // confirmed holds must not be changed for legally closed/deleted records.
  if(!active.rowCount)throw Error('restaurant_not_active');
  switch(item.kind){
    case 'localization': {
      await client.query(`
        INSERT INTO restaurant_localizations(
          restaurant_id,locale,display_name,short_description,full_description,
          publication_state,source_notes,verified_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,'published',$6,now(),now())
        ON CONFLICT (restaurant_id,locale) DO UPDATE SET
          display_name=EXCLUDED.display_name,short_description=EXCLUDED.short_description,
          full_description=EXCLUDED.full_description,publication_state='published',
          source_notes=EXCLUDED.source_notes,verified_at=now(),updated_at=now()`,
        [id,p.locale,p.display_name,p.short_description,p.full_description??null,p.source_notes]);
      return;
    }
    case 'localization_unpublish': {
      const changed=await client.query(`
        UPDATE restaurant_localizations SET publication_state='draft',updated_at=now()
        WHERE restaurant_id=$1 AND locale=$2`,[id,p.locale]);
      if(!changed.rowCount)throw Error('localization_missing');
      return;
    }
    case 'menu':{
      const key=p.key as string;
      // Serialize cross-batch writes to the same stable menu identity.
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[id+':'+key]);
      const old=await client.query<{menu_id:string}>(`
        SELECT menu_id::text FROM whateato_bulk_menu_keys
        WHERE restaurant_id=$1 AND external_key=$2`,[id,key]);
      let menuId=old.rows[0]?.menu_id;
      if(menuId){
        await client.query(`
          UPDATE restaurant_menus SET position=$2,price_krw=$3,
             evidence_ref=$4,publication_state='published',price_verified_at=NULL
          WHERE id=$1 AND restaurant_id=$5`,[
          menuId,p.position??0,p.price_krw??null,p.evidence_ref,id
        ]);
      }else{
        const created=await client.query<{id:string}>(`
          INSERT INTO restaurant_menus(restaurant_id,price_krw,position,publication_state,evidence_ref)
          VALUES ($1,$2,$3,'published',$4) RETURNING id::text`,[
          id,p.price_krw??null,p.position??0,p.evidence_ref
        ]);
        menuId=created.rows[0].id;
        await client.query(`
          INSERT INTO whateato_bulk_menu_keys(restaurant_id,external_key,menu_id)
          VALUES ($1,$2,$3)`,[id,key,menuId]);
      }
      await client.query(`
        INSERT INTO restaurant_menu_localizations(menu_id,locale,name,description)
        VALUES ($1,$2,$3,$4)
        ON CONFLICT(menu_id,locale) DO UPDATE SET
          name=EXCLUDED.name,description=EXCLUDED.description`,[
        menuId,p.locale,p.name,p.description??null
      ]);
      return;
    }
    case 'menu_unpublish':{
      const updated=await client.query(`
        UPDATE restaurant_menus m SET publication_state='draft'
        FROM whateato_bulk_menu_keys k
        WHERE k.menu_id=m.id AND k.restaurant_id=$1 AND k.external_key=$2`,
      [id,p.key]);
      if(!updated.rowCount)throw Error('menu_missing');
      return;
    }
    case 'tag':{
      if(p.enabled){
        const result=await client.query(`
          INSERT INTO restaurant_tag_assignments(
            restaurant_id,tag_code,verification_state,evidence_ref,verified_at)
          VALUES($1,$2,'verified',$3,now())
          ON CONFLICT (restaurant_id,tag_code) DO UPDATE SET
            verification_state='verified',evidence_ref=EXCLUDED.evidence_ref,
            verified_at=now() RETURNING restaurant_id`,[id,p.code,p.evidence_ref]);
        if(!result.rowCount)throw Error('unknown_tag');
      }else{
        await client.query('DELETE FROM restaurant_tag_assignments WHERE restaurant_id=$1 AND tag_code=$2',
          [id,p.code]);
      }
      return;
    }
    case 'hours':{
      await client.query(`
        INSERT INTO restaurant_opening_hours(restaurant_id,timezone,publication_state,source_url,verified_at,updated_at)
        VALUES ($1,'Asia/Seoul','published',$2,now(),now())
        ON CONFLICT(restaurant_id) DO UPDATE SET
          publication_state='published',source_url=EXCLUDED.source_url,
          verified_at=now(),updated_at=now()`,[id,p.source_url]);
      await client.query('DELETE FROM restaurant_opening_intervals WHERE restaurant_id=$1',[id]);
      const rows=(p.days as {weekday:number;intervals:[number,number][]}[])
        .flatMap(day=>day.intervals.map(interval=>({
          weekday:day.weekday,start_minute:interval[0],end_minute:interval[1]
        })));
      if(rows.length){
        await client.query(`
          INSERT INTO restaurant_opening_intervals(restaurant_id,weekday,start_minute,end_minute)
          SELECT $1::uuid,x.weekday,x.start_minute,x.end_minute
          FROM jsonb_to_recordset($2::jsonb)
            AS x(weekday smallint,start_minute smallint,end_minute smallint)`,
        [id,JSON.stringify(rows)]);
      }
      return;
    }
    case 'visibility_hide':{
      const result=await client.query(`
        INSERT INTO restaurant_data_quality_reviews(
          restaurant_id,issue_code,severity,review_state,evidence_ref,evidence_summary,
          reviewer_ref,reviewed_at,updated_at)
        VALUES ($1,'OTHER','high','confirmed_hold',$2,$3,'content_batch_admin',now(),now())
        ON CONFLICT(restaurant_id,issue_code) DO UPDATE SET
          review_state='confirmed_hold',severity='high',evidence_ref=EXCLUDED.evidence_ref,
          evidence_summary=EXCLUDED.evidence_summary,reviewer_ref='content_batch_admin',
          reviewed_at=now(),updated_at=now()
        WHERE restaurant_data_quality_reviews.reviewer_ref='content_batch_admin'
        RETURNING restaurant_id`,[id,p.evidence_ref,p.evidence_summary]);
      if(!result.rowCount)throw Error('non_admin_quality_flag_exists');
      return;
    }
    case 'visibility_restore':{
      const result=await client.query(`
        DELETE FROM restaurant_data_quality_reviews
        WHERE restaurant_id=$1 AND issue_code='OTHER' AND reviewer_ref='content_batch_admin'
        RETURNING restaurant_id`,[id]);
      if(!result.rowCount)throw Error('admin_hold_missing');
      return;
    }
    default:{
      const exhaustive:never=item.kind;
      throw Error('unknown_bulk_kind_'+exhaustive);
    }
  }
}
