export const LOCALES = ['ko','en','ja','zh-CN'] as const;
export type Locale=(typeof LOCALES)[number];
export function normalizeLocale(input:unknown):Locale{
  if(typeof input!=='string')return 'ko';
  const value=input.trim().toLowerCase();
  if(value==='en'||value.startsWith('en-'))return 'en';
  if(value==='ja'||value.startsWith('ja-'))return 'ja';
  if(value==='zh-cn'||value==='zh'||value.startsWith('zh-hans'))return 'zh-CN';
  return 'ko';
}
export const UUID_RE=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(id:unknown):id is string{return typeof id==='string'&&UUID_RE.test(id);}
export function normalizeText(input:unknown,max=80):string{
  return typeof input==='string'?input.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,max):'';
}
export function safeSearchTerm(input:unknown):string|null{
  const value=normalizeText(input,80);
  if(!value)return null;
  // Do not persist likely PII typed into the search box.
  if(/@|\d{6,}|(?:\d[- .]?){7,}\d/.test(value))return null;
  return value;
}
export function escapeLike(value:string){return value.replace(/[\\%_]/g,'\\$&');}
export function normalizeTags(input:string|null):string[]{
  return [...new Set((input||'').split(',').map(s=>s.trim()).filter(s=>/^[a-z][a-z0-9_]{1,63}$/.test(s)))].slice(0,12);
}
