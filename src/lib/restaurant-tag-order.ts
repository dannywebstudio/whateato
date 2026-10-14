// Verified venue tags only. Put actual ambience before menu/style and district.
// The UI still receives the original tags and never promotes proposed candidates.
export type RestaurantTagWithCode={code:string};
const atmosphere=new Set([
 'date_night','quiet_vibe','cozy_vibe','casual_vibe','lively_vibe',
 'traditional_vibe','heritage_restaurant','hanok_interior','fine_dining',
 'group_meals','spacious_interiors','family_dining','exotic_vibe',
 'business_meal','after_work','counter_seating','terrace_seating'
]);
const service=new Set([
 'reservation_available','near_subway','english_menu',
 'solo_dining','traveler_friendly','lunch','dinner','budget_friendly'
]);
export function orderRestaurantTags<T extends RestaurantTagWithCode>(tags:T[]):T[]{
 const rank=(code:string)=>{
  if(atmosphere.has(code))return 0;
  if(code.startsWith('area_'))return 3;
  if(service.has(code))return 2;
  return 1; // dish & cuisine / other food specifics
 };
 return [...tags].sort((a,b)=>rank(a.code)-rank(b.code)||a.code.localeCompare(b.code));
}
