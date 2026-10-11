import type {MetadataRoute} from 'next';
export default function robots():MetadataRoute.Robots{if(process.env.NEXT_PUBLIC_LAUNCH_READY!=='true')return {rules:[{userAgent:'*',disallow:'/'}]};return {rules:[{userAgent:'*',allow:'/'}]}}
