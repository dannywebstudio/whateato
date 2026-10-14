import type {MetadataRoute} from 'next';

// Preview remains blocked. Enable only on the final canonical origin.
export default function robots():MetadataRoute.Robots{
  const origin=(process.env.NEXT_PUBLIC_SITE_URL||'').replace(/\/$/,'');
  const launchReady=process.env.NEXT_PUBLIC_LAUNCH_READY==='true'
    && /^https:\/\/[^/]+$/.test(origin);
  if(!launchReady) return {rules:[{userAgent:'*',disallow:'/'}]};
  return {
    rules:[{
      userAgent:'*',
      allow:'/',
      disallow:['/api/','/admin/','/account/','/qa/','/search','/map']
    }],
    sitemap:origin+'/sitemap.xml',
    host:origin
  };
}
