import {reserveGooglePhotoQuota,isVerifiedPilotPlace} from '@/lib/google-photo-quota';
/**
 * Google Places Photo (New) server-only adapter.
 * DENY BY DEFAULT. No invocation from public pages until owner-reviewed quota
 * controls, place identity verification, credit reconciliation and attribution
 * UI are available. This file intentionally performs no call on import.
 * No Google content/photo name/photo URI should be cached or persisted.
 */
export type GooglePhotoAttribution={
  displayName:string;uri:string|null;photoUri:string|null;
};
export type LiveGooglePhoto={
  photoName:string; // transient, never write to DB
  authorAttributions:GooglePhotoAttribution[];
  googleMapsUri:string|null;
};
export function googlePhotosEnabled():boolean{
  return process.env.WHATEATO_GOOGLE_PHOTO_APPROVED==='true' &&
    process.env.WHATEATO_GOOGLE_PHOTO_QUOTA_GUARD_READY==='true';
}
export function assertPhotoPolicyReady(){
  if(!googlePhotosEnabled())throw new Error('google_photo_disabled_pending_quota_and_attribution_qa');
}
function validPlaceId(id:string){
  return /^[A-Za-z0-9_-]{12,255}$/.test(id);
}
/**
 * Fetch transient photo references for a manually verified Google Place ID.
 * Chargeable: Place Details (New) photo metadata SKU can be billed. Caller
 * MUST reserve a persistent per-SKU allowance BEFORE calling this function.
 */
export async function getTransientPhotoReferences(restaurantId:string,placeId:string,apiKey:string):Promise<LiveGooglePhoto[]>{
  assertPhotoPolicyReady();
  if(!validPlaceId(placeId))throw new Error('invalid_google_place_id');
  if(!apiKey)throw new Error('missing_server_side_google_places_key');
  if(!await isVerifiedPilotPlace(restaurantId,placeId))throw new Error('google_place_identity_not_verified');
  if(!await reserveGooglePhotoQuota('place_details_photo_metadata'))throw new Error('google_photo_quota_exhausted');
  const url='https://places.googleapis.com/v1/places/'+encodeURIComponent(placeId);
  const r=await fetch(url,{headers:{'X-Goog-Api-Key':apiKey,'X-Goog-FieldMask':'photos.name,photos.authorAttributions,photos.googleMapsUri,googleMapsUri'},
    cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!r.ok)throw new Error('google_place_details_failed_'+r.status);
  const response=await r.json() as {photos?:unknown[];googleMapsUri?:unknown};
  return (Array.isArray(response.photos)?response.photos:[]).slice(0,3)
    .filter((p:unknown):p is {name:string;googleMapsUri?:string;authorAttributions?:GooglePhotoAttribution[]} =>
      Boolean(p && typeof p==='object' && typeof (p as {name?:unknown}).name==='string'))
    .map(p=>({photoName:p.name,authorAttributions:Array.isArray(p.authorAttributions)?p.authorAttributions:[],
      googleMapsUri:typeof p.googleMapsUri==='string'?p.googleMapsUri:
        typeof response.googleMapsUri==='string'?response.googleMapsUri:null}));
}
/**
 * Photo Media (New): may be chargeable on each request. Never store/redirect
 * to a long-lived URI, never remove visible author + Google Maps attribution.
 * Reserve persistent quota before invocation. Caller must stream with no-store.
 */
export async function getLivePhotoBytes(restaurantId:string,placeId:string,photoName:string,apiKey:string):Promise<Response>{
  assertPhotoPolicyReady();
  if(!/^places\/[A-Za-z0-9_-]{12,255}\/photos\/[A-Za-z0-9_-]{3,600}$/.test(photoName))
    throw new Error('invalid_google_photo_resource');
  if(!apiKey)throw new Error('missing_server_side_google_places_key');
  if(!photoName.startsWith('places/'+placeId+'/'))throw new Error('place_photo_identity_mismatch');
  if(!await isVerifiedPilotPlace(restaurantId,placeId))throw new Error('google_place_identity_not_verified');
  if(!await reserveGooglePhotoQuota('place_photo_media'))throw new Error('google_photo_quota_exhausted');
  const url='https://places.googleapis.com/v1/'+photoName+'/media?maxWidthPx=640&skipHttpRedirect=true';
  return fetch(url,{headers:{'X-Goog-Api-Key':apiKey},cache:'no-store',signal:AbortSignal.timeout(10000)});
}
