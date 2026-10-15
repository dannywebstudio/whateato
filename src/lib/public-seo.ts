// SEO publication is independent of the preview and feature launch flags.
// Never broaden restaurant search/SEO when enabling blog indexing.
export const SEO_CANONICAL_ORIGIN='https://whateato.com';
export const SEO_RESTAURANT_IDS=[
  '16918f58-4e63-4e49-a013-aad17e499ad4', // 광화문 미진
  '6cc37914-1bb8-406e-a365-34c897b4f26f', // 청진옥
  '2daa58f1-6360-4ddb-a27f-6e6d1437a122'  // 우래옥
] as const;

export function seoPublicEnabled():boolean{
  return process.env.WHATEATO_SEO_PUBLIC_ENABLED==='true'
    && (process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'')===SEO_CANONICAL_ORIGIN;
}
export function isSeoRestaurant(id:string):boolean{
  return (SEO_RESTAURANT_IDS as readonly string[]).includes(id.toLowerCase());
}
