import {getPool} from '@/lib/db';
import {SEO_LOCALES,type SeoLocale} from '@/lib/seo-locales';

// Language index pages are SEO-eligible only when a visible CMS publication
// actually contains content in that language (not just an English fallback).
export async function publishedBlogIndexLocales():Promise<SeoLocale[]>{
 const pool=getPool();if(!pool)return [];
 try{
  const result=await pool.query<{
   en:boolean;ko:boolean;ja:boolean;zh_cn:boolean
  }>(`
   SELECT
    COALESCE(BOOL_OR(NULLIF(BTRIM(u.snapshot->'translations'->'en'->>'title'),'') IS NOT NULL),false) AS en,
    COALESCE(BOOL_OR(NULLIF(BTRIM(u.snapshot->'translations'->'ko'->>'title'),'') IS NOT NULL),false) AS ko,
    COALESCE(BOOL_OR(NULLIF(BTRIM(u.snapshot->'translations'->'ja'->>'title'),'') IS NOT NULL),false) AS ja,
    COALESCE(BOOL_OR(NULLIF(BTRIM(u.snapshot->'translations'->'zh-CN'->>'title'),'') IS NOT NULL),false) AS zh_cn
   FROM whateato_blog_publications u
   WHERE u.is_visible=true
  `);
  const row=result.rows[0];
  if(!row?.en)return [];
  return SEO_LOCALES.filter(locale=>
   locale==='en'?row.en:locale==='ko'?row.ko:
   locale==='ja'?row.ja:row.zh_cn);
 }catch{return []}
}
