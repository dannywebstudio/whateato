'use client';
import {useState} from 'react';
import {blogCategoryName,type BlogCategoryInfo} from '@/lib/blog-model';
import styles from './blog-editor.module.css';
type Shape={en:string;ko:string;ja:string;zhCN:string;slug:string;parent_slug:string;position:string};
const empty=():Shape=>({en:'',ko:'',ja:'',zhCN:'',slug:'',parent_slug:'',position:'100'});
const slugify=(v:string)=>v.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,64);
async function request(url:string,method:string,value:unknown){
 const res=await fetch(url,{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)});
 const data=await res.json().catch(()=>({error:'invalid_response'}));
 if(!res.ok)throw Error(String(data.error||'HTTP '+res.status));
 return data;
}
function editNames(form:Shape){
 return {'en':form.en.trim(),'ko':form.ko.trim(),
   ...(form.ja.trim()?{'ja':form.ja.trim()}:{}),
   ...(form.zhCN.trim()?{'zh-CN':form.zhCN.trim()}:{}),
 };
}
export default function BlogCategoryManager({items,onChanged,owner}:{
 items:BlogCategoryInfo[];onChanged:()=>Promise<void>;owner:boolean
}){
 const [creating,setCreating]=useState<Shape>(empty);
 const [editing,setEditing]=useState<Shape|null>(null);
 const [message,setMessage]=useState('');
 const [busy,setBusy]=useState(false);
 const roots=items.filter(x=>!x.parent_slug).sort((a,b)=>a.position-b.position||a.slug.localeCompare(b.slug));
 const order=[...roots.flatMap(x=>[x,...items.filter(v=>v.parent_slug===x.slug)
    .sort((a,b)=>a.position-b.position||a.slug.localeCompare(b.slug))])];
 const send=async(action:()=>Promise<unknown>)=>{
   setBusy(true);setMessage('');
   try{await action();await onChanged();setMessage('카테고리 변경사항이 CMS에 저장됐어.')}
   catch(e){setMessage(e instanceof Error?e.message:String(e))}
   finally{setBusy(false)}
 };
 const saveNew=()=>{
  const slug=slugify(creating.slug);
  if(slug.length<3||creating.en.trim().length<2||!creating.ko.trim()){
   setMessage('영문 주소 3자 이상, 영어·한국어 이름을 입력해.');return;
  }
  void send(async()=>{
   await request('/api/v1/owner/blog/categories','POST',{
    slug,parent_slug:creating.parent_slug||null,names:editNames(creating),
    position:Number(creating.position)});
   setCreating(empty());
  });
 };
 const patch=async(item:BlogCategoryInfo,change:Record<string,unknown>)=>{
  await send(async()=>{
   await request('/api/v1/owner/blog/categories/'+item.slug,'PATCH',change);
   setEditing(null);
  });
 };
 const changeNew=(key:keyof Shape,v:string)=>setCreating(p=>({...p,[key]:v}));
 const changeEdit=(key:keyof Shape,v:string)=>setEditing(p=>p?{...p,[key]:v}:p);
 const modify=(item:BlogCategoryInfo)=>{
  setEditing({slug:item.slug,en:item.names.en||'',ko:item.names.ko||'',
   ja:item.names.ja||'',zhCN:item.names['zh-CN']||'',
   parent_slug:item.parent_slug||'',position:String(item.position)});
 };
 return <section className={styles.categoryManager} aria-label="블로그 카테고리 설정">
  <header className={styles.categoryManagerHeading}>
   <div><h3>카테고리 관리</h3>
    <p>대분류와 하위 분류 추가 · 이름 수정 · 노출 순서 · 비활성화</p></div>
   <span>{items.filter(x=>x.is_active).length}개 사용 중</span>
  </header>
  {message&&<p className={styles.notification} role="status">{message}</p>}
  <div className={styles.categoryItems}>
   {order.map(item=><div key={item.slug} className={styles.categoryItem}
     data-nested={Boolean(item.parent_slug)} data-inactive={!item.is_active}>
    <div><strong>{item.parent_slug?'↳ ':''}{blogCategoryName(item,'ko')}</strong>
     <small>{blogCategoryName(item,'en')} · /{item.slug}
       {!item.is_active?' · 비활성':''}</small></div>
    {owner&&<div className={styles.actions}>
      <button disabled={busy} onClick={()=>modify(item)}>수정</button>
      <button disabled={busy} onClick={()=>void patch(item,{is_active:!item.is_active})}>
       {item.is_active?'비활성화':'활성화'}</button>
    </div>}
   </div>)}
  </div>
  {!owner?<p className={styles.muted}>
    카테고리 변경은 Owner만 할 수 있어. 편집자는 활성 분류를 선택해 글을 작성할 수 있어.</p>:<>
   <div className={styles.categoryForm}>
    <h4>{editing?'카테고리 수정':'새 카테고리 추가'}</h4>
    <div className={styles.twoCols}>
      <label>영어 카테고리명<input value={editing?.en??creating.en} maxLength={100}
       onChange={e=>editing?changeEdit('en',e.target.value):changeNew('en',e.target.value)}/></label>
      <label>한국어 카테고리명<input value={editing?.ko??creating.ko} maxLength={100}
       onChange={e=>editing?changeEdit('ko',e.target.value):changeNew('ko',e.target.value)}/></label>
      <label>일본어 (선택)<input value={editing?.ja??creating.ja} maxLength={100}
       onChange={e=>editing?changeEdit('ja',e.target.value):changeNew('ja',e.target.value)}/></label>
      <label>중국어 (선택)<input value={editing?.zhCN??creating.zhCN} maxLength={100}
       onChange={e=>editing?changeEdit('zhCN',e.target.value):changeNew('zhCN',e.target.value)}/></label>
      <label>주소 코드 {editing?'(변경 불가)':'(영문·숫자·하이픈)'}
       <input value={editing?.slug??creating.slug} disabled={Boolean(editing)} maxLength={64}
        onChange={e=>changeNew('slug',e.target.value)} placeholder="korean-skincare"/></label>
      <label>소속 대분류<select value={editing?.parent_slug??creating.parent_slug}
       onChange={e=>editing?changeEdit('parent_slug',e.target.value):
         changeNew('parent_slug',e.target.value)}>
       <option value="">최상위 대분류로 추가</option>
       {roots.filter(r=>r.slug!==editing?.slug&&r.is_active).map(r=>
        <option value={r.slug} key={r.slug}>{blogCategoryName(r,'ko')}</option>)}
      </select></label>
      <label>노출 순서 (숫자가 작을수록 먼저)
       <input type="number" min={0} max={10000} value={editing?.position??creating.position}
        onChange={e=>editing?changeEdit('position',e.target.value):
          changeNew('position',e.target.value)}/></label>
    </div>
    <div className={styles.actions}>
      {editing?<><button disabled={busy} className={styles.greenButton}
        onClick={()=>void patch(items.find(i=>i.slug===editing.slug)!,{
           names:editNames(editing),position:Number(editing.position),
           parent_slug:editing.parent_slug||null})}>변경사항 저장</button>
        <button className={styles.smallButton} onClick={()=>setEditing(null)}>수정 취소</button></>:
        <button className={styles.greenButton} disabled={busy} onClick={saveNew}>
         + 새 카테고리 추가</button>}
    </div>
    <p className={styles.muted}>기존 URL을 보호하기 위해 코드(slug)는 생성 후 변경되지 않아.
     삭제 대신 비활성화하며, 하위 분류가 있는 대분류는 하위 분류를 먼저 정리해야 비활성화할 수 있어.</p>
   </div>
  </>}
 </section>;
}
