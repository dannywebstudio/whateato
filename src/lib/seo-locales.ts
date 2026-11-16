import {SEO_CANONICAL_ORIGIN} from '@/lib/public-seo';

export const SEO_LOCALES=['en','ja','ko','zh-CN'] as const;
export type SeoLocale=typeof SEO_LOCALES[number];

export function isSeoLocale(value:unknown):value is SeoLocale{
 return typeof value==='string'&&SEO_LOCALES.some(locale=>locale===value);
}

// Keep current public URLs stable; do not invent /ko or /zh routes that do not exist.
// The Japanese article has a dedicated path. Korean/Chinese articles use the
// server-rendered ?hl= variant and have their own self-referencing canonical.
export function blogArticlePath(slug:string,locale:SeoLocale){
 if(locale==='en')return '/blog/'+slug;
 if(locale==='ja')return '/ja/blog/'+slug;
 return '/blog/'+slug+'?hl='+encodeURIComponent(locale);
}
export function blogIndexPath(locale:SeoLocale){
 return locale==='en'?'/blog':'/blog?hl='+encodeURIComponent(locale);
}
export function restaurantPath(id:string,locale:SeoLocale){
 return locale==='ko'?'/restaurant/'+id:'/restaurant/'+id+'?hl='+encodeURIComponent(locale);
}
export function absoluteSeoUrl(path:string){return SEO_CANONICAL_ORIGIN+path;}
export function localizedAlternates(
 pathForLocale:(locale:SeoLocale)=>string,
 available:readonly SeoLocale[],
 fallback:SeoLocale
):Record<string,string>{
 const languages:Record<string,string>={};
 const unique=SEO_LOCALES.filter(locale=>available.includes(locale));
 for(const locale of unique)languages[locale]=absoluteSeoUrl(pathForLocale(locale));
 if(unique.includes(fallback))languages['x-default']=absoluteSeoUrl(pathForLocale(fallback));
 return languages;
}
