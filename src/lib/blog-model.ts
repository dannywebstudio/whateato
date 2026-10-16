import {isUuid} from '@/lib/platform-v1';
// Category taxonomy is stored in whateato_blog_categories and managed by CMS.
export type BlogCategoryInfo={
 slug:string;parent_slug:string|null;names:Record<string,string>;
 position:number;is_active:boolean
};
export const blogCategorySlug=(x:unknown):x is string=>typeof x==='string'&&
 x.length>=3&&x.length<=64&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x);
export function blogCategoryName(item:BlogCategoryInfo|undefined,locale:string='en'){
 return item?.names?.[locale]||item?.names?.en||item?.names?.ko||item?.slug||'Stories';
}
export const BLOG_LOCALES=['en','ja','zh-CN','ko'] as const;
export type BlogLocale=typeof BLOG_LOCALES[number];
export type BlogCategory=string;
export type BlogBlock={id:string;type:'paragraph'|'heading'|'quote'|'list'|'table'|'image'|'divider';
 text?:string;level?:2|3;items?:string[];rows?:string[][];image_id?:string;caption?:string;align?:'left'|'center'|'right';font_size?:number;image_width?:number;table_border_width?:number;table_border_color?:string;table_border_style?:'solid'|'dashed'|'dotted'|'none';table_col_widths?:number[];table_row_heights?:number[]};
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
   !blogCategorySlug(raw.category)||
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
   if(!record(original)||!exact(original,['id','type','text','level','items','rows','image_id','caption','align','font_size','image_width','table_border_width','table_border_color','table_border_style','table_col_widths','table_row_heights'])||
    typeof original.id!=='string'||!/^[a-z0-9-]{3,64}$/.test(original.id)||
    !['paragraph','heading','quote','list','table','image','divider'].includes(String(original.type)))
     return null;
   const kind=original.type as BlogBlock['type'];
   const block:BlogBlock={id:original.id,type:kind};
   if(original.align!==undefined){
    if(!['left','center','right'].includes(String(original.align)))return null;
    block.align=original.align as BlogBlock['align'];
   }
   if(original.font_size!==undefined){
    if(!Number.isInteger(original.font_size)||Number(original.font_size)<12||Number(original.font_size)>40)return null;
    block.font_size=Number(original.font_size);
   }
   if(original.image_width!==undefined){
    if(kind!=='image'||!Number.isInteger(original.image_width)||Number(original.image_width)<20||Number(original.image_width)>100)return null;
    block.image_width=Number(original.image_width);
   }
   if(kind==='table'){
    if(original.table_border_width!==undefined){
     if(!Number.isInteger(original.table_border_width)||Number(original.table_border_width)<0||Number(original.table_border_width)>8)return null;
     block.table_border_width=Number(original.table_border_width);
    }
    if(original.table_border_color!==undefined){
     if(typeof original.table_border_color!=='string'||!/^#[0-9a-fA-F]{6}$/.test(original.table_border_color))return null;
     block.table_border_color=original.table_border_color;
    }
    if(original.table_border_style!==undefined){
     if(!['solid','dashed','dotted','none'].includes(String(original.table_border_style)))return null;
     block.table_border_style=original.table_border_style as BlogBlock['table_border_style'];
    }
    if(original.table_col_widths!==undefined){
     if(!Array.isArray(original.table_col_widths)||original.table_col_widths.length>6||!original.table_col_widths.every(v=>Number.isInteger(v)&&v>=45&&v<=1200))return null;
     block.table_col_widths=original.table_col_widths as number[];
    }
    if(original.table_row_heights!==undefined){
     if(!Array.isArray(original.table_row_heights)||original.table_row_heights.length>20||!original.table_row_heights.every(v=>Number.isInteger(v)&&v>=25&&v<=600))return null;
     block.table_row_heights=original.table_row_heights as number[];
    }
   }
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
// One approved article = one atomic four-language publication snapshot.
export const BLOG_REQUIRED_LOCALES= ['en','ko','ja','zh-CN'] as const;
export const BLOG_LOCALE_LABELS:Record<BlogLocale,string>={
 en:'English · US',ko:'한국어',ja:'日本語','zh-CN':'简体中文'
};
export function blogLocaleReadiness(
 draft:BlogDraft,locale:BlogLocale
):{ready:boolean;error:string|null}{
 const t=draft.translations[locale];
 if(!t)return {ready:false,error:locale+'_translation_missing'};
 const minTitle=locale==='en'?8:4;
 const minSummary=locale==='en'?50:22;
 const minBody=locale==='en'?200:110;
 const minSeoDescription=locale==='en'?40:20;
 const base=locale.replace('-','_');
 if(t.title.trim().length<minTitle)return {ready:false,error:base+'_title_required'};
 if(t.excerpt.trim().length<minSummary)return {ready:false,error:base+'_summary_too_short'};
 if(t.seo_title.trim().length<minTitle)return {ready:false,error:base+'_seo_title_required'};
 if(t.seo_description.trim().length<minSeoDescription)
  return {ready:false,error:base+'_seo_description_too_short'};
 if(articleText(t).trim().length<minBody)return {ready:false,error:base+'_article_too_short'};
 if(!t.blocks.some(b=>b.type==='heading'&&(b.text||'').trim().length>=3))
  return {ready:false,error:base+'_article_heading_required'};
 if(t.blocks.some(b=>b.type==='image'&&!b.image_id))
  return {ready:false,error:base+'_select_images_before_publishing'};
 return {ready:true,error:null};
}
export function publishableBlog(draft:BlogDraft):string|null{
 for(const locale of BLOG_REQUIRED_LOCALES){
  const {error}=blogLocaleReadiness(draft,locale);
  if(error)return error;
 }
 // Detect accidental copy/paste of the same article into different language tabs.
 const signatures=BLOG_REQUIRED_LOCALES.map(locale=>articleText(draft.translations[locale]!)
  .toLowerCase().replace(/\s+/g,' ').trim());
 if(new Set(signatures).size!==signatures.length)return 'duplicate_locale_article_content';
 return null;
}
