-- STAGING ONLY. Run only after a human marks C_CONFIRMED with verified evidence.
-- Entire DO block is atomic. NEVER delete C_REVIEW or missing-coordinate B.
-- Any dependent CMS/menu/review/analytics/cohort row protects the restaurant
-- from hard deletion. The only permitted dependents are license-source refs,
-- quality-review flags and the triage + human-confirmation records.
-- Archive every permitted row *before* hard deletion.
DO $safe_delete$
DECLARE
 target record;
 dep record;
 still_used boolean;
 blocked boolean;
 archived_count integer;
 deleted_count integer:=0;
 skipped_count integer:=0;
BEGIN
 FOR target IN
   SELECT r.id,to_jsonb(r) AS original
   FROM restaurants r
   JOIN whateato_restaurant_triage_v1 t ON t.restaurant_id=r.id
   JOIN whateato_c_confirmation_v1 e ON e.restaurant_id=r.id
   WHERE t.grade='C_CONFIRMED'
     AND t.visibility='hidden'
     AND e.reviewed_at IS NOT NULL
     AND e.evidence_url LIKE 'https://%'
     AND e.reviewer_ref IS NOT NULL
   ORDER BY r.id
   FOR UPDATE OF r
 LOOP
   blocked:=false;
   -- Database metadata prevents accidental cascading deletion if future
   -- migrations add further linked restaurant records.
   FOR dep IN
     SELECT fk.conrelid::regclass AS child_table, a.attname AS fk_column
     FROM pg_constraint fk JOIN pg_attribute a
       ON a.attrelid=fk.conrelid AND a.attnum=fk.conkey[1]
     WHERE fk.contype='f' AND fk.confrelid='restaurants'::regclass
       AND cardinality(fk.conkey)=1
       AND fk.conrelid NOT IN (
         'restaurant_source_refs'::regclass,
         'restaurant_data_quality_reviews'::regclass,
         'whateato_restaurant_triage_v1'::regclass,
         'whateato_c_confirmation_v1'::regclass
       )
   LOOP
     EXECUTE format('SELECT EXISTS(SELECT 1 FROM %s WHERE %I=$1)',
       dep.child_table,dep.fk_column)
       INTO still_used USING target.id;
     IF still_used THEN
       blocked:=true;
       RAISE NOTICE 'SKIP %: dependent records in %',
         target.id,dep.child_table;
       EXIT;
     END IF;
   END LOOP;
   IF blocked THEN skipped_count:=skipped_count+1; CONTINUE; END IF;
   INSERT INTO whateato_c_delete_archive_v1
     (restaurant_id,restaurant_snapshot,source_refs_snapshot,
      dependent_rows_snapshot,evidence_snapshot)
   SELECT
     target.id,target.original,
     COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM restaurant_source_refs s
       WHERE s.restaurant_id=target.id),'[]'::jsonb),
     jsonb_build_object('quality_reviews',COALESCE(
       (SELECT jsonb_agg(to_jsonb(q)) FROM restaurant_data_quality_reviews q
        WHERE q.restaurant_id=target.id),'[]'::jsonb)),
     jsonb_build_object(
       'triage',(SELECT to_jsonb(t) FROM whateato_restaurant_triage_v1 t
         WHERE t.restaurant_id=target.id),
       'human_confirmation',(SELECT to_jsonb(e) FROM whateato_c_confirmation_v1 e
         WHERE e.restaurant_id=target.id))
   ON CONFLICT(restaurant_id) DO NOTHING;
   GET DIAGNOSTICS archived_count=ROW_COUNT;
   IF archived_count<>1 THEN
     RAISE NOTICE 'SKIP %: archive already exists',target.id;
     skipped_count:=skipped_count+1;
     CONTINUE;
   END IF;
   DELETE FROM restaurant_source_refs WHERE restaurant_id=target.id;
   DELETE FROM restaurant_data_quality_reviews WHERE restaurant_id=target.id;
   DELETE FROM whateato_restaurant_triage_v1 WHERE restaurant_id=target.id
     AND grade='C_CONFIRMED';
   DELETE FROM whateato_c_confirmation_v1 WHERE restaurant_id=target.id;
   DELETE FROM restaurants WHERE id=target.id;
   GET DIAGNOSTICS archived_count=ROW_COUNT;
   IF archived_count<>1 THEN
     RAISE EXCEPTION 'Confirmed deletion unexpectedly did not delete %',target.id;
   END IF;
   deleted_count:=deleted_count+1;
 END LOOP;
 RAISE NOTICE 'Confirmed C hard deleted: %, protected/skipped: %',
   deleted_count,skipped_count;
END $safe_delete$;
