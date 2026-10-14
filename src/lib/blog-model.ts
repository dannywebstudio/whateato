import {isUuid} from '@/lib/platform-v1';
export const BLOG_CATEGORIES={
 'food-guides':'Food Guides','neighborhoods':'Neighborhoods','korean-food':'Korean Food',
 'dining-tips':'Dining Tips','food-culture':'Food Culture'
} as const;
export const BLOG_LOCALES=['en','ja','zh-CN','ko'] as const;
export type BlogLocale=typeof BLOG_LOCALES[number];
export type BlogCategory=keyof typeof BLOG_CATEGORIES;
export type BlogBlock={id:string;type:'paragraph'|'heading'|'quote'|'list'|'table'|'image'|'divider';
 text?:string;level?:2|3;items?:string[];rows?:string[][];image_id?:string;caption?:string};
export type BlogTranslation={title:string;excerpt:string;seo_title:string;seo_description:string;blocks:BlogBlock[]};
export type BlogDraft={
 category:BlogCategory;tags:string[];related_restaurant_ids:string[];
 translations:Partial<Record<BlogLocale,BlogTranslation>>
};
const text=(v:unknown,max:number)=>typeof v==='string'&&v.length<=max&&
 !/[\u0000-\u0008\u000b-\u001f\u007f]/.test(v);
const record=(x:unknown):x is Record<string,unknown>=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const exact=(o:Record<string,unknown>,keys:string[])=>Object.keys(o).every(k=>keys.includes(k));
const strArray=(v:unknown,maxLength:number,maxItems:number,pattern?:RegExp)=>Array.isArray(v)&&
 v.length<=maxItems&&v.every(x=>text(x,maxLength)&&(pattern?pattern.test(x):true));
export function validBlogSlug(slug:unknown):slug is string{
 return typeof slug==='string'&&slug.length>=3&&slug.length<=90&&
 /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}
export function parseBlogDraft(raw:unknown):BlogDraft|null{
 if(!record(raw)||!exact(raw,['category','tags','related_restaurant_ids','translations'])||
   typeof raw.category!=='string'||!(raw.category in BLOG_CATEGORIES)||
   !strArray(raw.tags,40,8,/^[a-z][a-z0-9-]{1,39}$/)||
   !strArray(raw.related_restaurant_ids,36,8)||
   !(raw.related_restaurant_ids as string[]).every(isUuid)||
   !record(raw.translations)||
   !exact(raw.translations,[...BLOG_LOCALES]))return null;
 const tags=raw.tags as string[],restaurants=raw.related_restaurant_ids as string[];
 if(new Set(tags).size!==tags.length||new Set(restaurants).size!==restaurants.length)return null;
 const translations:Partial<Record<BlogLocale,BlogTranslation>>={};
 for(const [locale,entry] of Object.entries(raw.translations)){
  if(!record(entry)||!exact(entry,['title','excerpt','seo_title','seo_description','blocks'])||
    !text(entry.title,140)||!text(entry.excerpt,320)||
    !text(entry.seo_title,160)||!text(entry.seo_description,200)||
    !Array.isArray(entry.blocks)||entry.blocks.length>80)return null;
  const blocks:BlogBlock[]=[];
  let total=0;
  for(const original of entry.blocks){
   if(!record(original)||!exact(original,['id','type','text','level','items','rows','image_id','caption'])||
    typeof original.id!=='string'||!/^[a-z0-9-]{3,64}$/.test(original.id)||
    !['paragraph','heading','quote','list','table','image','divider'].includes(String(original.type)))
     return null;
   const kind=original.type as BlogBlock['type'];
   const block:BlogBlock={id:original.id,type:kind};
   if(['paragraph','heading','quote'].includes(kind)){
     if(!text(original.text,8000)||typeof original.text!=='string')return null;
     block.text=original.text;total+=original.text.length;
     if(kind==='heading'){
      if(original.level!==2&&original.level!==3)return null;
      block.level=original.level;
     }
   }else if(kind==='list'){
     if(!strArray(original.items,450,30))return null;
     block.items=original.items as string[];
     total+=block.items.join('').length;
   }else if(kind==='table'){
     if(!Array.isArray(original.rows)||original.rows.length<1||original.rows.length>20||
       !original.rows.every(row=>strArray(row,240,6)&&row.length>=2))return null;
     const rows=original.rows as string[][];
     if(rows.some(r=>r.length!==rows[0].length))return null;
     block.rows=rows;total+=rows.flat().join('').length;
   }else if(kind==='image'){
     if(!(original.image_id===''||isUuid(original.image_id))||
        !text(original.caption,250))return null;
     block.image_id=original.image_id as string;
     block.caption=original.caption as string;
   }
   blocks.push(block);
  }
  if(total>120000||new Set(blocks.map(b=>b.id)).size!==blocks.length)return null;
  translations[locale as BlogLocale]={
   title:(entry.title as string).trim(),excerpt:(entry.excerpt as string).trim(),
   seo_title:(entry.seo_title as string).trim(),seo_description:(entry.seo_description as string).trim(),
   blocks
  };
 }
 return {category:raw.category as BlogCategory,tags,related_restaurant_ids:restaurants,translations};
}
export function articleText(t:BlogTranslation){
 return t.blocks.map(b=>b.text||b.items?.join(' ')||b.rows?.flat().join(' ')||b.caption||'').join(' ');
}
export function publishableBlog(draft:BlogDraft):string|null{
 const english=draft.translations.en;
 if(!english||english.title.length<8)return 'english_title_required';
 if(english.excerpt.length<50)return 'english_summary_min_50';
 if(articleText(english).trim().length<200)return 'english_article_min_200';
 if(!english.blocks.some(b=>b.type==='heading'))return 'article_heading_required';
 if(Object.values(draft.translations).some(t=>t?.blocks.some(b=>b.type==='image'&&!b.image_id)))
   return 'select_images_before_publishing';
 return null;
}
