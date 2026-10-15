import type {MetadataRoute} from 'next';
import {seoPublicEnabled,SEO_CANONICAL_ORIGIN,SEO_RESTAURANT_IDS} from '@/lib/public-seo';

export const dynamic='force-dynamic';

// Indexing can be enabled separately from the site's restricted restaurant preview.
// All unapproved restaurant paths, private APIs, search queries and maps stay blocked.
export default function robots():MetadataRoute.Robots{
  if(!seoPublicEnabled())return {rules:[{userAgent:'*',disallow:'/'}]};
  return {
    rules:[{
      userAgent:'*',
      allow:['/',...SEO_RESTAURANT_IDS.map(id=>'/restaurant/'+id)],
      disallow:['/api/','/admin/','/account/','/qa/','/search','/map','/restaurant/']
    }],
    sitemap:SEO_CANONICAL_ORIGIN+'/sitemap.xml',
    host:SEO_CANONICAL_ORIGIN
  };
}
