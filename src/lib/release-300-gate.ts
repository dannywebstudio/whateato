// The 300-venue launch switch is OFF unless explicitly enabled.
// This gate is evaluated server-side and shared by Search, Map and Detail.
// The staging cohort, its QA views and approval workflow must be migrated
// to the target database BEFORE WHATEATO_RELEASE_COHORT_300_ONLY=true.
// Never return unreviewed venues when release-only mode is enabled.
export function release300PublicWhere():string {
 if(process.env.WHATEATO_RELEASE_COHORT_300_ONLY!=='true')return '';
 return `
   AND EXISTS (
     SELECT 1 FROM whateato_release_cohort_readiness_v1 ready
     WHERE ready.restaurant_id=r.id
       AND ready.review_state='approved'
       AND ready.published_verified_menu_count>0
       AND ready.has_four_locales=true
       AND ready.address_state<>'missing'
       AND NOT EXISTS (
         SELECT 1 FROM whateato_release_cohort_locale_tasks_v1 x
         WHERE x.restaurant_id=r.id
           AND (x.locale_state<>'published'
             OR x.verified_menu_translations<x.verified_korean_menus)
       )
   )`;
}
