import type {MetadataRoute} from 'next';
import {approvedSeoRestaurantIds,seoPublicEnabled,SEO_CANONICAL_ORIGIN} from '@/lib/public-seo';

export const dynamic='force-dynamic';

// Explicitly allow only owner-approved detail URLs, no other restaurant IDs.
// Public blog routes are crawlable without publishing any hidden restaurant.
export default async function robots():Promise<MetadataRoute.Robots>{
 if(!seoPublicEnabled())return {rules:[{userAgent:'*',disallow:'/'}]};
 const ids=await approvedSeoRestaurantIds();
 return {
  rules:[{
   userAgent:'*',
   allow:['/',...ids.map(id=>'/restaurant/'+id)],
   disallow:['/api/','/admin/','/account/','/qa/','/search','/map','/restaurant/']
  }],
  sitemap:SEO_CANONICAL_ORIGIN+'/sitemap.xml',
  host:SEO_CANONICAL_ORIGIN
 };
}
