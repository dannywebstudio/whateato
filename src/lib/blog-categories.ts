import {getPool} from '@/lib/db';
import {blogCategoryName,blogCategorySlug,type BlogCategoryInfo} from '@/lib/blog-model';
export type {BlogCategoryInfo};
export {blogCategoryName};
export async function getBlogCategories(includeInactive=false):Promise<BlogCategoryInfo[]>{
 const pool=getPool();if(!pool)return [];
 const r=await pool.query<BlogCategoryInfo>(`
  SELECT slug,parent_slug,names,position,is_active
  FROM whateato_blog_categories
  WHERE ($1::boolean OR is_active=true)
  ORDER BY CASE WHEN parent_slug IS NULL THEN 0 ELSE 1 END,position,slug`,[includeInactive]);
 return r.rows;
}
export function blogCategoryGroups(categories:BlogCategoryInfo[]){
 return categories.filter(c=>!c.parent_slug).map(root=>({
   ...root,children:categories.filter(c=>c.parent_slug===root.slug)
     .sort((a,b)=>a.position-b.position||a.slug.localeCompare(b.slug))
 }));
}
export function validateBlogCategoryNames(value:unknown):Record<string,string>|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const obj=value as Record<string,unknown>;
 if(Object.keys(obj).some(k=>!['en','ko','ja','zh-CN'].includes(k)))return null;
 if(typeof obj.en!=='string'||typeof obj.ko!=='string')return null;
 const out:Record<string,string>={};
 for(const [k,v] of Object.entries(obj)){
   if(typeof v!=='string'||v.trim().length<1||v.trim().length>100||
     /[\u0000-\u001f\u007f]/.test(v))return null;
   out[k]=v.trim();
 }
 if(out.en.length<2)return null;
 return out;
}
export async function categoryExistsActive(slug:string){
 if(!blogCategorySlug(slug))return false;
 const pool=getPool();if(!pool)return false;
 const row=await pool.query<{is_active:boolean}>(`
  SELECT is_active FROM whateato_blog_categories WHERE slug=$1 LIMIT 1`,[slug]);
 return row.rows[0]?.is_active===true;
}
